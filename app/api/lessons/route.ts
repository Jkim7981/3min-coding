import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/lessons - 수업 자료 업로드 (강사)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const role = (session.user as any).role
    if (role !== 'teacher') {
      return NextResponse.json({ error: '강사만 업로드할 수 있습니다' }, { status: 403 })
    }

    const { subject_id, title, content, session_number } = await req.json()

    const { data, error } = await supabaseAdmin
      .from('lessons')
      .insert({ subject_id, title, content, session_number })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// GET /api/lessons?subject_id=xxx - 수업 자료 목록 조회
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const subject_id = searchParams.get('subject_id')

    const { data, error } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('subject_id', subject_id)
      .order('session_number', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
