'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/admin',
    label: '홈',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
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
  // [C 수정 — A 영역] "자료 업로드" 탭 → "과목" 탭으로 변경.
  // 과목별 수강생 현황 + 업로드를 한 페이지에서 관리하도록 구조 개선.
  {
    href: '/admin/subjects',
    label: '과목',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect
          x="3" y="2" width="10" height="13" rx="1.5"
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
        />
        <rect
          x="9" y="7" width="10" height="13" rx="1.5"
          fill="white"
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
        />
        <path
          d="M12 11h4M12 14h4"
          stroke={active ? '#185FA5' : '#9CA3AF'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  // [C 수정 — A 영역] "문제 관리" 탭 → "설정" 탭으로 교체.
  // 문제 관리는 과목 탭 내부에서 접근 가능하므로 하단 바에서 제거.
  {
    href: '/admin/settings',
    label: '설정',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
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

export default function AdminBottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <nav aria-label="강사 하단 메뉴" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-white border-t border-gray-100 z-50">
      <div className="flex" role="tablist">
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
              className="flex flex-1 flex-col items-center gap-1 py-3 transition-colors focus-visible:outline-none focus-visible:bg-primary-light"
            >
              {tab.icon(active)}
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
