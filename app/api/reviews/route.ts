import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateSM2, getQualityScore } from '@/lib/sm2'
import { requireAuth } from '@/lib/auth'

// GET /api/reviews - 오늘 복습할 문제 조회
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const userId = user.id
    const today = new Date().toISOString().split('T')[0]

    // 오늘 복습 날짜가 된 문제들 조회
    const { data: schedules, error } = await supabaseAdmin
      .from('review_schedule')
      .select(
        `
        *,
        questions (
          id,
          type,
          difficulty,
          question,
          code_template,
          expected_output,
          hint,
          answer,
          explanation
        )
      `
      )
      .eq('student_id', userId)
      .lte('next_review_date', today)
      .order('next_review_date', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      reviews: schedules,
      count: schedules.length,
    })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// POST /api/reviews - 틀린 문제 복습 스케줄 등록/업데이트
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const userId = user.id
    const { question_id, attempt, is_correct } = await req.json()

    // SM-2 quality 점수 계산 (복습 세션은 attempt 1 기준으로 처리)
    const quality = getQualityScore(attempt ?? 1, is_correct)

    // 기존 스케줄 확인
    const { data: existing } = await supabaseAdmin
      .from('review_schedule')
      .select('*')
      .eq('student_id', userId)
      .eq('question_id', question_id)
      .single()

    if (existing) {
      // SM-2로 다음 복습 날짜 계산
      const sm2Result = calculateSM2(
        {
          interval_days: existing.interval_days,
          easiness_factor: existing.easiness_factor,
          repetition_count: existing.repetition_count,
        },
        quality
      )

      const { data, error } = await supabaseAdmin
        .from('review_schedule')
        .update({
          interval_days: sm2Result.interval_days,
          easiness_factor: sm2Result.easiness_factor,
          repetition_count: sm2Result.repetition_count,
          next_review_date: sm2Result.next_review_date,
          wrong_count: is_correct ? existing.wrong_count : existing.wrong_count + 1,
          correct_count: is_correct ? existing.correct_count + 1 : existing.correct_count,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        schedule: data,
        message: is_correct
          ? `잘했어요! 다음 복습은 ${sm2Result.interval_days}일 후예요`
          : `다음 복습은 내일이에요. 조금만 더 힘내요!`,
        next_review_days: sm2Result.interval_days,
      })
    } else {
      // 처음 등록 — 틀렸을 때만 스케줄 추가
      if (is_correct) {
        return NextResponse.json({ message: '정답! 복습 스케줄이 필요없어요' })
      }

      const sm2Result = calculateSM2(
        { interval_days: 1, easiness_factor: 2.5, repetition_count: 0 },
        quality
      )

      const { data, error } = await supabaseAdmin
        .from('review_schedule')
        .insert({
          student_id: userId,
          question_id,
          wrong_count: 1,
          correct_count: 0,
          interval_days: sm2Result.interval_days,
          easiness_factor: sm2Result.easiness_factor,
          repetition_count: sm2Result.repetition_count,
          next_review_date: sm2Result.next_review_date,
        })
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        schedule: data,
        message: '내일 다시 복습해봐요!',
        next_review_days: sm2Result.interval_days,
      })
    }
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
