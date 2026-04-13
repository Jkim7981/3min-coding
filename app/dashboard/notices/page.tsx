'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ExamEvent } from '@/app/api/cert-schedules/route'

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const TYPE_META: Record<string, { label: string; bg: string; text: string }> = {
  doc_reg:  { label: '필기접수', bg: 'bg-blue-100',   text: 'text-blue-700' },
  doc_exam: { label: '필기시험', bg: 'bg-red-100',    text: 'text-red-700' },
  doc_pass: { label: '필기발표', bg: 'bg-green-100',  text: 'text-green-700' },
  prac_reg: { label: '실기접수', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  prac_exam:{ label: '실기시험', bg: 'bg-orange-100', text: 'text-orange-700' },
  prac_pass:{ label: '최종발표', bg: 'bg-teal-100',   text: 'text-teal-700' },
  reg:      { label: '접수',     bg: 'bg-blue-100',   text: 'text-blue-700' },
  exam:     { label: '시험',     bg: 'bg-red-100',    text: 'text-red-700' },
  pass:     { label: '합격발표', bg: 'bg-green-100',  text: 'text-green-700' },
}

const ALL_CERTS = ['정보처리기사', '빅데이터분석기사', 'SQLD', 'ADsP', '리눅스마스터']

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────
function isBetween(dateStr: string, startStr: string, endStr: string) {
  return dateStr >= startStr && dateStr <= endStr
}

function toYMD(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function formatDateKo(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}

function formatRangeKo(startDate: string, endDate: string) {
  if (startDate === endDate) return formatDateKo(startDate)
  const [sy, sm, sd] = startDate.split('-')
  const [, em, ed] = endDate.split('-')
  if (sm === em) return `${sy}년 ${Number(sm)}월 ${Number(sd)}일 ~ ${Number(ed)}일`
  return `${formatDateKo(startDate)} ~ ${formatDateKo(endDate)}`
}

// ─────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────
export default function NoticesPage() {
  const router = useRouter()
  const [events, setEvents] = useState<ExamEvent[]>([])
  const [liveSource, setLiveSource] = useState(false)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [selectedCerts, setSelectedCerts] = useState<Set<string>>(new Set(ALL_CERTS))
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/cert-schedules')
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events ?? [])
        setLiveSource(data.liveSource ?? false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const calendarDays = useMemo(() => buildCalendarDays(year, month), [year, month])
  const todayStr = toYMD(new Date())

  const filteredEvents = useMemo(
    () => events.filter((e) => selectedCerts.has(e.cert)),
    [events, selectedCerts]
  )

  // 달력 날짜별 이벤트 맵
  const dayEventMap = useMemo(() => {
    const map = new Map<string, ExamEvent[]>()
    for (const ev of filteredEvents) {
      const start = new Date(ev.startDate)
      const end = new Date(ev.endDate)
      const cur = new Date(start)
      while (cur <= end) {
        const key = toYMD(cur)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(ev)
        cur.setDate(cur.getDate() + 1)
      }
    }
    return map
  }, [filteredEvents])

  // 선택된 날의 이벤트 (중복 제거)
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return []
    const seen = new Set<string>()
    return (dayEventMap.get(selectedDay) ?? []).filter((ev) => {
      if (seen.has(ev.id)) return false
      seen.add(ev.id)
      return true
    })
  }, [selectedDay, dayEventMap])

  // 목록 뷰: 월별 그룹
  const upcomingGroups = useMemo(() => {
    const today = todayStr
    const upcoming = filteredEvents.filter((e) => e.endDate >= today)
    const groups: Record<string, ExamEvent[]> = {}
    for (const ev of upcoming) {
      const key = ev.startDate.slice(0, 7) // YYYY-MM
      if (!groups[key]) groups[key] = []
      if (!groups[key].find((e) => e.id === ev.id)) groups[key].push(ev)
    }
    return groups
  }, [filteredEvents, todayStr])

  const toggleCert = (cert: string) => {
    setSelectedCerts((prev) => {
      const next = new Set(prev)
      if (next.has(cert)) { if (next.size > 1) next.delete(cert) }
      else next.add(cert)
      return next
    })
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-light flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary-light">
      {/* 헤더 */}
      <div className="flex items-center relative px-5 pt-8 pb-4">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full hover:bg-white/60 transition-colors"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <p className="text-xs text-gray-400 font-medium">자격증</p>
          <h1 className="text-lg font-bold text-primary-dark">시험 일정</h1>
        </div>
      </div>

      <div className="px-4 pb-10 flex flex-col gap-4">
        {/* 라이브 배지 */}
        <div className="flex items-center gap-2 px-1">
          {liveSource ? (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              정보처리기사 실시간 연동
            </span>
          ) : (
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              참고용 · 공식 사이트에서 최종 확인 권장
            </span>
          )}
        </div>

        {/* 자격증 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {ALL_CERTS.map((cert) => {
            const active = selectedCerts.has(cert)
            return (
              <button
                key={cert}
                onClick={() => toggleCert(cert)}
                className={[
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                  active
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-gray-400 border-gray-200',
                ].join(' ')}
                style={active ? { backgroundColor: getColor(cert) } : {}}
              >
                {cert === '빅데이터분석기사' ? '빅분기' :
                 cert === '리눅스마스터' ? '리눅스' : cert}
              </button>
            )
          })}
        </div>

        {/* 뷰 토글 */}
        <div className="bg-white rounded-2xl p-1 flex shadow-sm">
          {(['calendar', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={[
                'flex-1 py-2 rounded-xl text-sm font-semibold transition-all',
                view === v ? 'bg-primary text-white shadow-sm' : 'text-gray-400',
              ].join(' ')}
            >
              {v === 'calendar' ? '📅 달력' : '📋 목록'}
            </button>
          ))}
        </div>

        {/* ── 달력 뷰 ── */}
        {view === 'calendar' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* 월 네비게이션 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M11 4l-5 5 5 5" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="text-base font-bold text-gray-800">
                {year}년 {month + 1}월
              </span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M7 4l5 5-5 5" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 border-b border-gray-50">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={d}
                  className={[
                    'text-center py-2 text-xs font-semibold',
                    i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400',
                  ].join(' ')}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="min-h-[56px] border-b border-r border-gray-50" />
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayEvents = dayEventMap.get(dateStr) ?? []
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDay
                const dotColors = [...new Set(dayEvents.map((e) => e.color))].slice(0, 3)
                const dow = idx % 7

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={[
                      'min-h-[56px] border-b border-r border-gray-50 flex flex-col items-center pt-2 pb-1 gap-1 transition-colors',
                      isSelected ? 'bg-primary-light' : dayEvents.length > 0 ? 'hover:bg-gray-50' : '',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                        isToday ? 'bg-primary text-white font-bold' : '',
                        !isToday && dow === 0 ? 'text-red-400' : '',
                        !isToday && dow === 6 ? 'text-blue-400' : '',
                        !isToday && dow !== 0 && dow !== 6 ? 'text-gray-700' : '',
                      ].join(' ')}
                    >
                      {day}
                    </span>
                    {dotColors.length > 0 && (
                      <div className="flex gap-0.5">
                        {dotColors.map((c, i) => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* 선택된 날짜 이벤트 */}
            {selectedDay && selectedDayEvents.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-3 flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-500">{formatDateKo(selectedDay)}</p>
                {selectedDayEvents.map((ev) => {
                  const meta = TYPE_META[ev.type] ?? { label: ev.typeLabel, bg: 'bg-gray-100', text: 'text-gray-700' }
                  return (
                    <div key={ev.id} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                      <span className="text-xs font-semibold text-gray-700">{ev.cert}</span>
                      <span className="text-xs text-gray-500">{ev.round}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.text} ml-auto`}>
                        {meta.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            {selectedDay && selectedDayEvents.length === 0 && (
              <div className="border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-400">{formatDateKo(selectedDay)} — 일정 없음</p>
              </div>
            )}
          </div>
        )}

        {/* 범례 */}
        {view === 'calendar' && (
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 mb-2">자격증 색상</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {ALL_CERTS.filter((c) => selectedCerts.has(c)).map((cert) => (
                <div key={cert} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(cert) }} />
                  <span className="text-xs text-gray-600">{cert}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 목록 뷰 ── */}
        {view === 'list' && (
          <div className="flex flex-col gap-3">
            {Object.keys(upcomingGroups).length === 0 ? (
              <div className="bg-white rounded-2xl px-4 py-8 text-center text-sm text-gray-400 shadow-sm">
                표시할 일정이 없습니다
              </div>
            ) : (
              Object.entries(upcomingGroups)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([monthKey, monthEvents]) => {
                  const [y, m] = monthKey.split('-')
                  return (
                    <div key={monthKey} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50">
                        <span className="text-sm font-bold text-gray-700">
                          {y}년 {Number(m)}월
                        </span>
                      </div>
                      <div className="flex flex-col divide-y divide-gray-50">
                        {monthEvents
                          .sort((a, b) => a.startDate.localeCompare(b.startDate))
                          .map((ev) => {
                            const meta = TYPE_META[ev.type] ?? { label: ev.typeLabel, bg: 'bg-gray-100', text: 'text-gray-700' }
                            const isPast = ev.endDate < todayStr
                            return (
                              <div key={ev.id} className={['flex items-start gap-3 px-4 py-3', isPast ? 'opacity-40' : ''].join(' ')}>
                                <span
                                  className="w-3 h-3 rounded-full mt-1 shrink-0"
                                  style={{ backgroundColor: ev.color }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-gray-800">{ev.cert}</span>
                                    <span className="text-xs text-gray-400">{ev.round}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.text}`}>
                                      {meta.label}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {formatRangeKo(ev.startDate, ev.endDate)}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        )}

        {/* 출처 안내 */}
        <p className="text-xs text-gray-400 text-center px-4 leading-relaxed">
          정보처리기사: 공공데이터포털(data.go.kr) · 나머지: dataq.or.kr, ihd.or.kr 기준
          <br />일정은 변경될 수 있으니 접수 전 공식 사이트에서 확인하세요.
        </p>
      </div>
    </div>
  )
}

function getColor(cert: string): string {
  const COLORS: Record<string, string> = {
    '정보처리기사': '#185FA5',
    '빅데이터분석기사': '#7C3AED',
    'SQLD': '#059669',
    'ADsP': '#D97706',
    '리눅스마스터': '#DC2626',
  }
  return COLORS[cert] ?? '#6B7280'
}
