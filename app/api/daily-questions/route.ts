import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

// GET /api/daily-questions
// 오늘의 문제: 새 문제 3개 + 복습 문제 2개 (같은 회차에서 다른 문제)
export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const userId = user.id

    // 1. 수강 중인 과목 조회
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select('subject_id')
      .eq('student_id', userId)

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ new: [], review: [] })
    }

    const subjectIds = enrollments.map((e) => e.subject_id)

    // 2. 수강 과목의 lesson_id 목록 조회
    const { data: lessons } = await supabaseAdmin
      .from('lessons')
      .select('id')
      .in('subject_id', subjectIds)

    const lessonIds = lessons?.map((l) => l.id) ?? []
    if (lessonIds.length === 0) return NextResponse.json({ new: [], review: [] })

    // 3. 이미 푼 문제 조회 (정답 여부 포함)
    const { data: answers } = await supabaseAdmin
      .from('user_answers')
      .select('question_id, is_correct, attempt')
      .eq('student_id', userId)
      .in('subject_id', subjectIds)

    const correctIds = new Set(answers?.filter((a) => a.is_correct).map((a) => a.question_id) ?? [])
    const wrongIds = new Set(answers?.filter((a) => !a.is_correct).map((a) => a.question_id) ?? [])
    const allAnsweredIds = new Set([...correctIds, ...wrongIds])

    // 4. 새 문제 3개: 한 번도 안 푼 문제
    const { data: allQuestions } = await supabaseAdmin
      .from('questions')
      .select('id, type, difficulty, question, code_template, hint, lesson_id, lessons(subject_id, session_number, title)')
      .in('lesson_id', lessonIds)
      .order('created_at', { ascending: true })

    const unsolvedQuestions = (allQuestions ?? []).filter((q) => !allAnsweredIds.has(q.id))

    // 셔플해서 3개 선택
    const shuffled = unsolvedQuestions.sort(() => Math.random() - 0.5)
    const newQuestions = shuffled.slice(0, 3)

    // 5. 복습 문제 2개: 틀린 문제와 같은 lesson에서 아직 안 푼 다른 문제 선택
    //    없으면 원래 틀린 문제 자체를 복습 문제로 사용
    let reviewQuestions: typeof allQuestions = []

    if (wrongIds.size > 0) {
      // 틀린 문제들의 lesson_id 수집
      const wrongQuestions = (allQuestions ?? []).filter((q) => wrongIds.has(q.id))
      const wrongLessonIds = [...new Set(wrongQuestions.map((q) => q.lesson_id))]

      // 같은 lesson에서 아직 안 푼 문제 (틀린 문제 제외, 새 문제로 선택된 것도 제외)
      const newQuestionIds = new Set(newQuestions.map((q) => q.id))
      const sameConceptUnsolved = (allQuestions ?? []).filter(
        (q) =>
          wrongLessonIds.includes(q.lesson_id) &&
          !allAnsweredIds.has(q.id) &&
          !newQuestionIds.has(q.id)
      )

      if (sameConceptUnsolved.length >= 2) {
        reviewQuestions = sameConceptUnsolved.sort(() => Math.random() - 0.5).slice(0, 2)
      } else {
        // 같은 lesson에서 대체 문제가 부족하면 원래 틀린 문제를 복습으로
        const wrongList = wrongQuestions
          .filter((q) => !newQuestionIds.has(q.id))
          .sort(() => Math.random() - 0.5)

        reviewQuestions = [
          ...sameConceptUnsolved,
          ...wrongList.slice(0, 2 - sameConceptUnsolved.length),
        ].slice(0, 2)
      }
    }

    return NextResponse.json({
      new: newQuestions,
      review: reviewQuestions,
      total: newQuestions.length + reviewQuestions.length,
    })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
