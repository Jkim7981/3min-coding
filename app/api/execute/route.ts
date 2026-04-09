import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java'] as const
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

// POST /api/execute - Piston API로 코드 실행
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const { language, code } = await req.json()

    if (!language || !code) {
      return NextResponse.json({ error: 'language와 code는 필수입니다' }, { status: 400 })
    }

    if (!SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
      return NextResponse.json(
        { error: `지원하지 않는 언어입니다. 지원 언어: ${SUPPORTED_LANGUAGES.join(', ')}` },
        { status: 400 }
      )
    }

    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        version: '*',
        files: [{ content: code }],
        stdin: '',
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: '코드 실행 서버 오류가 발생했습니다' }, { status: 502 })
    }

    const result = await response.json()

    return NextResponse.json({
      stdout: result.run?.stdout ?? '',
      stderr: result.run?.stderr ?? '',
      code: result.run?.code,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '코드 실행 중 오류가 발생했습니다' }, { status: 500 })
  }
}
