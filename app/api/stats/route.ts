import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

type QuestionLessonRelation =
  | { subject_id: string }
  | { subject_id: string }[]
  | null

// GET /api/stats?subject_id=xxx - 학생 학습 통계 조회
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const { searchParams } = new URL(req.url)
    const subject_id = searchParams.get('subject_id')

    // 전체 답안 조회 (과목 필터 선택)
    let query = supabaseAdmin
      .from('user_answers')
      .select('question_id, is_correct, answered_at, subject_id')
      .eq('student_id', user.id)

    if (subject_id) {
      query = query.eq('subject_id', subject_id)
    }

    const { data: answers, error: aError } = await query.order('answered_at', { ascending: false })

    if (aError) throw aError

    const allAnswers = answers ?? []

    // 같은 문제를 여러 번 시도해도 1문제로 카운트 (question_id 기준 중복 제거)
    // 정답: 한 번이라도 맞힌 문제 수 / 전체 고유 문제 수
    const questionMap = new Map<string, { is_correct: boolean; answered_at: string; subject_id: string | null }>()
    for (const a of allAnswers) {
      const existing = questionMap.get(a.question_id)
      if (!existing) {
        questionMap.set(a.question_id, { is_correct: a.is_correct, answered_at: a.answered_at, subject_id: a.subject_id })
      } else {
        if (a.is_correct) existing.is_correct = true
        // 가장 최근 시도 날짜 유지 (스트릭/이번주 집계용)
        if (new Date(a.answered_at) > new Date(existing.answered_at)) {
          existing.answered_at = a.answered_at
        }
      }
    }

    const uniqueAnswers = Array.from(questionMap.values())
    const total = uniqueAnswers.length
    const correct = uniqueAnswers.filter((a) => a.is_correct).length
    const correct_rate = total > 0 ? Math.round((correct / total) * 100) / 100 : 0

    // 이번 주 푼 문제 수 (월요일 기준, KST) — 고유 문제 수 기준
    const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const mondayKST = new Date(nowKST)
    mondayKST.setUTCDate(nowKST.getUTCDate() - ((nowKST.getUTCDay() + 6) % 7))
    mondayKST.setUTCHours(0, 0, 0, 0)
    const mondayUTC = new Date(mondayKST.getTime() - 9 * 60 * 60 * 1000)

    // 이번 주에 시도한 question_id (중복 제거) — 원본 allAnswers 기준으로 집계
    const thisWeekQIds = new Set(
      allAnswers.filter((a) => new Date(a.answered_at) >= mondayUTC).map((a) => a.question_id)
    )
    const this_week = thisWeekQIds.size

    // 학습 스트릭 계산 (연속 학습 일수, KST)
    const streak = calcStreak(allAnswers.map((a) => a.answered_at))

    // 과목별 정답률 (subject_id 미지정 시)
    let by_subject: { subject_id: string; total: number; correct_rate: number }[] = []
    if (!subject_id && allAnswers.length > 0) {
      // 과목별로 고유 문제 수 / 정답 문제 수 집계
      const subjectMap = new Map<string, { questions: Set<string>; correct: Set<string> }>()

      for (const a of allAnswers) {
        if (!a.subject_id) continue
        if (!subjectMap.has(a.subject_id)) {
          subjectMap.set(a.subject_id, { questions: new Set(), correct: new Set() })
        }
        const cur = subjectMap.get(a.subject_id)!
        cur.questions.add(a.question_id)
        if (a.is_correct) cur.correct.add(a.question_id)
      }

      by_subject = Array.from(subjectMap.entries()).map(([sid, val]) => ({
        subject_id: sid,
        total: val.questions.size,
        correct_rate: Math.round((val.correct.size / val.questions.size) * 100) / 100,
      }))
    }

    // 오늘 복습할 문제 수
    const todayKST = toKSTDate(new Date().toISOString())
    const { data: dueReviewRows, error: reviewError } = await supabaseAdmin
      .from('review_schedule')
      .select('question_id')
      .eq('student_id', user.id)
      .lte('next_review_date', todayKST)

    if (reviewError) throw reviewError

    const dueQuestionIds = [...new Set((dueReviewRows ?? []).map((row) => row.question_id))]
    let due_reviews = dueQuestionIds.length

    if (subject_id && dueQuestionIds.length > 0) {
      const { data: dueQuestions, error: dueQuestionsError } = await supabaseAdmin
        .from('questions')
        .select('id, lessons(subject_id)')
        .in('id', dueQuestionIds)

      if (dueQuestionsError) throw dueQuestionsError

      due_reviews = (dueQuestions ?? []).filter((question) => {
        const lessonsData = question.lessons as QuestionLessonRelation
        const reviewSubjectId = Array.isArray(lessonsData)
          ? (lessonsData[0]?.subject_id ?? null)
          : (lessonsData?.subject_id ?? null)

        return reviewSubjectId === subject_id
      }).length
    }

    // 최근 7일 일별 정답률 트렌드 (KST 기준)
    const recent_accuracy_trend = calcTrend(answers ?? [], 7)

    // 최근 7일 약한 개념 Top 3
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    let weakQuery = supabaseAdmin
      .from('user_answers')
      .select('questions(concept_tags)')
      .eq('student_id', user.id)
      .eq('is_correct', false)
      .gte('answered_at', sevenDaysAgo)

    if (subject_id) {
      weakQuery = weakQuery.eq('subject_id', subject_id)
    }

    const { data: wrongAnswers } = await weakQuery
    const tagCount = new Map<string, number>()
    for (const row of wrongAnswers ?? []) {
      const tags = (row.questions as unknown as { concept_tags: string[] } | null)?.concept_tags ?? []
      for (const tag of tags) {
        tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1)
      }
    }
    const weak_concepts = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([concept, count]) => ({ concept, count }))

    return NextResponse.json({
      total_answered: total,
      correct_rate,
      streak,
      this_week,
      due_reviews: due_reviews ?? 0,
      weak_concepts,
      recent_accuracy_trend,
      by_subject,
    })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// 최근 N일 일별 정답률 트렌드
function calcTrend(
  answers: { is_correct: boolean; answered_at: string }[],
  days: number
): { date: string; correct_rate: number; count: number }[] {
  const trend: { date: string; correct_rate: number; count: number }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const date = toKSTDate(new Date(Date.now() - i * 86400000).toISOString())
    const dayAnswers = answers.filter((a) => toKSTDate(a.answered_at) === date)
    const count = dayAnswers.length
    const correct = dayAnswers.filter((a) => a.is_correct).length
    trend.push({
      date,
      correct_rate: count > 0 ? Math.round((correct / count) * 100) / 100 : 0,
      count,
    })
  }

  return trend
}

// UTC 타임스탬프 → KST 날짜 문자열 (YYYY-MM-DD)
function toKSTDate(timestamp: string): string {
  return new Date(new Date(timestamp).getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

// 연속 학습 일수 계산 (KST 기준)
function calcStreak(timestamps: string[]): number {
  if (timestamps.length === 0) return 0

  // KST 날짜만 추출 후 중복 제거, 최신순 정렬
  const dates = [
    ...new Set(timestamps.map((t) => toKSTDate(t))),
  ].sort((a, b) => b.localeCompare(a))

  const today = toKSTDate(new Date().toISOString())
  const yesterday = toKSTDate(new Date(Date.now() - 86400000).toISOString())

  // 오늘 또는 어제 학습 안 했으면 스트릭 0
  if (dates[0] !== today && dates[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const cur = new Date(dates[i])
    const diff = (prev.getTime() - cur.getTime()) / 86400000

    if (diff === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}
