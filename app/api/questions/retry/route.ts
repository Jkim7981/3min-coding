import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

// GET /api/questions/retry?subject_id=xxx - 틀린 문제 재출제
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const { searchParams } = new URL(req.url)
    const subject_id = searchParams.get('subject_id')

    let query = supabaseAdmin
      .from('user_answers')
      .select(
        `
        question_id,
        questions (
          id,
          type,
          difficulty,
          question,
          code_template,
          expected_output,
          hint,
          explanation
        )
      `
      )
      .eq('student_id', user.id)
      .eq('is_correct', false)

    if (subject_id) {
      query = query.eq('subject_id', subject_id)
    }

    const { data, error: dbError } = await query

    if (dbError) throw dbError

    // 나중에 정답 맞힌 question_id 목록 조회 (retry 후보에서 제외)
    let correctQuery = supabaseAdmin
      .from('user_answers')
      .select('question_id')
      .eq('student_id', user.id)
      .eq('is_correct', true)

    if (subject_id) {
      correctQuery = correctQuery.eq('subject_id', subject_id)
    }

    const { data: correctAnswers } = await correctQuery
    const correctIds = new Set((correctAnswers ?? []).map((a) => a.question_id))

    // 중복 제거 + 나중에 정답 맞힌 문제 제외
    const seen = new Set<string>()
    const unique = (data ?? []).filter((row) => {
      if (seen.has(row.question_id)) return false
      if (correctIds.has(row.question_id)) return false
      seen.add(row.question_id)
      return true
    })

    return NextResponse.json({
      questions: unique.map((row) => row.questions),
      count: unique.length,
    })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
