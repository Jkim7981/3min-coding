'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Button from './ui/Button'

const studentLinks = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/dashboard/subjects', label: '과목' },
  { href: '/dashboard/report', label: '리포트' },
]

const teacherLinks = [
  { href: '/admin', label: '관리자 홈' },
  { href: '/admin/upload', label: '자료 업로드' },
  { href: '/admin/questions', label: '문제 관리' },
]

export default function Nav() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  // 대시보드/과목 페이지는 모바일 바텀 네비 사용
  const mobileRoutes = ['/dashboard', '/subjects', '/admin']
  if (mobileRoutes.some((p) => pathname.startsWith(p))) return null

  const role = (session?.user as any)?.role as string | undefined
  const links = role === 'teacher' ? teacherLinks : studentLinks

  const isActive = (href: string) => pathname === href

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* 로고 */}
        <Link href={status === 'authenticated' ? (role === 'teacher' ? '/admin' : '/dashboard') : '/'}>
          <span className="text-xl font-bold text-primary">3분코딩</span>
        </Link>

        {/* 데스크탑 네비 */}
        {status === 'authenticated' && (
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-primary-light text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary',
                ].join(' ')}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* 우측: 유저 정보 or 로그인 버튼 */}
        <div className="hidden md:flex items-center gap-3">
          {status === 'authenticated' ? (
            <>
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
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                로그아웃
              </Button>
            </>
          ) : status === 'unauthenticated' ? (
            <Button variant="primary" size="sm" onClick={() => router.push('/login')}>
              로그인
            </Button>
          ) : null}
        </div>

        {/* 모바일 햄버거 */}
        <button
          className="md:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="메뉴 열기"
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M17 5L5 17M5 5l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* 모바일 드롭다운 */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1">
          {status === 'authenticated' && (
            <>
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={[
                    'rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    isActive(link.href)
                      ? 'bg-primary-light text-primary'
                      : 'text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2 border-gray-100" />
              <div className="flex items-center justify-between px-4 py-2">
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
                  <span className="text-sm text-gray-700">{session.user?.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  로그아웃
                </Button>
              </div>
            </>
          )}
          {status === 'unauthenticated' && (
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => { setMenuOpen(false); router.push('/login') }}
            >
              로그인
            </Button>
          )}
        </div>
      )}
    </header>
  )
}
