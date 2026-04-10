import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { checkSubjectAccess } from '@/lib/access'

// GET /api/subjects/[id]/sessions - 특정 과목의 수업 자료 목록 조회
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const subjectId = params.id

    const hasAccess = await checkSubjectAccess(user.id, subjectId, user.role)
    if (!hasAccess) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 })
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('subject_id', subjectId)
      .order('session_number', { ascending: true })

    if (dbError) throw dbError

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
