import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java'] as const
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

// Judge0 CE 언어 ID 매핑
const LANGUAGE_ID: Record<SupportedLanguage, number> = {
  python: 71, // Python 3
  javascript: 63, // JavaScript (Node.js)
  java: 62, // Java (OpenJDK)
}

const JUDGE0_URL = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true'

// POST /api/execute - Judge0 CE API로 코드 실행
export async function POST(req: NextRequest) {
  try {
    const { response: authResponse } = await requireAuth()
    if (authResponse) return authResponse

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

    if (code.length > 5000) {
      return NextResponse.json({ error: '코드는 5000자를 초과할 수 없습니다' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃 (Judge0은 컴파일+실행)

    let judge0Response: Response
    try {
      judge0Response = await fetch(JUDGE0_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language_id: LANGUAGE_ID[language as SupportedLanguage],
          source_code: code,
          stdin: '',
        }),
        signal: controller.signal,
      })
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        return NextResponse.json({ error: '코드 실행 시간이 초과됐습니다 (15초)' }, { status: 504 })
      }
      throw e
    } finally {
      clearTimeout(timeout)
    }

    if (!judge0Response.ok) {
      return NextResponse.json({ error: '코드 실행 서버 오류가 발생했습니다' }, { status: 502 })
    }

    const result = await judge0Response.json()

    // Judge0 status: id 3 = Accepted, 5 = Time Limit Exceeded, 6 = Compilation Error, 11+ = Runtime Error
    const statusId = result.status?.id ?? 0
    const stderr =
      statusId === 6
        ? result.compile_output ?? '컴파일 오류가 발생했습니다'
        : result.stderr ?? ''

    return NextResponse.json({
      stdout: result.stdout ?? '',
      stderr,
      code: statusId === 3 ? 0 : 1,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '코드 실행 중 오류가 발생했습니다' }, { status: 500 })
  }
}
