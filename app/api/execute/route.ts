import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { TestCase } from '@/lib/validateQuestion'

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java'] as const
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const LANGUAGE_ID: Record<SupportedLanguage, number> = {
  python: 71,
  javascript: 63,
  java: 62,
}

const JUDGE0_URL = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true'

// ── 언어별 함수/메서드 이름 추출 ──

function extractPythonFunctionName(code: string): string | null {
  return code.match(/def\s+(\w+)\s*\(/)?.[1] ?? null
}

function extractJsFunctionName(code: string): string | null {
  const m = code.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\())/)
  return m?.[1] ?? m?.[2] ?? null
}

function extractJavaMethodName(code: string): string | null {
  // main을 제외한 첫 번째 static 메서드
  const matches = [...code.matchAll(/public\s+static\s+\w+(?:\[\])*\s+(\w+)\s*\(/g)]
  return matches.find((m) => m[1] !== 'main')?.[1] ?? null
}

// Java 값을 Java 리터럴로 변환
function toJavaLiteral(value: unknown): string {
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : `${value}d`
  if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  if (Array.isArray(value)) {
    if (value.length === 0) return 'new int[]{}'
    if (typeof value[0] === 'number') return `new int[]{${value.join(', ')}}`
    if (typeof value[0] === 'string') return `new String[]{${value.map((v) => `"${v}"`).join(', ')}}`
  }
  return String(value)
}

// ── 언어별 테스트 러너 코드 생성 ──

function buildPythonRunner(code: string, testCases: TestCase[]): string {
  const fnName = extractPythonFunctionName(code)
  if (!fnName) throw new Error('Python 함수 이름을 찾을 수 없습니다')
  const casesJson = JSON.stringify(testCases)
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

function buildJsRunner(code: string, testCases: TestCase[]): string {
  const fnName = extractJsFunctionName(code)
  if (!fnName) throw new Error('JavaScript 함수 이름을 찾을 수 없습니다')
  const casesJson = JSON.stringify(testCases)
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

function buildJavaRunner(code: string, testCases: TestCase[]): string {
  const methodName = extractJavaMethodName(code)
  if (!methodName) throw new Error('Java static 메서드를 찾을 수 없습니다')

  const lines: string[] = [
    '    public static void main(String[] args) {',
    '        java.util.List<String> _out = new java.util.ArrayList<>();',
  ]

  testCases.forEach((tc, i) => {
    const args = (tc.input as unknown[]).map(toJavaLiteral).join(', ')
    const expected = String(tc.expected).replace(/"/g, '\\"')
    lines.push(`        String _r${i} = String.valueOf(${methodName}(${args}));`)
    lines.push(
      `        _out.add("{\\"index\\":${i + 1},\\"result\\":\\"" + _r${i}` +
        ` + "\\",\\"expected\\":\\"${expected}\\",\\"passed\\":" + _r${i}.equals("${expected}") + "}");`
    )
  })

  lines.push('        System.out.println("[" + String.join(",", _out) + "]");')
  lines.push('    }')

  // 클래스 마지막 } 앞에 main 메서드 삽입
  const lastBrace = code.lastIndexOf('}')
  if (lastBrace === -1) throw new Error('Java 클래스 구조를 찾을 수 없습니다')
  return code.slice(0, lastBrace) + '\n' + lines.join('\n') + '\n}'
}

function buildTestRunner(code: string, language: string, testCases: TestCase[]): string {
  if (language === 'python') return buildPythonRunner(code, testCases)
  if (language === 'javascript') return buildJsRunner(code, testCases)
  if (language === 'java') return buildJavaRunner(code, testCases)
  throw new Error(`${language}은 테스트 케이스 모드를 지원하지 않습니다`)
}

// ── Judge0 제출 ──

async function runOnJudge0(code: string, language: SupportedLanguage): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    return await fetch(JUDGE0_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language_id: LANGUAGE_ID[language], source_code: code, stdin: '' }),
      signal: controller.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('TIMEOUT')
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

// ── POST /api/execute ──

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

    const hasTestCases = Array.isArray(test_cases) && test_cases.length > 0

    // ── 테스트 케이스 모드 ──
    if (hasTestCases) {
      let runnerCode: string
      try {
        runnerCode = buildTestRunner(code, language, test_cases as TestCase[])
      } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 400 })
      }

      let res: Response
      try {
        res = await runOnJudge0(runnerCode, language as SupportedLanguage)
      } catch (e) {
        if ((e as Error).message === 'TIMEOUT')
          return NextResponse.json({ error: '코드 실행 시간이 초과됐습니다 (15초)' }, { status: 504 })
        throw e
      }

      if (!res.ok) {
        return NextResponse.json({ error: '코드 실행 서버 오류가 발생했습니다' }, { status: 502 })
      }

      const raw = await res.json()
      const statusId = raw.status?.id ?? 0

      if (statusId === 6) {
        return NextResponse.json({ stdout: '', stderr: raw.compile_output ?? '컴파일 오류', code: 1 })
      }
      if (raw.stderr) {
        return NextResponse.json({ stdout: '', stderr: raw.stderr, code: 1 })
      }

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
    let res: Response
    try {
      res = await runOnJudge0(code, language as SupportedLanguage)
    } catch (e) {
      if ((e as Error).message === 'TIMEOUT')
        return NextResponse.json({ error: '코드 실행 시간이 초과됐습니다 (15초)' }, { status: 504 })
      throw e
    }

    if (!res.ok) {
      return NextResponse.json({ error: '코드 실행 서버 오류가 발생했습니다' }, { status: 502 })
    }

    const result = await res.json()
    const statusId = result.status?.id ?? 0
    const stderr =
      statusId === 6
        ? result.compile_output ?? '컴파일 오류가 발생했습니다'
        : result.stderr ?? ''

    return NextResponse.json({ stdout: result.stdout ?? '', stderr, code: statusId === 3 ? 0 : 1 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '코드 실행 중 오류가 발생했습니다' }, { status: 500 })
  }
}
