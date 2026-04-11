import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { checkSubjectAccess } from '@/lib/access'

// GET /api/sessions/[id]/questions - 특정 회차의 문제 목록 조회
// frontend-usang: Next.js 16에서 params가 Promise로 변경되어 타입 및 await 수정
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const { id: lessonId } = await params

    // lesson 조회해서 subject_id 확인 (접근 권한 체크용)
    const { data: lesson, error: lError } = await supabaseAdmin
      .from('lessons')
      .select('subject_id')
      .eq('id', lessonId)
      .single()

    if (lError || !lesson) {
      return NextResponse.json({ error: '회차를 찾을 수 없습니다' }, { status: 404 })
    }

    const hasAccess = await checkSubjectAccess(user.id, lesson.subject_id, user.role)
    if (!hasAccess) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 })
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('questions')
      .select('id, type, difficulty, question, code_template, expected_output, hint, concept_tags, created_at')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true })

    if (dbError) throw dbError

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
