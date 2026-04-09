import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/subjects - 내 과목 목록 조회
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role

    if (role === 'teacher') {
      // 강사: 내가 만든 과목 조회
      const { data, error } = await supabaseAdmin
        .from('subjects')
        .select('*')
        .eq('teacher_id', userId)

      if (error) throw error
      return NextResponse.json(data)
    } else {
      // 학생: 수강 중인 과목 조회
      const { data, error } = await supabaseAdmin
        .from('enrollments')
        .select('subject_id, subjects(*)')
        .eq('student_id', userId)

      if (error) throw error
      return NextResponse.json(data)
    }
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
