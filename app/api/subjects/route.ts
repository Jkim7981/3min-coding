import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

// GET /api/subjects - 내 과목 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    if (user.role === 'teacher') {
      // 강사: 내가 만든 과목 조회
      const { data, error: dbError } = await supabaseAdmin
        .from('subjects')
        .select('*')
        .eq('teacher_id', user.id)

      if (dbError) throw dbError
      return NextResponse.json(data)
    } else {
      // 학생: 수강 중인 과목 조회
      const { data, error: dbError } = await supabaseAdmin
        .from('enrollments')
        .select('subject_id, subjects(*)')
        .eq('student_id', user.id)

      if (dbError) throw dbError
      return NextResponse.json(data)
    }
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
