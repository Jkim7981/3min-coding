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

    return NextResponse.json({
      total_answered: total,
      correct_rate,
      streak,
      this_week,
      by_subject,
    })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
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
