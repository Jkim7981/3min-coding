import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai'
import { requireAuth } from '@/lib/auth'

// POST /api/explanation - 2차 오답 시 자동 해설 생성
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const { question, answer, student_answer } = await req.json()

    if (!question || !answer || !student_answer) {
      return NextResponse.json({ error: '문제, 정답, 학생 답안은 필수입니다' }, { status: 400 })
    }

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
          content: `문제: ${question}\n정답: ${answer}\n학생 답안: ${student_answer}\n\n왜 틀렸는지, 왜 "${answer}"이 정답인지 설명해줘.`,
        },
      ],
      max_tokens: 500,
    })

    const explanation = completion.choices[0].message.content

    return NextResponse.json({ explanation })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '해설 생성 중 오류가 발생했습니다' }, { status: 500 })
  }
}
