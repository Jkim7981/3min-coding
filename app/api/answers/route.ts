import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/answers - 답안 제출
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { question_id, subject_id, answer, attempt } = await req.json()

    // 정답 조회
    const { data: question, error: qError } = await supabaseAdmin
      .from('questions')
      .select('answer')
      .eq('id', question_id)
      .single()

    if (qError || !question) {
      return NextResponse.json({ error: '문제를 찾을 수 없습니다' }, { status: 404 })
    }

    const is_correct = answer.trim() === question.answer.trim()

    // 답안 저장
    const { error } = await supabaseAdmin.from('user_answers').insert({
      student_id: userId,
      question_id,
      subject_id,
      attempt,
      answer,
      is_correct,
    })

    if (error) throw error

    return NextResponse.json({ is_correct, correct_answer: is_correct ? question.answer : null })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
