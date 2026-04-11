'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type SessionStatus = 'completed' | 'current' | 'preview' | 'locked'

interface Session {
  id: string
  title: string
  session_number?: number
  status: SessionStatus
}

const xPositions = [50, 68, 32, 50, 68, 32, 50, 68, 32, 50]

function SessionNode({ session, x, y, subjectId }: {
  session: Session; x: number; y: number; subjectId: string
}) {
  const isClickable = session.status !== 'locked'

  const circleStyle: Record<SessionStatus, string> = {
    completed: 'bg-primary border-4 border-primary shadow-md',
    current: 'bg-white border-4 border-orange-400 shadow-lg',
    preview: 'bg-white border-4 border-gray-300',
    locked: 'bg-gray-200 border-4 border-gray-300 opacity-60',
  }

  const content = (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: `${x}%`, top: `${y}px`, transform: 'translate(-50%, 0)' }}
    >
      <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center ${circleStyle[session.status]}`}>
        {session.status === 'completed' ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <>
            <span className={`text-xs font-bold ${session.status === 'locked' ? 'text-gray-400' : 'text-primary-dark'}`}>
              {session.session_number ?? '?'}회차
            </span>
            <span className={`text-[10px] text-center leading-tight mt-0.5 px-1 ${session.status === 'locked' ? 'text-gray-400' : 'text-gray-600'}`}>
              {session.title.length > 8 ? session.title.slice(0, 8) + '…' : session.title}
            </span>
          </>
        )}
      </div>

      {session.status === 'completed' && (
        <div className="mt-1 text-center">
          <span className="text-[10px] font-bold text-primary">{session.session_number}회차</span>
          <br />
          <span className="text-[10px] text-gray-500">{session.title}</span>
        </div>
      )}
      {session.status === 'current' && (
        <div className="mt-2 flex items-center gap-1 bg-orange-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
          학습중 <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        </div>
      )}
      {session.status === 'preview' && (
        <div className="mt-2 bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
          예습
        </div>
      )}
    </div>
  )

  if (isClickable) {
    return (
      <Link href={`/subjects/${subjectId}/sessions/${session.id}`}>
        {content}
      </Link>
    )
  }
  return <>{content}</>
}

export default function SubjectRoadmapPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params)
  const router = useRouter()

  const [subjectName, setSubjectName] = useState('과목')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // 과목명 조회
        const sRes = await fetch('/api/subjects')
        const sData = await sRes.json()
        if (Array.isArray(sData)) {
          const found = sData.find((s: { id: string; name: string }) => s.id === subjectId)
          if (found) setSubjectName(found.name)
        }

        // 회차 목록 조회
        const lRes = await fetch(`/api/subjects/${subjectId}/sessions`)
        const lData = await lRes.json()
        if (!Array.isArray(lData)) return

        // 정렬 후 상태 부여 (첫 번째 = current, 나머지 = preview)
        const sorted = [...lData].sort((a, b) =>
          (a.session_number ?? 0) - (b.session_number ?? 0)
        )
        const withStatus: Session[] = sorted.map((l, i) => ({
          ...l,
          status: i === 0 ? 'current' : i === 1 ? 'preview' : 'locked',
        }))
        setSessions(withStatus)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [subjectId])

  const NODE_HEIGHT = 80
  const NODE_BADGE_SPACE = 40
  const ROW_GAP = 130
  const PADDING_TOP = 20
  const totalHeight = sessions.length * ROW_GAP + NODE_HEIGHT + NODE_BADGE_SPACE + PADDING_TOP

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
        <div className="text-center">
          <p className="text-xs text-gray-400 font-medium">회차별 로드맵</p>
          <h1 className="text-lg font-bold text-primary-dark">{subjectName}</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center mt-20 gap-3 text-center px-5">
          <div className="text-4xl">📭</div>
          <p className="text-sm text-gray-500">등록된 회차가 없습니다</p>
        </div>
      ) : (
        <div className="px-5 pb-8">
          <div className="relative mx-auto" style={{ maxWidth: '320px', height: `${totalHeight}px` }}>
            <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" preserveAspectRatio="none">
              {sessions.slice(0, -1).map((_, i) => {
                const x1 = xPositions[i % xPositions.length]
                const y1 = PADDING_TOP + i * ROW_GAP + NODE_HEIGHT / 2
                const x2 = xPositions[(i + 1) % xPositions.length]
                const y2 = PADDING_TOP + (i + 1) * ROW_GAP + NODE_HEIGHT / 2
                return (
                  <line key={i} x1={`${x1}%`} y1={y1} x2={`${x2}%`} y2={y2}
                    stroke="#CBD5E1" strokeWidth="3" strokeDasharray="8 6" strokeLinecap="round" />
                )
              })}
            </svg>

            {sessions.map((session, i) => (
              <SessionNode
                key={session.id}
                session={session}
                x={xPositions[i % xPositions.length]}
                y={PADDING_TOP + i * ROW_GAP}
                subjectId={subjectId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
