// [C 추가 — B 영역] 강사 대시보드용 학생별 학습 현황 API
// 강사가 담당하는 과목의 수강 학생별 정답률, 총 풀이 수를 반환.
// 기존 API에 없던 강사용 통계 엔드포인트를 신규 생성.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

// GET /api/admin/students - 강사 담당 과목별 학생 학습 현황
export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    if (user.role !== 'teacher') {
      return NextResponse.json({ error: '강사만 접근할 수 있습니다' }, { status: 403 })
    }

    // 1. 강사 담당 과목 조회
    const { data: subjects, error: sError } = await supabaseAdmin
      .from('subjects')
      .select('id, name')
      .eq('teacher_id', user.id)

    if (sError) throw sError
    if (!subjects || subjects.length === 0) {
      return NextResponse.json([])
    }

    const subjectIds = subjects.map((s) => s.id)

    // 2. 수강 학생 목록 조회
    const { data: enrollments, error: eError } = await supabaseAdmin
      .from('enrollments')
      .select('student_id, subject_id, users(id, name, email)')
      .in('subject_id', subjectIds)

    if (eError) throw eError
    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json([])
    }

    // 3. 학생별 과목별 답안 통계 조회
    const studentIds = [...new Set(enrollments.map((e) => e.student_id))]

    const { data: answers, error: aError } = await supabaseAdmin
      .from('user_answers')
      .select('student_id, subject_id, is_correct, answered_at')
      .in('student_id', studentIds)
      .in('subject_id', subjectIds)
      .order('answered_at', { ascending: false })

    if (aError) throw aError

    // 4. 학생별 과목별 집계
    const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s.name]))

    const result = enrollments.map((enrollment) => {
      const student = enrollment.users as unknown as { id: string; name: string; email: string } | null
      const studentAnswers = (answers ?? []).filter(
        (a) => a.student_id === enrollment.student_id && a.subject_id === enrollment.subject_id
      )

      const total = studentAnswers.length
      const correct = studentAnswers.filter((a) => a.is_correct).length
      const correctRate = total > 0 ? Math.round((correct / total) * 100) : 0
      const lastAnswered = studentAnswers[0]?.answered_at ?? null

      return {
        student_id: enrollment.student_id,
        student_name: student?.name ?? '이름 없음',
        student_email: student?.email ?? '',
        subject_id: enrollment.subject_id,
        subject_name: subjectMap[enrollment.subject_id] ?? '',
        total_answered: total,
        correct_rate: correctRate,
        last_answered: lastAnswered,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
