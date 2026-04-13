import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendPushNotification } from '@/lib/push'
import type { PushSubscription } from 'web-push'

// GET /api/cron/daily-notify
// Vercel Cron이 매일 UTC 07:00 (한국시간 16:00)에 호출
// ※ Vercel Cron은 반드시 GET 요청을 사용함
export async function GET(req: NextRequest) {
  // Vercel Cron 인증 확인
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  try {
    // 모든 푸시 구독 조회
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, user_id, subscription')

    if (error) throw error
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, message: '구독자 없음' })
    }

    const payload = {
      title: '3분코딩 — 오늘의 문제 🔥',
      body: '오늘의 문제 5개가 준비됐어요! 3분 투자해보세요',
      url: '/dashboard',
    }

    let sent = 0
    let failed = 0
    const expiredIds: string[] = []

    await Promise.all(
      subscriptions.map(async (row) => {
        const result = await sendPushNotification(
          row.subscription as unknown as PushSubscription,
          payload
        )

        if (result.success) {
          sent++
        } else {
          failed++
          // 만료된 구독은 삭제 목록에 추가
          if (result.error === '410' || result.error === '404') {
            expiredIds.push(row.id)
          }
        }
      })
    )

    // 만료된 구독 일괄 삭제
    if (expiredIds.length > 0) {
      await supabaseAdmin.from('push_subscriptions').delete().in('id', expiredIds)
    }

    return NextResponse.json({ sent, failed, expired_removed: expiredIds.length })
  } catch (err) {
    console.error('[cron/daily-notify]', err)
    return NextResponse.json({ error: '알림 발송 중 오류가 발생했습니다' }, { status: 500 })
  }
}
