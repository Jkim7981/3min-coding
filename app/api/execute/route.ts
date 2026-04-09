import { NextRequest, NextResponse } from 'next/server'

// POST /api/execute - Piston API로 코드 실행
export async function POST(req: NextRequest) {
  try {
    const { language, code } = await req.json()

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

    const result = await response.json()

    return NextResponse.json({
      stdout: result.run?.stdout || '',
      stderr: result.run?.stderr || '',
      code: result.run?.code,
    })
  } catch (error) {
    return NextResponse.json({ error: '코드 실행 중 오류가 발생했습니다' }, { status: 500 })
  }
}
