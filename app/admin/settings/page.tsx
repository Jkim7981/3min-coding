// [C 추가 — A 영역] 강사용 설정 페이지.
// 학생용 /dashboard/settings와 동일한 구조로 생성.
'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function AdminSettingsPage() {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-8 pb-24">
      <h1 className="text-xl font-bold text-primary-dark mb-5">설정</h1>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 text-sm text-gray-700 hover:bg-gray-50">
          알림 설정
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
        <Link href="/privacy" className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 text-sm text-gray-700 hover:bg-gray-50">
          개인정보 처리방침
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </Link>
        <button className="w-full flex items-center justify-between px-5 py-4 text-sm text-gray-700 hover:bg-gray-50">
          버전 정보 v0.1.0
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="mt-6">
        <Button variant="ghost" size="md" className="w-full border-red-200 text-red-500 hover:bg-red-50" onClick={handleSignOut}>
          로그아웃
        </Button>
      </div>
    </div>
  )
}
