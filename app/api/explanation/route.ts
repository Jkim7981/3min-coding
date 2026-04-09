import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// POST /api/explanation - 2차 오답 시 자동 해설 생성
export async function POST(req: NextRequest) {
  try {
    const { question, answer, student_answer } = await req.json()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
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
    })

    const explanation = completion.choices[0].message.content

    return NextResponse.json({ explanation })
  } catch (error) {
    return NextResponse.json({ error: '해설 생성 중 오류가 발생했습니다' }, { status: 500 })
  }
}
