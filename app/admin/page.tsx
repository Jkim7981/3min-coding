'use client'

// [C 추가 — A 영역] 학생별 학습 현황 섹션 추가.
// 기존 admin 페이지에 수업 자료 업로드, 문제 관리 메뉴만 있었음.
// /api/admin/students (C가 신규 생성한 B 영역 API)를 호출해 학생 현황을 표시.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

// [C 추가 — A 영역] 학생 현황 타입
interface StudentStat {
  student_id: string
  student_name: string
  student_email: string
  subject_id: string
  subject_name: string
  total_answered: number
  correct_rate: number
  last_answered: string | null
}

export default function AdminPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const name = session?.user?.name ?? '강사'

  // [C 추가 — A 영역] 학생 현황 데이터 상태
  const [studentStats, setStudentStats] = useState<StudentStat[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  // [C 추가 — A 영역] 컴포넌트 마운트 시 학생 현황 API 호출
  useEffect(() => {
    fetch('/api/admin/students')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (Array.isArray(data)) setStudentStats(data) })
      .catch(() => {})
      .finally(() => setLoadingStats(false))
  }, [])

  const menus = [
    {
      href: '/admin/upload',
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M14 18V8M14 8l-5 5M14 8l5 5" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 20v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      title: '수업 자료 업로드',
      desc: '수업 내용을 업로드하여 AI 문제를 생성합니다',
      color: 'bg-blue-50',
    },
    {
      href: '/admin/questions',
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="3" y="3" width="22" height="22" rx="4" stroke="#185FA5" strokeWidth="2" />
          <path d="M8 10h12M8 14h12M8 18h7" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      title: '문제 관리',
      desc: 'AI가 생성한 문제를 확인하고 관리합니다',
      color: 'bg-purple-50',
    },
  ]

  return (
    <div className="min-h-screen bg-primary-light">
      {/* 헤더 */}
      <div className="px-5 pt-10 pb-6 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">안녕하세요,</p>
          <h1 className="text-2xl font-bold text-primary-dark mt-0.5">{name} 강사님 👋</h1>
          <p className="text-sm text-gray-400 mt-1">오늘도 좋은 수업 되세요!</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1 p-1.5 rounded-xl hover:bg-white/60"
          aria-label="로그아웃"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          로그아웃
        </button>
      </div>

      {/* [C 추가 — A 영역] 학생별 학습 현황 섹션 */}
      <div className="px-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">학생 학습 현황</h2>
        {loadingStats ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm h-16 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : studentStats.length === 0 ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
            <p className="text-sm text-gray-400">수강 중인 학생이 없습니다</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {studentStats.map((s) => (
              <div key={`${s.student_id}-${s.subject_id}`} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{s.student_name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{s.student_name}</p>
                  <p className="text-xs text-gray-400 truncate">{s.subject_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-primary">{s.correct_rate}%</p>
                  <p className="text-xs text-gray-400">{s.total_answered}문제</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 메뉴 카드 */}
      <div className="px-5 flex flex-col gap-3">
        {menus.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="bg-white rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4"
          >
            <div className={`w-14 h-14 rounded-2xl ${m.color} flex items-center justify-center shrink-0`}>
              {m.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-base">{m.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{m.desc}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <path d="M6 4l4 4-4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
