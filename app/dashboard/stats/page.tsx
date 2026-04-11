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

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data)
      })
      .finally(() => setLoading(false))
  }, [])

  const trend = stats?.recent_accuracy_trend ?? []
  const maxCount = Math.max(...trend.map((d) => d.count), 1)
  const todayDay = DAYS[new Date().getDay()]

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen px-5 pt-8 pb-6">
        <h1 className="text-xl font-bold text-primary-dark mb-5">학습 통계</h1>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm h-20 animate-pulse bg-gray-100" />
          ))}
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm h-40 animate-pulse bg-gray-100 mb-4" />
        <div className="bg-white rounded-2xl p-5 shadow-sm h-32 animate-pulse bg-gray-100" />
      </div>
    )
  }

  const correctRatePct = stats ? Math.round(stats.correct_rate * 100) : 0

  return (
    <div className="flex flex-col min-h-screen px-5 pt-8 pb-6 gap-4">
      <h1 className="text-xl font-bold text-primary-dark">학습 통계</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '총 풀이 문제', value: stats?.total_answered ?? 0, unit: '문제' },
          { label: '정답률', value: correctRatePct, unit: '%' },
          { label: '연속 학습일', value: stats?.streak ?? 0, unit: '일' },
          { label: '이번 주', value: stats?.this_week ?? 0, unit: '문제' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">{item.label}</p>
            <p className="text-2xl font-bold text-primary-dark">
              {item.value}
              <span className="text-sm font-normal text-gray-400 ml-1">{item.unit}</span>
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
            const dayLabel = DAYS[date.getDay()]
            const isToday = d.date === new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10)
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
