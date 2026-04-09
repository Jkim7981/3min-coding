import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/difficulty?subject_id=xxx - 학생별 과목별 현재 난이도 조회
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { searchParams } = new URL(req.url)
    const subject_id = searchParams.get('subject_id')

    // 최근 10문제 정답률 계산
    const { data, error } = await supabaseAdmin
      .from('user_answers')
      .select('is_correct')
      .eq('student_id', userId)
      .eq('subject_id', subject_id)
      .order('answered_at', { ascending: false })
      .limit(10)

    if (error) throw error

    // 데이터 없으면 기본값 medium
    if (!data || data.length === 0) {
      return NextResponse.json({ difficulty: 'medium' })
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
