import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import openai from '@/lib/openai'
import { requireAuth } from '@/lib/auth'

// 저장된 해설이 충분한지 판단 (30자 이상이면 충분하다고 봄)
const MIN_EXPLANATION_LENGTH = 30

// POST /api/explanation - 2차 오답 시 자동 해설 생성
export async function POST(req: NextRequest) {
  try {
    const { response } = await requireAuth()
    if (response) return response

    const { question_id, student_answer } = await req.json()

    if (!question_id || !student_answer) {
      return NextResponse.json({ error: 'question_id와 student_answer는 필수입니다' }, { status: 400 })
    }

    // explanation 포함해서 조회
    const { data: question, error: qError } = await supabaseAdmin
      .from('questions')
      .select('question, answer, explanation')
      .eq('id', question_id)
      .single()

    if (qError || !question) {
      return NextResponse.json({ error: '문제를 찾을 수 없습니다' }, { status: 404 })
    }

    // 저장된 해설이 충분하면 AI 호출 없이 바로 반환
    if (question.explanation && question.explanation.length >= MIN_EXPLANATION_LENGTH) {
      return NextResponse.json({ source: 'stored', explanation: question.explanation })
    }

    // 해설이 없거나 너무 짧으면 AI로 보강
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            '너는 친절한 코딩 튜터야. 학생이 문제를 틀렸을 때 해설을 제공해. 한국어로, 쉽고 간결하게 설명해.',
        },
        {
          role: 'user',
          content: `문제: ${question.question}\n정답: ${question.answer}\n학생 답안: ${student_answer}\n\n왜 틀렸는지, 왜 "${question.answer}"이 정답인지 설명해줘.`,
        },
      ],
      max_tokens: 500,
    })

    const enhanced =
      completion.choices[0]?.message?.content ?? '해설을 생성하지 못했습니다. 다시 시도해주세요.'

    // explanation이 없을 때만 DB에 캐시 저장 (기존 강사 작성 해설 덮어쓰기 방지)
    if (!question.explanation) {
      await supabaseAdmin.from('questions').update({ explanation: enhanced }).eq('id', question_id)
    }

    return NextResponse.json({ source: 'enhanced', explanation: enhanced })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '해설 생성 중 오류가 발생했습니다' }, { status: 500 })
  }
}
