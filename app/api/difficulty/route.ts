import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { checkSubjectAccess } from '@/lib/access'

// GET /api/difficulty?subject_id=xxx - 학생별 과목별 현재 난이도 조회
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const { searchParams } = new URL(req.url)
    const subject_id = searchParams.get('subject_id')

    if (!subject_id) {
      return NextResponse.json({ error: 'subject_id가 필요합니다' }, { status: 400 })
    }

    const hasAccess = await checkSubjectAccess(user.id, subject_id, user.role)
    if (!hasAccess) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 })
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('user_answers')
      .select('is_correct')
      .eq('student_id', user.id)
      .eq('subject_id', subject_id)
      .order('answered_at', { ascending: false })
      .limit(10)

    if (dbError) throw dbError

    if (!data || data.length === 0) {
      return NextResponse.json({ difficulty: 'medium', correct_rate: null })
    }

    const correctCount = data.filter((a) => a.is_correct).length
    const correctRate = correctCount / data.length

    let difficulty = 'medium'
    if (correctRate >= 0.8) difficulty = 'hard'
    else if (correctRate < 0.5) difficulty = 'easy'

    return NextResponse.json({ difficulty, correct_rate: correctRate })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
