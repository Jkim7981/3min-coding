'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function AdminPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const name = session?.user?.name ?? '강사'

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
      <div className="px-5 pt-10 pb-6">
        <p className="text-sm text-gray-500">안녕하세요,</p>
        <h1 className="text-2xl font-bold text-primary-dark mt-0.5">{name} 강사님 👋</h1>
        <p className="text-sm text-gray-400 mt-1">오늘도 좋은 수업 되세요!</p>
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
