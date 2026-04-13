import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_MAILTO!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      urgency: 'high',  // FCM/APNs에 즉시 배달 요청 (기본값 normal은 수십 분 지연 가능)
      TTL: 3600,        // 기기 꺼져 있어도 1시간 내 재시도
    })
    return { success: true }
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode
    // 410 Gone = 구독 만료, 404 = 구독 없음 → 호출부에서 DB 삭제 처리
    return { success: false, error: String(statusCode ?? err) }
  }
}

export { webpush }
