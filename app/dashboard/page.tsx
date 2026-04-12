'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { SubjectCardSkeleton, StatCardSkeleton } from '@/components/ui/Skeleton'

interface Subject {
  id: string
  name: string
  teacher_id: string
  created_at: string
}

interface Stats {
  total_answered: number
  correct_rate: number
  streak: number
  this_week: number
}

interface DailyQuestion {
  id: string
  type: string
  difficulty: string
  question: string
  lessons: { title: string; session_number: number } | null
}

interface DailyQuestions {
  new: DailyQuestion[]
  review: DailyQuestion[]
  total: number
}

// 푸시 알림 구독 요청
async function subscribeToPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) return // 이미 구독 중

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    })
  } catch {
    // 알림 구독 실패는 조용히 무시
  }
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? '학생'

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [dailyQuestions, setDailyQuestions] = useState<DailyQuestions | null>(null)
  const [loading, setLoading] = useState(true)
  const [dailyLoading, setDailyLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    Promise.all([
      fetch('/api/subjects', { signal: controller.signal })
        .then((r) => { if (!r.ok) throw new Error('failed'); return r.json() })
        .then((data) => { if (Array.isArray(data)) setSubjects(data) })
        .catch(() => {}),
      fetch('/api/stats', { signal: controller.signal })
        .then((r) => { if (!r.ok) throw new Error('failed'); return r.json() })
        .then((data) => setStats(data))
        .catch(() => {}),
    ]).finally(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    // 오늘의 문제 별도 조회
    fetch('/api/daily-questions', { signal: controller.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setDailyQuestions(data) })
      .catch(() => {})
      .finally(() => setDailyLoading(false))

    // 푸시 알림 구독 (조용히 처리)
    subscribeToPush()

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  const difficultyLabel = (d: string) =>
    d === 'easy' ? '쉬움' : d === 'hard' ? '어려움' : '보통'
  const difficultyColor = (d: string) =>
    d === 'easy' ? 'text-green-500' : d === 'hard' ? 'text-red-500' : 'text-yellow-500'

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* 헤더 */}
      <div className="pt-4 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">안녕하세요!</p>
          <h1 className="text-2xl font-bold text-primary-dark mt-0.5">{userName}님 👋</h1>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1 p-1.5 rounded-xl hover:bg-gray-100"
          aria-label="로그아웃"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          로그아웃
        </button>
      </div>

      {/* 오늘의 문제 — 핵심 섹션 */}
      <section className="bg-primary rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium opacity-80">매일 아침 9시</p>
            <p className="font-bold text-lg">오늘의 문제 🔥</p>
          </div>
          {!dailyLoading && dailyQuestions && (
            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
              {dailyQuestions.total}문제
            </span>
          )}
        </div>

        {dailyLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/10 rounded-xl h-12 animate-pulse" />
            ))}
          </div>
        ) : dailyQuestions && dailyQuestions.total > 0 ? (
          <div className="flex flex-col gap-2 mb-4">
            {/* 새 문제 */}
            {dailyQuestions.new.map((q, i) => (
              <Link
                key={q.id}
                href={`/questions/${q.id}`}
                className="bg-white/15 hover:bg-white/25 transition-colors rounded-xl px-3 py-2.5 flex items-center gap-2"
              >
                <span className="text-xs bg-white/20 rounded-md px-1.5 py-0.5 font-medium shrink-0">
                  새 문제 {i + 1}
                </span>
                <span className="text-sm font-medium truncate flex-1">{q.question}</span>
                <span className={`text-xs font-medium shrink-0 ${difficultyColor(q.difficulty)} bg-white/10 rounded px-1.5 py-0.5`}>
                  {difficultyLabel(q.difficulty)}
                </span>
              </Link>
            ))}
            {/* 복습 문제 */}
            {dailyQuestions.review.map((q, i) => (
              <Link
                key={q.id}
                href={`/questions/${q.id}`}
                className="bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-3 py-2.5 flex items-center gap-2"
              >
                <span className="text-xs bg-yellow-400/30 text-yellow-100 rounded-md px-1.5 py-0.5 font-medium shrink-0">
                  복습 {i + 1}
                </span>
                <span className="text-sm font-medium truncate flex-1">{q.question}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white/10 rounded-xl px-4 py-3 mb-4 text-sm opacity-80">
            오늘의 문제를 모두 완료했어요! 🎉
          </div>
        )}

        <Link
          href="/dashboard/subjects"
          className="inline-flex items-center bg-white text-primary text-sm font-bold px-4 py-2.5 rounded-xl min-h-[44px]"
        >
          회차별 문제 보기 →
        </Link>
      </section>

      {/* 수강 과목 카드 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-500">내 과목</h2>
        {loading ? (
          <>
            <SubjectCardSkeleton />
            <SubjectCardSkeleton />
          </>
        ) : subjects.length > 0 ? (
          subjects.slice(0, 2).map((subject) => (
            <Link
              key={subject.id}
              href={`/subjects/${subject.id}`}
              className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                  과목
                </span>
                <span className="font-bold text-gray-800">{subject.name}</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
            <p className="text-sm text-gray-400">수강 중인 과목이 없습니다</p>
          </div>
        )}

        <Link
          href="/dashboard/subjects"
          className="text-center text-sm text-primary font-medium py-2 min-h-[44px] flex items-center justify-center"
        >
          전체 과목 보기 →
        </Link>
      </section>

      {/* 학습 현황 */}
      <section className="grid grid-cols-2 gap-3">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">이번 주 풀이</p>
              <p className="text-2xl font-bold text-primary-dark">
                {stats?.this_week ?? 0}
                <span className="text-sm font-normal text-gray-400 ml-1">문제</span>
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">연속 학습</p>
              <p className="text-2xl font-bold text-primary-dark">
                {stats?.streak ?? 0}
                <span className="text-sm font-normal text-gray-400 ml-1">일</span>
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
