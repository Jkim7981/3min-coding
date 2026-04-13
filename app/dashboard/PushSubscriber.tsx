'use client'

import { useEffect } from 'react'

export default function PushSubscriber() {
  useEffect(() => {
    async function subscribe() {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (existing) return
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })
      } catch {
        // 알림 구독 실패는 조용히 무시
      }
    }
    subscribe()
  }, [])
  return null
}
