import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireTeacher } from '@/lib/auth'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { response } = await requireTeacher()
  if (response) return response

  try {
    const formData = await req.formData()
    const frames = formData.getAll('frames') as File[]

    if (frames.length === 0) {
      return NextResponse.json({ error: '프레임이 없습니다' }, { status: 400 })
    }

    const descriptions: string[] = []

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      const buffer = await frame.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '이 화면은 코딩 수업의 한 장면입니다. 화면에 보이는 내용을 텍스트로 정리해주세요. 코드가 있으면 코드 전체를 그대로 추출하고, 슬라이드나 설명 텍스트가 있으면 내용을 그대로 추출해주세요. 빈 화면이거나 의미 없는 내용이면 "빈화면"이라고만 답하세요.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64}`,
                    detail: 'low',
                  },
                },
              ],
            },
          ],
          max_tokens: 600,
        })

        const text = response.choices[0]?.message?.content?.trim() ?? ''
        if (text && text !== '빈화면') {
          descriptions.push(`[장면 ${i + 1}]\n${text}`)
        }
      } catch {
        // 개별 프레임 실패는 건너뜀
      }
    }

    if (descriptions.length === 0) {
      return NextResponse.json({ error: '분석 가능한 내용이 없습니다' }, { status: 400 })
    }

    const content = descriptions.join('\n\n---\n\n')
    return NextResponse.json({ content })
  } catch (err) {
    console.error('[analyze-frames]', err)
    return NextResponse.json({ error: '분석 중 오류가 발생했습니다' }, { status: 500 })
  }
}
