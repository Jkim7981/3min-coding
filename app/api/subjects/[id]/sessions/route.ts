import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { checkSubjectAccess } from '@/lib/access'

// GET /api/subjects/[id]/sessions - 특정 과목의 수업 자료 목록 조회
// frontend-usang: Next.js 16에서 params가 Promise로 변경되어 타입 및 await 수정
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const { id: subjectId } = await params

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

    // 강사는 완료 여부 불필요 — 그대로 반환
    if (user.role === 'teacher') {
      return NextResponse.json(data)
    }

    // 학생: 회차별 완료 여부(is_completed) 추가
    // 해당 회차에 속한 문제에 답한 적 있으면 completed
    const lessonIds = (data ?? []).map((l) => l.id)

    if (lessonIds.length === 0) return NextResponse.json([])

    // 1. 학생이 답한 question_id 목록
    const { data: answeredData } = await supabaseAdmin
      .from('user_answers')
      .select('question_id')
      .eq('student_id', user.id)

    const answeredQIds = new Set((answeredData ?? []).map((a) => a.question_id))

    // 2. 해당 과목 회차들의 question → lesson_id 매핑
    const { data: questionLessons } = await supabaseAdmin
      .from('questions')
      .select('id, lesson_id')
      .in('lesson_id', lessonIds)

    // 3. 학생이 하나라도 답한 lesson_id 집합
    const completedLessonIds = new Set(
      (questionLessons ?? [])
        .filter((q) => answeredQIds.has(q.id))
        .map((q) => q.lesson_id)
    )

    const lessonsWithStatus = (data ?? []).map((lesson) => ({
      ...lesson,
      is_completed: completedLessonIds.has(lesson.id),
    }))

    return NextResponse.json(lessonsWithStatus)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
