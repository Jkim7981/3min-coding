'use client'

import { use, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface Question {
  id: string
  type: 'concept' | 'coding'
  question: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export default function QuestionResultPage({
  params,
}: {
  params: Promise<{ questionId: string }>
}) {
  const { questionId } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  const sessionId = searchParams.get('sessionId') ?? ''
  const subjectId = searchParams.get('subjectId') ?? ''
  const ids = searchParams.get('ids') ?? ''
  const isCorrect = searchParams.get('is_correct') === 'true'
  const correctAnswer = searchParams.get('correct_answer') ?? ''
  const studentAnswer = searchParams.get('student_answer') ?? ''
  const nextQuestionId = searchParams.get('nextQuestionId') ?? ''

  const [question, setQuestion] = useState<Question | null>(null)
  const [explanation, setExplanation] = useState('')
  const [loadingExplanation, setLoadingExplanation] = useState(false)
  const [explanationError, setExplanationError] = useState(false)

  // 문제 텍스트 조회 (세션 문맥 있으면 세션 API, 없으면 단건 API)
  useEffect(() => {
    if (sessionId) {
      fetch(`/api/sessions/${sessionId}/questions`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const q = data.find((q: Question) => q.id === questionId)
            if (q) setQuestion(q)
          }
        })
        .catch(() => {})
    } else {
      fetch(`/api/questions/${questionId}`)
        .then((r) => r.json())
        .then((data) => { if (data.id) setQuestion(data) })
        .catch(() => {})
    }
  }, [sessionId, questionId])

  // 오답 시 AI 해설 자동 조회 (30초 타임아웃)
  useEffect(() => {
    if (isCorrect || !studentAnswer) return
    setLoadingExplanation(true)
    setExplanationError(false)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    fetch('/api/explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: questionId, student_answer: studentAnswer }),
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('API 오류')
        return r.json()
      })
      .then((data) => {
        if (data.explanation) setExplanation(data.explanation)
        else setExplanationError(true)
      })
      .catch(() => setExplanationError(true))
      .finally(() => {
        clearTimeout(timeout)
        setLoadingExplanation(false)
      })
  }, [isCorrect, questionId, studentAnswer])

  const handleNext = () => {
    if (nextQuestionId) {
      const p = new URLSearchParams({ sessionId, subjectId, ...(ids ? { ids } : {}) })
      router.push(`/questions/${nextQuestionId}?${p}`)
    } else if (subjectId && sessionId) {
      router.push(`/subjects/${subjectId}/sessions/${sessionId}`)
    } else {
      // 대시보드 오늘의 문제에서 진입한 경우 (sessionId/subjectId 없음)
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-primary-light flex flex-col px-5 pt-8 pb-8 gap-4">
      {/* 결과 배지 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
            isCorrect ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          {isCorrect ? (
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M7 17l5 5L25 11"
                stroke="#16a34a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M10 10l12 12M22 10L10 22"
                stroke="#dc2626"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
        <p className={`text-xl font-bold ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
          {isCorrect ? '정답입니다!' : '아쉬워요!'}
        </p>
        {isCorrect && <p className="text-gray-400 text-sm mt-1">+10점</p>}
      </div>

      {/* 문제 내용 */}
      {question && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 mb-2">
            {question.type === 'concept' ? '개념 문제' : '코딩 문제'}
          </p>
          <p className="text-sm font-semibold text-gray-800 leading-relaxed">{question.question}</p>
        </div>
      )}

      {/* 정답 표시 (틀렸을 때) */}
      {!isCorrect && correctAnswer && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">정답</p>
          <p className="text-sm font-bold text-gray-800">{correctAnswer}</p>
        </div>
      )}

      {/* AI 해설 (틀렸을 때) */}
      {!isCorrect && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-bold text-primary-dark mb-3">AI 해설</p>
          {loadingExplanation ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
              해설 생성 중... (최대 30초)
            </div>
          ) : explanationError ? (
            <p className="text-sm text-gray-400 leading-relaxed">
              해설을 불러오지 못했습니다. 정답: <span className="font-semibold text-gray-600">{correctAnswer}</span>
            </p>
          ) : explanation ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {explanation}
            </p>
          ) : null}
        </div>
      )}

      {/* 다음 문제 버튼 */}
      <button
        onClick={handleNext}
        className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm mt-auto"
      >
        {nextQuestionId ? '다음 문제 →' : '목록으로 돌아가기'}
      </button>
    </div>
  )
}
