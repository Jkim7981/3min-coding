'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Question {
  id: string
  type: 'concept' | 'coding'
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  code_template?: string
  hint?: string
  concept_tags?: string[]
}

type Tab = 'all' | 'concept' | 'coding'

const difficultyLabel: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
}

const difficultyColor: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

export default function SessionQuestionsPage({
  params,
}: {
  params: Promise<{ subjectId: string; sessionId: string }>
}) {
  const { subjectId, sessionId } = use(params)
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/questions`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setQuestions(data)
        else setError(data.error ?? '오류가 발생했습니다')
      })
      .catch(() => setError('네트워크 오류가 발생했습니다'))
      .finally(() => setLoading(false))
  }, [sessionId])

  const filtered = tab === 'all' ? questions : questions.filter((q) => q.type === tab)
  const conceptCount = questions.filter((q) => q.type === 'concept').length
  const codingCount = questions.filter((q) => q.type === 'coding').length

  return (
    <div className="min-h-screen bg-primary-light">
      {/* 헤더 */}
      <div className="flex items-center justify-center relative px-5 pt-8 pb-4">
        <button
          onClick={() => router.back()}
          className="absolute left-5 p-1.5 rounded-full hover:bg-white/60 transition-colors"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-primary-dark">문제 목록</h1>
      </div>

      <div className="px-5 flex flex-col gap-4">
        {/* 진행 바 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>총 {questions.length}문제</span>
            <span>개념 {conceptCount} · 코딩 {codingCount}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full w-0 transition-all" />
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2">
          {(['all', 'concept', 'coding'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'flex-1 py-2 rounded-xl text-sm font-semibold transition-colors',
                tab === t ? 'bg-primary text-white' : 'bg-white text-gray-500',
              ].join(' ')}
            >
              {t === 'all' ? '전체' : t === 'concept' ? '개념' : '코딩'}
            </button>
          ))}
        </div>

        {/* 문제 목록 */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm shadow-sm">
            문제가 없습니다
          </div>
        )}

        <div className="flex flex-col gap-3 pb-8">
          {filtered.map((q, idx) => (
            <Link
              key={q.id}
              href={`/questions/${q.id}?sessionId=${sessionId}&subjectId=${subjectId}`}
              className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform block"
            >
              <div className="flex items-start gap-3">
                {/* 번호 */}
                <span className="w-7 h-7 rounded-full bg-primary-light text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  {/* 뱃지 */}
                  <div className="flex gap-1.5 mb-1.5">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        q.type === 'concept'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {q.type === 'concept' ? '개념' : '코딩'}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${difficultyColor[q.difficulty]}`}>
                      {difficultyLabel[q.difficulty]}
                    </span>
                  </div>

                  {/* 문제 미리보기 */}
                  <p className="text-sm text-gray-700 leading-snug line-clamp-2">{q.question}</p>

                  {/* 개념 태그 */}
                  {q.concept_tags && q.concept_tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {q.concept_tags.map((tag) => (
                        <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-1">
                  <path d="M6 4l4 4-4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
