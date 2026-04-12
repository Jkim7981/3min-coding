// 커스텀 서비스워커: 푸시 알림 수신 처리
// next-pwa가 이 파일을 sw.js에 자동으로 병합함

declare const self: ServiceWorkerGlobalScope

// 푸시 알림 수신
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  const data = event.data.json() as {
    title: string
    body: string
    url?: string
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: 'daily-questions',
      renotify: true,
      data: { url: data.url ?? '/dashboard' },
    })
  )
})

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const url = (event.notification.data?.url as string) ?? '/dashboard'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // 이미 열려있는 탭이 있으면 포커스
        const existing = clients.find((c) => c.url.includes(self.location.origin))
        if (existing) {
          existing.focus()
          existing.navigate(url)
        } else {
          self.clients.openWindow(url)
        }
      })
  )
})
