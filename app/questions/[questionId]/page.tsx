'use client'

import { use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface TestCase {
  input: unknown[]
  expected: unknown
}

interface TestResult {
  index: number
  result: string
  expected: string
  passed: boolean
  error?: boolean
}

interface Question {
  id: string
  type: 'concept' | 'coding'
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  code_template?: string
  expected_output?: string
  test_cases?: TestCase[]
  hint?: string
  concept_tags?: string[]
}

interface ExecResult {
  stdout: string
  stderr: string
  code: number
  test_results?: TestResult[]
  all_passed?: boolean
}

type Phase = 'answering' | 'first_wrong' | 'correct' | 'final_wrong'

// [B 수정] 언어 감지 로직 개선.
// 기존: concept_tags의 영어 키워드만 체크했는데, AI가 태그를 한국어("자바", "파이썬")로
// 생성하면 매칭이 안 돼서 항상 'python'으로 폴백 → 자바 코드를 python으로 Piston에 보내
// "코드 실행 서버 오류" 발생.
// 수정: code_template 코드 패턴으로 먼저 감지하고, 태그는 한/영 모두 체크하는 폴백으로.
function detectLanguage(code?: string, tags?: string[]): 'python' | 'javascript' | 'java' {
  if (code) {
    if (code.includes('public class') || code.includes('import java.') || code.includes('System.out')) return 'java'
    if (code.includes('console.log') || code.includes('function ') || code.includes('const ') || code.includes('let ')) return 'javascript'
    if (code.includes('def ') || code.includes('print(')) return 'python'
  }
  if (tags) {
    const str = tags.join(' ').toLowerCase()
    if ((str.includes('java') && !str.includes('javascript')) || str.includes('자바')) return 'java'
    if (str.includes('javascript') || str.includes('js') || str.includes('자바스크립트')) return 'javascript'
    if (str.includes('python') || str.includes('파이썬')) return 'python'
  }
  return 'python'
}

export default function QuestionPage({
  params,
}: {
  params: Promise<{ questionId: string }>
}) {
  const { questionId } = use(params)
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId') ?? ''
  const subjectId = searchParams.get('subjectId') ?? ''
  const router = useRouter()

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 개념 문제 답안
  const [answer, setAnswer] = useState('')
  // 코딩 문제 빈칸 답안 (빈칸 수만큼 배열)
  const [blankAnswers, setBlankAnswers] = useState<string[]>([])
  // 코드 실행 결과
  const [execResult, setExecResult] = useState<ExecResult | null>(null)
  const [executing, setExecuting] = useState(false)

  // 2단계 오답 플로우
  const [phase, setPhase] = useState<Phase>('answering')
  const [showHint, setShowHint] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [firstAttemptAnswer, setFirstAttemptAnswer] = useState('')

  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/sessions/${sessionId}/questions`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setQuestions(data)
        else setError(data.error ?? '오류가 발생했습니다')
      })
      .catch(() => setError('네트워크 오류'))
      .finally(() => setLoading(false))
  }, [sessionId])

  const question = questions.find((q) => q.id === questionId)
  const currentIndex = questions.findIndex((q) => q.id === questionId)
  const nextQuestion = questions[currentIndex + 1]
  const prevQuestion = questions[currentIndex - 1]

  // 빈칸 개수에 맞게 배열 초기화
  useEffect(() => {
    if (question?.type === 'coding' && question.code_template) {
      const count = (question.code_template.match(/___/g) || []).length
      setBlankAnswers(Array(count).fill(''))
      setExecResult(null)
    }
  }, [question])

  const codingParts = question?.code_template?.split('___') ?? []
  const language = detectLanguage(question?.code_template, question?.concept_tags)

  const buildCompletedCode = () => {
    if (!question?.code_template) return ''
    return question.code_template
      .split('___')
      .reduce((acc, part, i) => acc + part + (blankAnswers[i] ?? ''), '')
  }

  const getCurrentAnswer = () => {
    if (question?.type === 'coding') {
      return blankAnswers.length === 1 ? blankAnswers[0] : blankAnswers.join(', ')
    }
    return answer
  }

  const handleExecute = async () => {
    if (executing || !question) return
    setExecuting(true)
    setExecResult(null)
    try {
      const body: { language: string; code: string; test_cases?: TestCase[] } = {
        language,
        code: buildCompletedCode(),
      }
      if (question.test_cases && question.test_cases.length > 0) {
        body.test_cases = question.test_cases
      }
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      // [B 수정] res.ok 체크 추가.
      // 기존: API가 에러(401/400/500 등)를 반환해도 data를 그대로 setExecResult에 넣어서
      // stdout/stderr가 undefined → 화면에 "(출력 없음)"만 뜨고 실제 에러 원인을 알 수 없었음.
      // 수정: res.ok가 false면 에러 메시지를 stderr로 매핑해서 화면에 표시.
      if (!res.ok) {
        setExecResult({ stdout: '', stderr: data.error ?? '코드 실행에 실패했습니다', code: 1 })
        return
      }
      setExecResult(data)
    } catch {
      setExecResult({ stdout: '', stderr: '실행 오류가 발생했습니다', code: 1 })
    } finally {
      setExecuting(false)
    }
  }

  const handleSubmit = async () => {
    const currentAnswer = getCurrentAnswer()
    if (!currentAnswer.trim() || submitting || !question) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.id, answer: currentAnswer.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? '제출에 실패했습니다')
        return
      }

      if (data.is_correct) {
        setPhase('correct')
      } else if (phase === 'answering') {
        setFirstAttemptAnswer(currentAnswer)
        if (question.type === 'concept') setAnswer('')
        setPhase('first_wrong')
      } else {
        setCorrectAnswer(data.correct_answer ?? '')
        setPhase('final_wrong')
        fetchExplanation(currentAnswer)
      }
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  const fetchExplanation = async (studentAnswer: string) => {
    if (!question) return
    try {
      const res = await fetch('/api/explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.id, student_answer: studentAnswer }),
      })
      // [B 수정] res.ok 체크 추가.
      // 기존: API 에러(401/500 등)가 와도 data.explanation을 그대로 읽어서
      // undefined → '' 로 설정되어 해설 없이 빈 화면만 뜸.
      // 수정: 에러 시 사용자에게 명확한 메시지 표시.
      if (!res.ok) {
        setExplanation('해설을 불러오지 못했습니다.')
        return
      }
      const data = await res.json()
      setExplanation(data.explanation ?? '')
    } catch {
      setExplanation('해설을 불러오지 못했습니다.')
    }
  }

  const handleNext = () => {
    if (nextQuestion) {
      router.push(`/questions/${nextQuestion.id}?sessionId=${sessionId}&subjectId=${subjectId}`)
    } else {
      router.push(`/subjects/${subjectId}/sessions/${sessionId}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-light flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-primary-light flex items-center justify-center px-5">
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm w-full max-w-sm">
          <p className="text-gray-500 text-sm">{error || '문제를 찾을 수 없습니다'}</p>
          <button onClick={() => router.back()} className="mt-4 text-primary text-sm font-semibold">
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  const difficultyColor = { easy: 'text-green-600', medium: 'text-yellow-600', hard: 'text-red-600' }
  const difficultyLabel = { easy: '쉬움', medium: '보통', hard: '어려움' }
  const isAnswerable = phase === 'answering' || phase === 'first_wrong'
  const hasAnswer = question.type === 'coding'
    ? blankAnswers.some((a) => a.trim())
    : answer.trim()

  const outputMatch =
    execResult &&
    question.expected_output &&
    execResult.stdout.trim() === question.expected_output.trim()

  return (
    <div className="min-h-screen bg-primary-light flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-8 pb-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-full hover:bg-white/60 transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-xs text-gray-400">{question.type === 'concept' ? '개념 문제' : '코딩 문제'}</p>
          <p className="text-xs font-medium text-gray-500">{currentIndex + 1} / {questions.length}</p>
        </div>
        <span className={`text-xs font-semibold ${difficultyColor[question.difficulty]}`}>
          {difficultyLabel[question.difficulty]}
        </span>
      </div>

      {/* 진행 바 */}
      <div className="px-5 mb-4">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 px-5 flex flex-col gap-4 pb-8">
        {/* 문제 지문 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-base font-semibold text-gray-800 leading-relaxed">{question.question}</p>
          {question.concept_tags && question.concept_tags.length > 0 && (
            <div className="flex gap-1 mt-3 flex-wrap">
              {question.concept_tags.map((tag) => (
                <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 입출력 예시 (코딩 문제 + test_cases 있을 때) */}
          {question.type === 'coding' && question.test_cases && question.test_cases.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-2">입출력 예시</p>
              <div className="flex flex-col gap-1.5">
                {question.test_cases.map((tc, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-400 font-sans shrink-0">입력</span>
                    <span className="text-gray-700">{(tc.input as unknown[]).map(String).join(', ')}</span>
                    <span className="text-gray-300 shrink-0">→</span>
                    <span className="text-gray-400 font-sans shrink-0">출력</span>
                    <span className="text-primary font-bold">{String(tc.expected)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 코딩 문제: 빈칸 채우기 ── */}
        {question.type === 'coding' && question.code_template && (
          <>
            <div className="bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
              {/* 코드 헤더 */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-gray-400 font-mono uppercase">{language}</span>
                {blankAnswers.length > 0 && (
                  <span className="text-xs text-yellow-400">{blankAnswers.length}개 빈칸</span>
                )}
              </div>
              {/* 코드 본문 + 인라인 입력 */}
              <pre className="p-4 font-mono text-sm leading-7 text-gray-100 whitespace-pre-wrap overflow-x-auto">
                {codingParts.map((part, i) => (
                  <span key={i}>
                    {part}
                    {i < codingParts.length - 1 && (
                      <input
                        className={[
                          'font-mono text-sm bg-yellow-400/20 text-yellow-300',
                          'border-b-2 border-yellow-400 px-1 mx-0.5',
                          'focus:outline-none focus:bg-yellow-400/30 transition-all',
                          'min-w-[60px] text-center',
                          !isAnswerable ? 'opacity-40 cursor-not-allowed' : '',
                        ].join(' ')}
                        style={{ width: `${Math.max(60, (blankAnswers[i]?.length || 3) * 10)}px` }}
                        value={blankAnswers[i] ?? ''}
                        onChange={(e) => {
                          const next = [...blankAnswers]
                          next[i] = e.target.value
                          setBlankAnswers(next)
                        }}
                        placeholder="___"
                        disabled={!isAnswerable}
                      />
                    )}
                  </span>
                ))}
              </pre>
            </div>

            {/* 실행 버튼 */}
            {isAnswerable && (
              <button
                onClick={handleExecute}
                disabled={executing || !blankAnswers.some((a) => a.trim())}
                className={[
                  'w-full py-3 rounded-xl font-bold text-sm',
                  'flex items-center justify-center gap-2 transition-colors',
                  'bg-gray-800 text-green-400 hover:bg-gray-700',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                ].join(' ')}
              >
                {executing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                    실행 중...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 2l9 5-9 5V2z" fill="currentColor" />
                    </svg>
                    코드 실행
                  </>
                )}
              </button>
            )}

            {/* 실행 결과 */}
            {execResult && (
              <div className="bg-gray-900 rounded-2xl p-4 font-mono text-sm shadow-sm">
                {execResult.stderr ? (
                  <>
                    <p className="text-red-400 text-xs mb-2 font-sans font-bold">오류</p>
                    <p className="text-red-300 whitespace-pre-wrap">{execResult.stderr}</p>
                  </>
                ) : execResult.test_results && execResult.test_results.length > 0 ? (
                  // 테스트케이스 모드
                  <>
                    <p className="text-gray-400 text-xs mb-3 font-sans font-bold">테스트 결과</p>
                    <div className="flex flex-col gap-2">
                      {execResult.test_results.map((tr) => (
                        <div
                          key={tr.index}
                          className={`rounded-xl p-3 border ${tr.passed ? 'border-green-700 bg-green-900/30' : 'border-red-700 bg-red-900/30'}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-sans font-bold text-gray-300">
                              테스트 {tr.index}
                            </span>
                            <span className={`text-xs font-sans font-bold ${tr.passed ? 'text-green-400' : 'text-red-400'}`}>
                              {tr.passed ? '✓ 통과' : '✗ 실패'}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs text-gray-400 font-sans">
                            <span>결과: <span className={tr.passed ? 'text-green-300' : 'text-red-300'}>{tr.result}</span></span>
                            {!tr.passed && <span>기댓값: <span className="text-blue-300">{tr.expected}</span></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className={`text-xs font-sans font-bold mt-3 pt-3 border-t border-gray-700 ${execResult.all_passed ? 'text-green-400' : 'text-yellow-400'}`}>
                      {execResult.test_results.filter((r) => r.passed).length} / {execResult.test_results.length}개 통과
                    </p>
                  </>
                ) : (
                  // 일반 실행 모드 (Java 등)
                  <>
                    <p className="text-gray-400 text-xs mb-2 font-sans font-bold">실행 결과</p>
                    <p className="text-green-300 whitespace-pre-wrap">{execResult.stdout || '(출력 없음)'}</p>
                    {question.expected_output && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-gray-400 text-xs mb-1 font-sans">예상 출력</p>
                        <p className="text-blue-300 whitespace-pre-wrap">{question.expected_output}</p>
                        <p className={`text-xs font-bold mt-2 font-sans ${outputMatch ? 'text-green-400' : 'text-red-400'}`}>
                          {outputMatch ? '✓ 예상 출력과 일치!' : '✗ 예상 출력과 다름'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ── 개념 문제: 텍스트 입력 ── */}
        {question.type === 'concept' && isAnswerable && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <textarea
              className="w-full p-4 text-sm text-gray-700 resize-none focus:outline-none"
              rows={3}
              placeholder="정답을 입력하세요"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
              }}
            />
          </div>
        )}

        {/* ── 1차 오답 메시지 ── */}
        {phase === 'first_wrong' && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="text-orange-700 font-semibold text-sm">🤔 다시 한번 생각해봐!</p>
            <p className="text-orange-500 text-xs mt-1">
              처음 답: <span className="line-through">{firstAttemptAnswer}</span>
            </p>
          </div>
        )}

        {/* ── 힌트 (1차 오답 시만) ── */}
        {phase === 'first_wrong' && question.hint && (
          <div>
            <button
              onClick={() => setShowHint((v) => !v)}
              className="text-sm text-primary font-semibold flex items-center gap-1.5"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#185FA5" strokeWidth="1.5" />
                <path d="M8 5v1M8 8v3" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {showHint ? '힌트 숨기기' : '힌트 보기'}
            </button>
            {showHint && (
              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
                {question.hint}
              </div>
            )}
          </div>
        )}

        {/* ── 제출 버튼 ── */}
        {isAnswerable && (
          <div className="flex gap-2">
            {phase === 'first_wrong' && (
              <button
                onClick={() => router.back()}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold bg-white"
              >
                그만하기
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!hasAnswer || submitting}
              className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50"
            >
              {submitting ? '제출 중...' : phase === 'first_wrong' ? '다시 제출하기' : '제출하기'}
            </button>
          </div>
        )}

        {/* ── 이전 / 다음 네비게이션 (제출 없이 둘러보기) ── */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => router.push(`/questions/${prevQuestion.id}?sessionId=${sessionId}&subjectId=${subjectId}`)}
            disabled={!prevQuestion}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-gray-50"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            이전
          </button>
          <button
            onClick={() => nextQuestion
              ? router.push(`/questions/${nextQuestion.id}?sessionId=${sessionId}&subjectId=${subjectId}`)
              : router.push(`/subjects/${subjectId}/sessions/${sessionId}`)
            }
            className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors hover:bg-gray-50"
          >
            {nextQuestion ? '다음' : '목록'}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* ── 정답 ── */}
        {phase === 'correct' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M7 17l5 5L25 11" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-xl font-bold text-green-600">정답입니다!</p>
              <p className="text-gray-400 text-sm mt-1">+10점</p>
            </div>
            <button onClick={handleNext} className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm">
              {nextQuestion ? '다음 문제 →' : '목록으로 돌아가기'}
            </button>
          </div>
        )}

        {/* ── 최종 오답 + AI 해설 ── */}
        {phase === 'final_wrong' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M10 10l12 12M22 10L10 22" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-xl font-bold text-red-500">아쉬워요!</p>
              {correctAnswer && (
                <p className="text-sm text-gray-500 mt-2">
                  정답: <span className="font-bold text-gray-700">{correctAnswer}</span>
                </p>
              )}
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-bold text-primary-dark mb-3">AI 해설</p>
              {explanation ? (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{explanation}</p>
              ) : (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                  해설 생성 중...
                </div>
              )}
            </div>
            <button onClick={handleNext} className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm">
              {nextQuestion ? '다음 문제 →' : '목록으로 돌아가기'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
