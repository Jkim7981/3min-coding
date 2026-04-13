'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'

type NotifStatus = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

export default function SettingsPage() {
  const router = useRouter()
  const [notifStatus, setNotifStatus] = useState<NotifStatus>('loading')
  const [notifLoading, setNotifLoading] = useState(false)

  // 현재 알림 구독 상태 확인
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotifStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setNotifStatus('denied')
      return
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setNotifStatus(sub ? 'subscribed' : 'unsubscribed'))
      .catch(() => setNotifStatus('unsubscribed'))
  }, [])

  const handleNotifToggle = async () => {
    if (notifLoading) return
    setNotifLoading(true)

    try {
      const reg = await navigator.serviceWorker.ready

      if (notifStatus === 'subscribed') {
        // 구독 해제
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setNotifStatus('unsubscribed')
      } else {
        // 구독 등록
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setNotifStatus('denied')
          return
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })
        setNotifStatus('subscribed')
      }
    } catch {
      // 실패 시 상태 유지
    } finally {
      setNotifLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  const notifLabel: Record<NotifStatus, string> = {
    loading: '확인 중...',
    unsupported: '이 기기는 알림을 지원하지 않습니다',
    denied: '알림이 차단됨 (브라우저 설정에서 허용)',
    subscribed: '알림 켜짐 ✓',
    unsubscribed: '알림 꺼짐',
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-8">
      <h1 className="text-xl font-bold text-primary-dark mb-5">설정</h1>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* 알림 설정 */}
        <button
          onClick={handleNotifToggle}
          disabled={notifStatus === 'loading' || notifStatus === 'unsupported' || notifStatus === 'denied' || notifLoading}
          className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-sm text-gray-700">알림 설정</span>
            <span className="text-xs text-gray-400">{notifLabel[notifStatus]}</span>
          </div>
          {notifLoading ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
          ) : notifStatus === 'subscribed' ? (
            <div className="w-10 h-6 bg-primary rounded-full relative">
              <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
            </div>
          ) : (
            <div className="w-10 h-6 bg-gray-200 rounded-full relative">
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
            </div>
          )}
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
