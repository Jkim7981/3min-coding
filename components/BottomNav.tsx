'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/dashboard',
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
  {
    href: '/dashboard/stats',
    label: '통계',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
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
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect
          x="4"
          y="3"
          width="14"
          height="16"
          rx="2"
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
    href: '/dashboard/settings',
    label: '설정',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy='11' r="3" stroke={active ? '#185FA5' : '#9CA3AF'} strokeWidth="1.8" />
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

export default function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav aria-label="하단 메뉴" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-white border-t border-gray-100 z-50">
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
              <span className={`text-xs font-medium ${active ? 'text-primary' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
