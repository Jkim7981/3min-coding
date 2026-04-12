import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

// POST /api/push/subscribe - 푸시 구독 저장
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const subscription = await req.json()

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: '유효하지 않은 구독 정보입니다' }, { status: 400 })
    }

    // upsert: 같은 endpoint면 덮어씀
    const { error } = await supabaseAdmin.from('push_subscriptions').upsert(
      { user_id: user.id, subscription },
      { onConflict: 'user_id,endpoint' }
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '구독 저장에 실패했습니다' }, { status: 500 })
  }
}

// DELETE /api/push/subscribe - 푸시 구독 해제
export async function DELETE(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const { endpoint } = await req.json()

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint가 필요합니다' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('subscription->>endpoint', endpoint)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '구독 해제에 실패했습니다' }, { status: 500 })
  }
}
