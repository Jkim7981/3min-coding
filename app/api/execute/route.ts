import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { TestCase } from '@/lib/validateQuestion'

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java'] as const
const TEST_RUNNER_LANGUAGES = ['python', 'javascript'] as const
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const LANGUAGE_ID: Record<SupportedLanguage, number> = {
  python: 71,
  javascript: 63,
  java: 62,
}

const JUDGE0_URL = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true'

// 완성된 코드에서 함수 이름 추출
function extractFunctionName(code: string, language: string): string | null {
  if (language === 'python') {
    const match = code.match(/def\s+(\w+)\s*\(/)
    return match?.[1] ?? null
  }
  if (language === 'javascript') {
    const match = code.match(
      /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\())/
    )
    return match?.[1] ?? match?.[2] ?? null
  }
  return null
}

// 테스트 러너 코드 생성 (학생 코드 뒤에 붙임)
function buildTestRunner(code: string, language: string, testCases: TestCase[]): string {
  const fnName = extractFunctionName(code, language)
  if (!fnName) throw new Error('함수 이름을 찾을 수 없습니다')

  const casesJson = JSON.stringify(testCases)

  if (language === 'python') {
    return `${code}

import json as _json
_cases = ${casesJson}
_out = []
for _i, _tc in enumerate(_cases):
    try:
        _r = ${fnName}(*_tc["input"])
        _p = str(_r) == str(_tc["expected"])
        _out.append({"index":_i+1,"result":str(_r),"expected":str(_tc["expected"]),"passed":_p})
    except Exception as _e:
        _out.append({"index":_i+1,"result":str(_e),"expected":str(_tc["expected"]),"passed":False,"error":True})
print(_json.dumps(_out))`
  }

  if (language === 'javascript') {
    return `${code}

const _cases = ${casesJson};
const _out = [];
_cases.forEach((_tc, _i) => {
  try {
    const _r = ${fnName}(..._tc.input);
    const _p = String(_r) === String(_tc.expected);
    _out.push({index:_i+1,result:String(_r),expected:String(_tc.expected),passed:_p});
  } catch(_e) {
    _out.push({index:_i+1,result:String(_e),expected:String(_tc.expected),passed:false,error:true});
  }
});
console.log(JSON.stringify(_out));`
  }

  throw new Error(`${language}은 테스트 케이스 모드를 지원하지 않습니다`)
}

// Judge0에 코드 제출하고 결과 받기
async function runOnJudge0(code: string, language: SupportedLanguage): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    return await fetch(JUDGE0_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language_id: LANGUAGE_ID[language],
        source_code: code,
        stdin: '',
      }),
      signal: controller.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('TIMEOUT')
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

// POST /api/execute
export async function POST(req: NextRequest) {
  try {
    const { response: authResponse } = await requireAuth()
    if (authResponse) return authResponse

    const { language, code, test_cases } = await req.json()

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

    // ── 테스트 케이스 모드 (Python / JS) ──
    const hasTestCases =
      Array.isArray(test_cases) &&
      test_cases.length > 0 &&
      TEST_RUNNER_LANGUAGES.includes(language as (typeof TEST_RUNNER_LANGUAGES)[number])

    if (hasTestCases) {
      let runnerCode: string
      try {
        runnerCode = buildTestRunner(code, language, test_cases as TestCase[])
      } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 400 })
      }

      let judge0Res: Response
      try {
        judge0Res = await runOnJudge0(runnerCode, language as SupportedLanguage)
      } catch (e) {
        if ((e as Error).message === 'TIMEOUT') {
          return NextResponse.json({ error: '코드 실행 시간이 초과됐습니다 (15초)' }, { status: 504 })
        }
        throw e
      }

      if (!judge0Res.ok) {
        return NextResponse.json({ error: '코드 실행 서버 오류가 발생했습니다' }, { status: 502 })
      }

      const raw = await judge0Res.json()
      const statusId = raw.status?.id ?? 0

      if (statusId === 6) {
        return NextResponse.json({
          stdout: '',
          stderr: raw.compile_output ?? '컴파일 오류가 발생했습니다',
          code: 1,
        })
      }

      if (raw.stderr) {
        return NextResponse.json({ stdout: '', stderr: raw.stderr, code: 1 })
      }

      // 테스트 러너 출력(JSON) 파싱
      let testResults: unknown[]
      try {
        testResults = JSON.parse(raw.stdout ?? '[]')
      } catch {
        return NextResponse.json({ stdout: raw.stdout ?? '', stderr: '', code: 0 })
      }

      const allPassed = (testResults as { passed: boolean }[]).every((r) => r.passed)
      return NextResponse.json({
        stdout: raw.stdout ?? '',
        stderr: '',
        code: allPassed ? 0 : 1,
        test_results: testResults,
        all_passed: allPassed,
      })
    }

    // ── 일반 실행 모드 ──
    let judge0Res: Response
    try {
      judge0Res = await runOnJudge0(code, language as SupportedLanguage)
    } catch (e) {
      if ((e as Error).message === 'TIMEOUT') {
        return NextResponse.json({ error: '코드 실행 시간이 초과됐습니다 (15초)' }, { status: 504 })
      }
      throw e
    }

    if (!judge0Res.ok) {
      return NextResponse.json({ error: '코드 실행 서버 오류가 발생했습니다' }, { status: 502 })
    }

    const result = await judge0Res.json()
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
