import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateSM2, getQualityScore } from '@/lib/sm2'
import { requireAuth } from '@/lib/auth'
import { normalizeAnswer } from '@/lib/normalize'

// GET /api/reviews - 오늘 복습할 문제 조회
export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const userId = user.id
    const today = new Date().toISOString().split('T')[0]

    const { data: schedules, error: scheduleError } = await supabaseAdmin
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

    if (scheduleError) throw scheduleError

    return NextResponse.json({
      reviews: schedules,
      count: schedules.length,
    })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// POST /api/reviews - 복습 답안 제출 및 스케줄 업데이트
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const userId = user.id
    const { question_id, attempt, student_answer } = await req.json()

    if (!question_id || !student_answer) {
      return NextResponse.json({ error: 'question_id와 student_answer는 필수입니다' }, { status: 400 })
    }

    // 서버에서 정답 조회 및 is_correct 직접 계산 (클라이언트 신뢰 X)
    const { data: question, error: qError } = await supabaseAdmin
      .from('questions')
      .select('answer, type')
      .eq('id', question_id)
      .single()

    if (qError || !question) {
      return NextResponse.json({ error: '문제를 찾을 수 없습니다' }, { status: 404 })
    }

    const is_correct =
      normalizeAnswer(student_answer, question.type) ===
      normalizeAnswer(question.answer, question.type)

    const quality = getQualityScore(attempt ?? 1, is_correct)

    // 기존 스케줄 확인
    const { data: existing } = await supabaseAdmin
      .from('review_schedule')
      .select('*')
      .eq('student_id', userId)
      .eq('question_id', question_id)
      .single()

    if (existing) {
      const sm2Result = calculateSM2(
        {
          interval_days: existing.interval_days,
          easiness_factor: existing.easiness_factor,
          repetition_count: existing.repetition_count,
        },
        quality
      )

      const { data, error: updateError } = await supabaseAdmin
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

      if (updateError) throw updateError

      return NextResponse.json({
        is_correct,
        schedule: data,
        message: is_correct
          ? `잘했어요! 다음 복습은 ${sm2Result.interval_days}일 후예요`
          : `다음 복습은 내일이에요. 조금만 더 힘내요!`,
        next_review_days: sm2Result.interval_days,
      })
    } else {
      if (is_correct) {
        return NextResponse.json({ is_correct: true, message: '정답! 복습 스케줄이 필요없어요' })
      }

      const sm2Result = calculateSM2(
        { interval_days: 1, easiness_factor: 2.5, repetition_count: 0 },
        quality
      )

      const { data, error: insertError } = await supabaseAdmin
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

      if (insertError) throw insertError

      return NextResponse.json({
        is_correct: false,
        schedule: data,
        message: '내일 다시 복습해봐요!',
        next_review_days: sm2Result.interval_days,
      })
    }
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
