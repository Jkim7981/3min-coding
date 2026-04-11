'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Question {
  id: string
  type: 'concept' | 'coding'
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  answer: string
  hint?: string
  code_template?: string
  concept_tags?: string[]
}

interface Lesson {
  id: string
  title: string
  session_number?: number
  questions: Question[]
}

interface Subject {
  id: string
  name: string
  lessons: Lesson[]
}

const difficultyLabel: Record<string, { label: string; color: string }> = {
  easy: { label: '쉬움', color: 'bg-green-100 text-green-700' },
  medium: { label: '보통', color: 'bg-yellow-100 text-yellow-700' },
  hard: { label: '어려움', color: 'bg-red-100 text-red-700' },
}

const typeLabel: Record<string, { label: string; color: string }> = {
  concept: { label: '개념', color: 'bg-blue-100 text-blue-700' },
  coding: { label: '코딩', color: 'bg-purple-100 text-purple-700' },
}

export default function AdminQuestionsPage() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  // [B 수정] API 실패 시 에러 상태를 별도로 관리하도록 추가.
  // 기존: 과목 API가 배열이 아닌 값을 반환하면 조용히 빈 목록처럼 보여줘서
  // 실제 에러인지 데이터가 없는 건지 구분이 안 됨.
  // 수정: error 상태를 두고 API 실패 시 사용자에게 명확한 메시지 표시.
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)

  useEffect(() => {
    async function loadAll() {
      try {
        const sRes = await fetch('/api/subjects')
        const sData = await sRes.json()
        if (!Array.isArray(sData)) {
          setError('과목 목록을 불러오는 데 실패했습니다.')
          return
        }

        const subjectsWithLessons = await Promise.all(
          sData.map(async (subject: { id: string; name: string }) => {
            const lRes = await fetch(`/api/subjects/${subject.id}/sessions`)
            const lData = await lRes.json()
            const lessons = Array.isArray(lData) ? lData : []

            const lessonsWithQuestions = await Promise.all(
              lessons.map(async (lesson: { id: string; title: string; session_number?: number }) => {
                const qRes = await fetch(`/api/sessions/${lesson.id}/questions`)
                const qData = await qRes.json()
                return { ...lesson, questions: Array.isArray(qData) ? qData : [] }
              })
            )

            return { ...subject, lessons: lessonsWithQuestions }
          })
        )

        setSubjects(subjectsWithLessons)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [retryKey])

  const totalQuestions = subjects.reduce(
    (acc, s) => acc + s.lessons.reduce((a, l) => a + l.questions.length, 0),
    0
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-light flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500">문제 목록 불러오는 중...</p>
      </div>
    )
  }

  // [B 수정] 에러 상태 UI — API 실패 시 빈 화면 대신 명확한 에러 메시지 표시
  if (error) {
    return (
      <div className="min-h-screen bg-primary-light flex flex-col items-center justify-center gap-3 px-5 text-center">
        <div className="text-4xl">⚠️</div>
        <p className="text-sm font-semibold text-gray-600">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); setRetryKey((k) => k + 1) }}
          className="mt-2 px-5 py-3 rounded-2xl bg-primary text-white text-sm font-bold"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary-light">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-8 pb-4">
        <div>
          <p className="text-xs text-gray-400 font-medium">강사 관리</p>
          <h1 className="text-lg font-bold text-primary-dark">생성된 문제</h1>
        </div>
        <div className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full">
          총 {totalQuestions}문제
        </div>
      </div>

      {subjects.length === 0 || totalQuestions === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 mt-20 gap-4 text-center">
          <div className="text-5xl">📭</div>
          <p className="text-sm font-semibold text-gray-600">생성된 문제가 없습니다</p>
          <p className="text-xs text-gray-400">수업 자료를 업로드하면 AI가 문제를 자동 생성합니다</p>
          <button
            onClick={() => router.push('/admin/upload')}
            className="mt-2 px-5 py-3 rounded-2xl bg-primary text-white text-sm font-bold min-h-[44px]"
          >
            수업 자료 업로드
          </button>
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-4 pb-10">
          {subjects.map((subject) => (
            <div key={subject.id}>
              <p className="text-xs font-bold text-gray-400 tracking-wide mb-2 px-1">
                📚 {subject.name}
              </p>
              <div className="flex flex-col gap-2">
                {subject.lessons.map((lesson) => (
                  <div key={lesson.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* 회차 헤더 */}
                    <button
                      onClick={() =>
                        setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)
                      }
                      className="w-full flex items-center justify-between px-4 py-3.5 text-left min-h-[44px]"
                    >
                      <div className="flex items-center gap-2">
                        {lesson.session_number && (
                          <span className="text-xs bg-primary-light text-primary font-bold px-2 py-0.5 rounded-lg">
                            {lesson.session_number}회차
                          </span>
                        )}
                        <span className="text-sm font-semibold text-gray-800">{lesson.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-400">{lesson.questions.length}문제</span>
                        <svg
                          width="16" height="16" viewBox="0 0 16 16" fill="none"
                          className={`transition-transform duration-200 ${expandedLesson === lesson.id ? 'rotate-180' : ''}`}
                        >
                          <path d="M4 6l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                    </button>

                    {/* 문제 목록 */}
                    {expandedLesson === lesson.id && (
                      <div className="border-t border-gray-100 divide-y divide-gray-50">
                        {lesson.questions.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">문제가 없습니다</p>
                        ) : (
                          lesson.questions.map((q, idx) => (
                            <div key={q.id} className="px-4 py-3">
                              <button
                                onClick={() =>
                                  setExpandedQuestion(expandedQuestion === q.id ? null : q.id)
                                }
                                className="w-full text-left flex flex-col gap-1.5"
                              >
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs text-gray-400 font-medium">Q{idx + 1}</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${typeLabel[q.type]?.color}`}>
                                    {typeLabel[q.type]?.label}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${difficultyLabel[q.difficulty]?.color}`}>
                                    {difficultyLabel[q.difficulty]?.label}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 leading-snug">{q.question}</p>
                              </button>

                              {expandedQuestion === q.id && (
                                <div className="mt-3 flex flex-col gap-2">
                                  {q.code_template && (
                                    <div className="bg-gray-900 rounded-xl p-3">
                                      <pre className="text-xs text-green-400 whitespace-pre-wrap font-mono leading-relaxed">
                                        {q.code_template}
                                      </pre>
                                    </div>
                                  )}
                                  <div className="bg-green-50 rounded-xl px-3 py-2">
                                    <p className="text-[10px] font-bold text-green-600 mb-0.5">정답</p>
                                    <p className="text-sm text-green-800">{q.answer}</p>
                                  </div>
                                  {q.hint && (
                                    <div className="bg-yellow-50 rounded-xl px-3 py-2">
                                      <p className="text-[10px] font-bold text-yellow-600 mb-0.5">힌트</p>
                                      <p className="text-xs text-yellow-800">{q.hint}</p>
                                    </div>
                                  )}
                                  {q.concept_tags && q.concept_tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {q.concept_tags.map((tag) => (
                                        <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
