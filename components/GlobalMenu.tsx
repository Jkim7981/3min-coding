'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

const studentTabs = [
  {
    href: '/dashboard',
    label: '홈',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <path
          d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H14v-5h-4v5H4a1 1 0 01-1-1V9.5z"
          fill={active ? '#185FA5' : 'none'}
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/dashboard/stats',
    label: '통계',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="13" width="4" height="6" rx="1" fill={active ? '#185FA5' : '#9CA3AF'} />
        <rect x="9" y="8" width="4" height="11" rx="1" fill={active ? '#185FA5' : '#9CA3AF'} />
        <rect x="15" y="4" width="4" height="15" rx="1" fill={active ? '#185FA5' : '#9CA3AF'} />
      </svg>
    ),
  },
  {
    href: '/dashboard/report',
    label: '리포트',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <rect
          x="4" y="3" width="14" height="16" rx="2"
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
        />
        <path
          d="M7 8h8M7 12h8M7 16h5"
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: '/dashboard/notices',
    label: '공지사항',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <path
          d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.73 21a2 2 0 01-3.46 0"
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    label: '설정',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="3" stroke={active ? '#185FA5' : '#9CA3AF'} strokeWidth="1.8" />
        <path
          d="M11 2v2M11 18v2M2 11h2M18 11h2M4.22 4.22l1.42 1.42M16.36 16.36l1.42 1.42M4.22 17.78l1.42-1.42M16.36 5.64l1.42-1.42"
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

const teacherTabs = [
  {
    href: '/admin',
    label: '관리자 홈',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <path
          d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H14v-5h-4v5H4a1 1 0 01-1-1V9.5z"
          fill={active ? '#185FA5' : 'none'}
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/admin/upload',
    label: '자료 업로드',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <path
          d="M11 14V6M11 6l-4 4M11 6l4 4"
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 16v1a1 1 0 001 1h12a1 1 0 001-1v-1"
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: '/admin/questions',
    label: '문제 관리',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <rect
          x="4" y="3" width="14" height="16" rx="2"
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
        />
        <path
          d="M7 8h8M7 12h8M7 16h5"
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

export default function GlobalMenu() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // 비로그인 또는 로그인 페이지에서는 숨김
  if (status !== 'authenticated' || pathname === '/login') return null

  const role = (session?.user as any)?.role as string | undefined
  const tabs = role === 'teacher' ? teacherTabs : studentTabs

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return (
        pathname === '/dashboard' ||
        pathname.startsWith('/subjects') ||
        pathname.startsWith('/questions')
      )
    }
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    setOpen(false)
    await signOut({ redirect: false })
    router.push('/login')
  }

  return (
    <>
      {/* 햄버거 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-40 w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-md border border-gray-100 hover:bg-gray-50 transition-colors"
        aria-label="메뉴 열기"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="#374151"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* 백드롭 */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 드로어 */}
      <div
        className={[
          'fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-label="메뉴"
      >
        {/* 드로어 헤더 */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-gray-100">
          <span className="text-lg font-bold text-primary">3분코딩</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="메뉴 닫기"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="#374151"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* 유저 정보 */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span
              className={[
                'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                role === 'teacher'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-primary-light text-primary',
              ].join(' ')}
            >
              {role === 'teacher' ? '강사' : '학생'}
            </span>
            <span className="text-sm font-medium text-gray-700">{session.user?.name}</span>
          </div>
        </div>

        {/* 메뉴 항목 */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {tabs.map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setOpen(false)}
                className={[
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-light text-primary'
                    : 'text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                {tab.icon(active)}
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {/* 로그아웃 */}
        <div className="px-3 pb-8 border-t border-gray-100 pt-3">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M7 2H3a1 1 0 00-1 1v12a1 1 0 001 1h4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M12 13l4-4-4-4M16 9H7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            로그아웃
          </button>
        </div>
      </div>
    </>
  )
}
