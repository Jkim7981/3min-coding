'use client'

// [C 수정 — A 영역] 학생 학습 현황 섹션 및 수업 자료 업로드 카드 제거.
// 과목 탭(/admin/subjects)으로 기능이 통합되어 홈에서 중복 제거.
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function AdminPage() {
  const { data: session } = useSession()
  const name = session?.user?.name ?? '강사'

  const menus = [
    {
      href: '/admin/subjects',
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="3" y="4" width="16" height="20" rx="2" stroke="#185FA5" strokeWidth="2" strokeLinejoin="round" />
          <path d="M7 9h8M7 13h8M7 17h5" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" />
          <circle cx="22" cy="22" r="4" fill="#185FA5" />
          <path d="M20.5 22h3M22 20.5v3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      title: '과목',
      desc: '수강생 현황 확인 및 수업 자료를 업로드합니다',
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
