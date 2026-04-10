import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireTeacher } from '@/lib/auth'
import { checkSubjectAccess } from '@/lib/access'

// POST /api/sessions - 수업 자료 업로드 (강사)
// GET 목록 조회는 GET /api/subjects/[id]/sessions 사용
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireTeacher()
    if (response) return response

    const { subject_id, title, content, session_number } = await req.json()

    if (!subject_id || !title || !content) {
      return NextResponse.json({ error: 'subject_id, title, content는 필수입니다' }, { status: 400 })
    }

    const hasAccess = await checkSubjectAccess(user.id, subject_id, user.role)
    if (!hasAccess) {
      return NextResponse.json({ error: '본인 과목에만 자료를 업로드할 수 있습니다' }, { status: 403 })
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('lessons')
      .insert({ subject_id, title, content, session_number })
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
