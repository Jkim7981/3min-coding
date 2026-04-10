'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type SessionStatus = 'completed' | 'current' | 'preview' | 'locked'

interface Session {
  id?: string
  number: number
  title: string
  status: SessionStatus
}

// TODO: params.subjectId로 /api/subjects/[id] + /api/lessons 연결
const mockSubjectData: Record<string, { name: string; sessions: Session[] }> = {
  'python-basics': {
    name: 'Python 기초',
    sessions: [
      { number: 1, title: '변수와 자료형', status: 'completed' },
      { number: 2, title: '조건문 if/else', status: 'completed' },
      { number: 3, title: '반복문 for/while', status: 'current' },
      { number: 4, title: '리스트 기초', status: 'preview' },
      { number: 5, title: '딕셔너리', status: 'locked' },
      { number: 6, title: '함수 정의', status: 'locked' },
    ],
  },
  'java-oop': {
    name: 'Java 객체지향',
    sessions: [
      { number: 1, title: '클래스와 객체', status: 'current' },
      { number: 2, title: '상속', status: 'preview' },
      { number: 3, title: '다형성', status: 'locked' },
      { number: 4, title: '인터페이스', status: 'locked' },
    ],
  },
  'js-basics': {
    name: 'JavaScript 기초',
    sessions: [
      { number: 1, title: '변수와 타입', status: 'preview' },
      { number: 2, title: '함수', status: 'locked' },
      { number: 3, title: '배열과 객체', status: 'locked' },
    ],
  },
}

// 징검다리 x축 위치 (%, 0~100)
const xPositions = [50, 68, 32, 50, 68, 32, 50, 68, 32]

function SessionNode({ session, x, y, subjectId }: { session: Session; x: number; y: number; subjectId: string }) {
  const isClickable = session.status === 'current' || session.status === 'preview' || session.status === 'completed'

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
      {/* 원 */}
      <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center ${circleStyle[session.status]}`}>
        {session.status === 'completed' ? (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        ) : (
          <>
            <span className={`text-xs font-bold ${session.status === 'locked' ? 'text-gray-400' : 'text-primary-dark'}`}>
              {session.number}회차
            </span>
            <span className={`text-[10px] text-center leading-tight mt-0.5 px-1 ${session.status === 'locked' ? 'text-gray-400' : 'text-gray-600'}`}>
              {session.title}
            </span>
          </>
        )}
      </div>

      {/* 완료된 경우 회차명 아래 표시 */}
      {session.status === 'completed' && (
        <div className="mt-1 text-center">
          <span className="text-[10px] font-bold text-primary">{session.number}회차</span>
          <br />
          <span className="text-[10px] text-gray-500">{session.title}</span>
        </div>
      )}

      {/* 현재 학습중 뱃지 */}
      {session.status === 'current' && (
        <div className="mt-2 flex items-center gap-1 bg-orange-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
          현재 학습중
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        </div>
      )}

      {/* 예습 버튼 */}
      {session.status === 'preview' && (
        <div className="mt-2 bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
          예습
        </div>
      )}
    </div>
  )

  if (isClickable) {
    return (
      <Link href={`/subjects/${subjectId}/sessions/${session.id ?? session.number}`}>
        {content}
      </Link>
    )
  }

  return <>{content}</>
}

export default function SubjectRoadmapPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params)
  const router = useRouter()
  const subject = mockSubjectData[subjectId] ?? {
    name: '과목',
    sessions: [],
  }

  const NODE_HEIGHT = 80  // 원 크기
  const NODE_BADGE_SPACE = 36 // 뱃지/텍스트 공간
  const ROW_GAP = 130    // 행 간격
  const PADDING_TOP = 20
  const totalHeight = subject.sessions.length * ROW_GAP + NODE_HEIGHT + NODE_BADGE_SPACE + PADDING_TOP

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
          <h1 className="text-lg font-bold text-primary-dark">{subject.name}</h1>
        </div>
      </div>

      {/* 징검다리 로드맵 */}
      <div className="px-5 pb-8">
        <div className="relative mx-auto" style={{ maxWidth: '320px', height: `${totalHeight}px` }}>
          {/* SVG 연결선 */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
          >
            {subject.sessions.slice(0, -1).map((_, i) => {
              const x1 = xPositions[i]
              const y1 = PADDING_TOP + i * ROW_GAP + NODE_HEIGHT / 2
              const x2 = xPositions[i + 1]
              const y2 = PADDING_TOP + (i + 1) * ROW_GAP + NODE_HEIGHT / 2
              return (
                <line
                  key={i}
                  x1={`${x1}%`}
                  y1={y1}
                  x2={`${x2}%`}
                  y2={y2}
                  stroke="#CBD5E1"
                  strokeWidth="3"
                  strokeDasharray="8 6"
                  strokeLinecap="round"
                />
              )
            })}
          </svg>

          {/* 세션 노드 */}
          {subject.sessions.map((session, i) => (
            <SessionNode
              key={session.number}
              session={session}
              x={xPositions[i]}
              y={PADDING_TOP + i * ROW_GAP}
              subjectId={subjectId}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
