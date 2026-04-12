import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateSM2, getQualityScore } from '@/lib/sm2'
import { requireAuth } from '@/lib/auth'
import { normalizeAnswer } from '@/lib/normalize'

// POST /api/answers - 답안 제출
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    // [C 추가 — B 영역] used_hint 수신 추가.
    // 힌트 버튼 클릭 여부를 DB에 기록하기 위해 클라이언트에서 전달받음.
    // 기존 question_id, answer 외에 used_hint(boolean) 추가로 받음.
    const { question_id, answer, used_hint = false } = await req.json()
    const userId = user.id

    // 서버에서 시도 횟수 직접 계산 (클라이언트 값 신뢰 X)
    const { count: prevCount, error: countError } = await supabaseAdmin
      .from('user_answers')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', userId)
      .eq('question_id', question_id)

    if (countError) throw countError

    const attempt = (prevCount ?? 0) + 1

    // 이미 2번 시도한 문제는 더 이상 제출 불가
    if (attempt > 2) {
      return NextResponse.json({ error: '이미 2번 시도한 문제입니다' }, { status: 400 })
    }

    // 이미 정답을 맞힌 문제는 재제출 불가 (통계/복습 오염 방지)
    const { data: alreadyCorrect } = await supabaseAdmin
      .from('user_answers')
      .select('id')
      .eq('student_id', userId)
      .eq('question_id', question_id)
      .eq('is_correct', true)
      .single()

    if (alreadyCorrect) {
      return NextResponse.json({ error: '이미 정답을 맞힌 문제입니다' }, { status: 400 })
    }

    // 정답 + subject_id 서버에서 직접 조회 (클라이언트 값 신뢰 X)
    const { data: question, error: qError } = await supabaseAdmin
      .from('questions')
      .select('answer, type, lessons(subject_id)')
      .eq('id', question_id)
      .single()

    if (qError || !question) {
      return NextResponse.json({ error: '문제를 찾을 수 없습니다' }, { status: 404 })
    }

    const lessonsData = question.lessons as unknown as
      | { subject_id: string }
      | { subject_id: string }[]
      | null
    const subject_id = Array.isArray(lessonsData)
      ? (lessonsData[0]?.subject_id ?? null)
      : (lessonsData?.subject_id ?? null)

    const is_correct =
      normalizeAnswer(answer, question.type) === normalizeAnswer(question.answer, question.type)

    // 답안 저장
    // [C 추가 — B 영역] used_hint 필드 insert에 포함.
    // 기존 insert에 used_hint 추가. 기본값 false이므로 기존 동작 유지됨.
    const { error: answerError } = await supabaseAdmin.from('user_answers').insert({
      student_id: userId,
      question_id,
      subject_id,
      attempt,
      answer,
      is_correct,
      used_hint,
    })

    if (answerError) throw answerError

    // 2차 시도 완료 시 SM-2 알고리즘으로 복습 스케줄 업데이트
    let reviewScheduled = false
    let sm2Result = null

    if (attempt === 2 || (attempt === 1 && is_correct)) {
      const quality = getQualityScore(attempt, is_correct)

      // 기존 스케줄 확인
      const { data: existing } = await supabaseAdmin
        .from('review_schedule')
        .select('*')
        .eq('student_id', userId)
        .eq('question_id', question_id)
        .single()

      if (existing) {
        // SM-2로 다음 복습 날짜 계산
        sm2Result = calculateSM2(
          {
            interval_days: existing.interval_days,
            easiness_factor: existing.easiness_factor,
            repetition_count: existing.repetition_count,
          },
          quality
        )

        await supabaseAdmin
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

        reviewScheduled = true
      } else if (!is_correct) {
        // 처음 틀린 문제 스케줄 등록
        sm2Result = calculateSM2(
          { interval_days: 1, easiness_factor: 2.5, repetition_count: 0 },
          quality
        )

        await supabaseAdmin.from('review_schedule').insert({
          student_id: userId,
          question_id,
          wrong_count: 1,
          correct_count: 0,
          interval_days: sm2Result.interval_days,
          easiness_factor: sm2Result.easiness_factor,
          repetition_count: sm2Result.repetition_count,
          next_review_date: sm2Result.next_review_date,
        })

        reviewScheduled = true
      }
    }

    return NextResponse.json({
      is_correct,
      correct_answer: attempt === 2 && !is_correct ? question.answer : null,
      review_scheduled: reviewScheduled,
      next_review_days: sm2Result?.interval_days ?? null,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
