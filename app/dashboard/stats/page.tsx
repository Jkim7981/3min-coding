'use client'

import { useEffect, useState } from 'react'

interface StatsData {
  total_answered: number
  correct_rate: number
  streak: number
  this_week: number
  due_reviews: number
  weak_concepts: { concept: string; count: number }[]
  recent_accuracy_trend: { date: string; correct_rate: number; count: number }[]
  by_subject: { subject_id: string; total: number; correct_rate: number }[]
}

const WEEK_LABELS = ['월', '화', '수', '목', '금', '토', '일']

// KST 기준 이번 주 월~일 날짜 배열 반환
function getThisWeekDates(): string[] {
  const now = new Date(Date.now() + 9 * 3600000)
  const dayOfWeek = now.getUTCDay() // 0=일, 1=월 ... 6=토
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((dayOfWeek + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => { if (!data.error) setStats(data) })
      .finally(() => setLoading(false))
  }, [])

  const trend = stats?.recent_accuracy_trend ?? []
  const maxCount = Math.max(...trend.map((d) => d.count), 1)

  // 활동 있는 날짜 set
  const activeDates = new Set(trend.filter((d) => d.count > 0).map((d) => d.date))
  const weekDates = getThisWeekDates()
  const todayKST = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10)

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen px-5 pt-8 pb-6 gap-4">
        <h1 className="text-xl font-bold text-primary-dark">학습 통계</h1>
        <div className="bg-primary rounded-2xl h-36 animate-pulse opacity-40" />
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-16 animate-pulse bg-gray-100" />
          ))}
        </div>
        <div className="bg-white rounded-2xl h-40 animate-pulse bg-gray-100" />
        <div className="bg-white rounded-2xl h-32 animate-pulse bg-gray-100" />
      </div>
    )
  }

  const correctRatePct = stats ? Math.round(stats.correct_rate * 100) : 0

  return (
    <div className="flex flex-col min-h-screen px-5 pt-8 pb-6 gap-4">
      <h1 className="text-xl font-bold text-primary-dark">학습 통계</h1>

      {/* ── 스트릭 히어로 카드 ── */}
      <div className="bg-primary rounded-2xl p-5 text-white">
        {/* 연속 일수 */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-4xl">🔥</span>
          <div>
            <p className="text-xs font-medium opacity-60 mb-0.5">연속 학습</p>
            <p className="text-4xl font-bold leading-none">
              {stats?.streak ?? 0}
              <span className="text-lg font-medium opacity-70 ml-1.5">일</span>
            </p>
          </div>
        </div>

        {/* 주간 달력 (월~일) */}
        <div className="flex justify-between">
          {weekDates.map((date, i) => {
            const isActive = activeDates.has(date)
            const isToday = date === todayKST
            const isPast = date < todayKST
            return (
              <div key={date} className="flex flex-col items-center gap-1">
                {/* 날짜 원 */}
                <div
                  className={[
                    'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    isActive
                      ? 'bg-white text-primary shadow-sm'
                      : isToday
                        ? 'border-2 border-white/60 text-white'
                        : isPast
                          ? 'bg-white/10 text-white/30'
                          : 'bg-white/10 text-white/50',
                  ].join(' ')}
                >
                  {isActive ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    WEEK_LABELS[i]
                  )}
                </div>
                {/* 요일 라벨 */}
                <span className={`text-[10px] font-medium ${isToday ? 'text-white' : 'opacity-40'}`}>
                  {WEEK_LABELS[i]}
                </span>
                {/* 오늘 표시 삼각형 */}
                {isToday && (
                  <div
                    className="w-0 h-0"
                    style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '5px solid rgba(255,255,255,0.7)', transform: 'rotate(180deg)' }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 나머지 3개 통계 (작게) ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '총 풀이', value: stats?.total_answered ?? 0, unit: '문제' },
          { label: '정답률', value: correctRatePct, unit: '%' },
          { label: '이번 주', value: stats?.this_week ?? 0, unit: '문제' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
            <p className="text-[10px] text-gray-400 mb-1">{item.label}</p>
            <p className="text-xl font-bold text-primary-dark leading-none">
              {item.value}
              <span className="text-xs font-normal text-gray-400 ml-0.5">{item.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 복습 예정 배너 */}
      {stats && stats.due_reviews > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">📚</span>
          <div>
            <p className="text-sm font-bold text-amber-700">복습할 문제가 있어요!</p>
            <p className="text-xs text-amber-600">{stats.due_reviews}개 문제가 기다리고 있습니다</p>
          </div>
        </div>
      )}

      {/* 최근 7일 학습량 바 차트 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-4">최근 7일 학습량</h2>
        <div className="flex items-end justify-between gap-1.5" style={{ height: '100px' }}>
          {trend.map((d) => {
            const heightPct = (d.count / maxCount) * 100
            const date = new Date(d.date + 'T00:00:00+09:00')
            const dayLabel = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
            const isToday = d.date === todayKST
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                  <div
                    className={`w-full rounded-t-lg transition-all ${isToday ? 'bg-primary' : 'bg-primary-light'}`}
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                </div>
                <span className={`text-[10px] ${isToday ? 'text-primary font-bold' : 'text-gray-400'}`}>
                  {dayLabel}
                </span>
              </div>
            )
          })}
        </div>
        {trend.length === 0 && (
          <p className="text-center text-xs text-gray-400 mt-2">아직 학습 데이터가 없습니다</p>
        )}
      </div>

      {/* 취약 개념 Top 3 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-3">취약 개념 Top 3</h2>
        {stats?.weak_concepts && stats.weak_concepts.length > 0 ? (
          <div className="flex flex-col gap-2">
            {stats.weak_concepts.map((w, i) => (
              <div key={w.concept} className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i === 0
                      ? 'bg-red-100 text-red-600'
                      : i === 1
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-yellow-100 text-yellow-600'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{w.concept}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">오답 {w.count}회</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">아직 오답 데이터가 없습니다 🎉</p>
        )}
      </div>
    </div>
  )
}
