'use client'

import { useEffect, useState } from 'react'

type Period = 'weekly' | 'monthly'

interface Analysis {
  weak_concepts: string[]
  weak_types: string[]
  pattern: string
  advice: string[]
  encouragement: string
}

interface ReportData {
  analysis: Analysis
  wrong_count?: number
  cached?: boolean
}

export default function ReportPage() {
  const [period, setPeriod] = useState<Period>('weekly')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [noData, setNoData] = useState(false)

  const fetchReport = async (p: Period) => {
    setLoading(true)
    setNoData(false)
    setReport(null)
    try {
      const res = await fetch(`/api/reports?period=${p}`)
      const data = await res.json()
      if (data && data.summary) {
        setReport({ analysis: JSON.parse(data.summary) })
      } else {
        setNoData(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    setGenerating(true)
    setNoData(false)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      })
      const data = await res.json()
      if (data.message && !data.analysis) {
        setNoData(true)
      } else if (data.analysis) {
        setReport({ analysis: data.analysis, wrong_count: data.wrong_count, cached: data.cached })
      }
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    fetchReport(period)
  }, [period])

  return (
    <div className="flex flex-col min-h-screen px-5 pt-8 pb-24 gap-4">
      <h1 className="text-xl font-bold text-primary-dark">취약점 리포트</h1>

      {/* 주간 / 월간 토글 */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {(['weekly', 'monthly'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              period === p ? 'bg-white text-primary-dark shadow-sm' : 'text-gray-400'
            }`}
          >
            {p === 'weekly' ? '주간 리포트' : '월간 리포트'}
          </button>
        ))}
      </div>

      {/* 로딩 스켈레톤 */}
      {loading && (
        <div className="flex flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm h-28 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      {/* 리포트 없음 */}
      {!loading && noData && (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center flex flex-col items-center gap-3">
          <span className="text-4xl">🎉</span>
          <p className="font-bold text-gray-700">
            {period === 'weekly' ? '이번 주' : '이번 달'}에 오답이 없어요!
          </p>
          <p className="text-sm text-gray-400">계속 이 페이스를 유지해봐요.</p>
        </div>
      )}

      {/* 리포트 결과 */}
      {!loading && report && (
        <>
          {/* 격려 메시지 */}
          <div className="bg-primary/10 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-2xl">💬</span>
            <p className="text-sm font-medium text-primary-dark leading-relaxed">
              {report.analysis.encouragement}
            </p>
          </div>

          {/* 취약 패턴 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700 mb-2">취약 패턴 분석</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{report.analysis.pattern}</p>
          </div>

          {/* 취약 개념 */}
          {report.analysis.weak_concepts?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 mb-3">자주 틀리는 개념</h2>
              <div className="flex flex-wrap gap-2">
                {report.analysis.weak_concepts.map((c, i) => (
                  <span
                    key={i}
                    className={`text-xs font-medium px-3 py-1 rounded-full ${
                      i === 0
                        ? 'bg-red-100 text-red-600'
                        : i === 1
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-yellow-100 text-yellow-600'
                    }`}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 취약 문제 유형 */}
          {report.analysis.weak_types?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 mb-3">취약 문제 유형</h2>
              <div className="flex flex-wrap gap-2">
                {report.analysis.weak_types.map((t, i) => (
                  <span key={i} className="text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-600">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 조언 */}
          {report.analysis.advice?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 mb-3">개선 조언</h2>
              <div className="flex flex-col gap-2">
                {report.analysis.advice.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.cached && (
            <p className="text-center text-xs text-gray-400">오늘 생성된 리포트입니다</p>
          )}
        </>
      )}

      {/* 리포트 생성 버튼 */}
      {!loading && (
        <button
          onClick={generateReport}
          disabled={generating}
          className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm shadow-sm disabled:opacity-60 transition-opacity"
        >
          {generating ? 'AI 분석 중...' : `${period === 'weekly' ? '주간' : '월간'} 리포트 새로 생성`}
        </button>
      )}
    </div>
  )
}
