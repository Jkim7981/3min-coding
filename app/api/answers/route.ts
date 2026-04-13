import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateSM2, getQualityScore } from '@/lib/sm2'
import { requireAuth } from '@/lib/auth'
import { normalizeAnswer } from '@/lib/normalize'
import openai from '@/lib/openai'

// GET /api/answers?question_id=XXX — 학생 본인의 이전 답안 조회 (bug1: 복습 모드용)
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const { searchParams } = new URL(req.url)
    const question_id = searchParams.get('question_id')

    if (!question_id) {
      return NextResponse.json({ error: 'question_id가 필요합니다' }, { status: 400 })
    }

    const { data: answers, error } = await supabaseAdmin
      .from('user_answers')
      .select('attempt, is_correct, answer')
      .eq('student_id', user.id)
      .eq('question_id', question_id)
      .order('attempt', { ascending: true })

    if (error) throw error

    if (!answers || answers.length === 0) {
      return NextResponse.json({ answered: false })
    }

    const isCorrect = answers.some((a) => a.is_correct)
    const totalAttempts = answers.length
    // 완전히 끝난 상태: 정답 맞았거나 2번 다 틀림
    const isDone = isCorrect || totalAttempts >= 2

    let correct_answer: string | null = null
    if (isDone && !isCorrect) {
      // 2번 다 틀린 경우 → 정답 공개 (이미 기회 소진)
      const { data: q } = await supabaseAdmin
        .from('questions')
        .select('answer')
        .eq('id', question_id)
        .single()
      correct_answer = q?.answer ?? null
    }

    return NextResponse.json({
      answered: true,
      attempts: totalAttempts,
      is_correct: isCorrect,
      is_done: isDone,
      first_attempt_answer: answers[0].answer,
      student_answer: answers[answers.length - 1].answer,
      correct_answer,
    })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// 의미 비교 — 정규화 후에도 다를 때 OpenAI로 최종 판단
// 개념 문제: 표현이 달라도 같은 뜻이면 정답
// 코딩 문제: 다른 문법/방식이라도 같은 동작이면 정답 (format() vs f-string 등)
async function isSameMeaning(
  studentAnswer: string,
  correctAnswer: string,
  questionType: 'concept' | 'coding' = 'concept'
): Promise<boolean> {
  try {
    const systemPrompt =
      questionType === 'coding'
        ? '너는 코딩 교육 채점 도우미야. 학생 코드와 모범 코드가 같은 동작을 하는지 판단해. ' +
          '문법이나 방식이 달라도(f-string vs format() 등) 결과가 동일하면 true, 다르면 false만 반환해. 다른 말은 하지 마.'
        : '너는 코딩 교육 채점 도우미야. 학생 답안과 모범 답안이 같은 의미인지 판단해. ' +
          '표현이 달라도 의미가 같으면 true, 다르면 false만 반환해. 다른 말은 하지 마.'

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `모범 답안: "${correctAnswer}"\n학생 답안: "${studentAnswer}"`,
        },
      ],
      max_tokens: 5,
      temperature: 0,
    })
    const result = completion.choices[0]?.message?.content?.trim().toLowerCase()
    return result === 'true'
  } catch {
    // OpenAI 오류 시 정규화 결과(오답)를 그대로 사용
    return false
  }
}

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

    // 오늘(KST) 기준 시도 횟수 계산
    // 복습 문제는 며칠 후 다시 풀 수 있어야 하므로 당일 시도만 카운트
    const kstTodayStart = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10) + 'T00:00:00+09:00'
    const { count: prevCount, error: countError } = await supabaseAdmin
      .from('user_answers')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', userId)
      .eq('question_id', question_id)
      .gte('answered_at', kstTodayStart)

    if (countError) throw countError

    const attempt = (prevCount ?? 0) + 1

    // 오늘 이미 2번 시도한 문제는 더 이상 제출 불가
    if (attempt > 2) {
      return NextResponse.json({ error: '오늘 이미 2번 시도한 문제입니다' }, { status: 400 })
    }

    // 오늘 이미 정답을 맞힌 문제는 재제출 불가
    const { data: alreadyCorrectToday } = await supabaseAdmin
      .from('user_answers')
      .select('id')
      .eq('student_id', userId)
      .eq('question_id', question_id)
      .eq('is_correct', true)
      .gte('answered_at', kstTodayStart)
      .single()

    if (alreadyCorrectToday) {
      return NextResponse.json({ error: '오늘 이미 정답을 맞힌 문제입니다' }, { status: 400 })
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

    // 1차: 정규화 비교 (빠름, 무료)
    let is_correct =
      normalizeAnswer(answer, question.type) === normalizeAnswer(question.answer, question.type)

    // 2차: 정규화로 오답 처리됐을 때 → OpenAI 의미 비교 (폴백)
    // 코딩 문제: format() vs f-string 등 표현 방식이 달라도 의미상 동일한 경우 처리
    // 개념 문제: 표현이 달라도 같은 뜻인 경우 처리
    if (!is_correct) {
      is_correct = await isSameMeaning(answer, question.answer, question.type)
    }

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
