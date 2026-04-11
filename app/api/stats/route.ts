import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

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
      .select('is_correct, answered_at, subject_id')
      .eq('student_id', user.id)

    if (subject_id) {
      query = query.eq('subject_id', subject_id)
    }

    const { data: answers, error: aError } = await query.order('answered_at', { ascending: false })

    if (aError) throw aError

    const total = answers?.length ?? 0
    const correct = answers?.filter((a) => a.is_correct).length ?? 0
    const correct_rate = total > 0 ? Math.round((correct / total) * 100) / 100 : 0

    // 이번 주 푼 문제 수 (월요일 기준, KST)
    const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const mondayKST = new Date(nowKST)
    mondayKST.setUTCDate(nowKST.getUTCDate() - ((nowKST.getUTCDay() + 6) % 7))
    mondayKST.setUTCHours(0, 0, 0, 0)
    // monday 기준을 UTC로 역산 (비교는 원본 UTC 타임스탬프 기준)
    const mondayUTC = new Date(mondayKST.getTime() - 9 * 60 * 60 * 1000)
    const this_week = answers?.filter((a) => new Date(a.answered_at) >= mondayUTC).length ?? 0

    // 학습 스트릭 계산 (연속 학습 일수, KST)
    const streak = calcStreak(answers?.map((a) => a.answered_at) ?? [])

    // 과목별 정답률 (subject_id 미지정 시)
    let by_subject: { subject_id: string; total: number; correct_rate: number }[] = []
    if (!subject_id && answers && answers.length > 0) {
      const subjectMap = new Map<string, { total: number; correct: number }>()

      for (const a of answers) {
        if (!a.subject_id) continue
        const cur = subjectMap.get(a.subject_id) ?? { total: 0, correct: 0 }
        cur.total += 1
        if (a.is_correct) cur.correct += 1
        subjectMap.set(a.subject_id, cur)
      }

      by_subject = Array.from(subjectMap.entries()).map(([sid, val]) => ({
        subject_id: sid,
        total: val.total,
        correct_rate: Math.round((val.correct / val.total) * 100) / 100,
      }))
    }

    // 오늘 복습할 문제 수
    const todayKST = toKSTDate(new Date().toISOString())
    let reviewQuery = supabaseAdmin
      .from('review_schedule')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .lte('next_review_date', todayKST)

    if (subject_id) {
      // review_schedule에 subject_id 없으므로 question → lesson → subject 경로 불필요,
      // 전체 due_reviews 반환 (과목 필터 시에도 전체 복습 수 표시)
    }

    const { count: due_reviews } = await reviewQuery

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
