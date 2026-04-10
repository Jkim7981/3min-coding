import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

// POST /api/enrollments - 수강 등록
// 학생: { subject_id } → 본인 등록
// 강사: { subject_id, student_id } → 학생 등록
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const { subject_id, student_id } = await req.json()

    if (!subject_id) {
      return NextResponse.json({ error: 'subject_id가 필요합니다' }, { status: 400 })
    }

    // 과목 존재 여부 확인
    const { data: subject, error: sError } = await supabaseAdmin
      .from('subjects')
      .select('id, teacher_id')
      .eq('id', subject_id)
      .single()

    if (sError || !subject) {
      return NextResponse.json({ error: '과목을 찾을 수 없습니다' }, { status: 404 })
    }

    let targetStudentId: string

    if (user.role === 'teacher') {
      // 강사: 본인 과목에만 학생 등록 가능
      if (subject.teacher_id !== user.id) {
        return NextResponse.json({ error: '본인 과목에만 학생을 등록할 수 있습니다' }, { status: 403 })
      }
      if (!student_id) {
        return NextResponse.json({ error: '강사는 student_id가 필요합니다' }, { status: 400 })
      }
      // 등록할 학생이 실제로 존재하는지 확인
      const { data: student, error: stError } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('id', student_id)
        .single()

      if (stError || !student) {
        return NextResponse.json({ error: '학생을 찾을 수 없습니다' }, { status: 404 })
      }
      if (student.role !== 'student') {
        return NextResponse.json({ error: '학생 계정만 등록할 수 있습니다' }, { status: 400 })
      }
      targetStudentId = student_id
    } else {
      // 학생: 본인만 등록 가능
      targetStudentId = user.id
    }

    // 이미 수강 중인지 확인
    const { data: existing } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('student_id', targetStudentId)
      .eq('subject_id', subject_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: '이미 수강 중인 과목입니다' }, { status: 409 })
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('enrollments')
      .insert({ student_id: targetStudentId, subject_id })
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// DELETE /api/enrollments - 수강 취소
// Body: { subject_id } → 본인 수강 취소 (학생)
export async function DELETE(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const { subject_id } = await req.json()

    if (!subject_id) {
      return NextResponse.json({ error: 'subject_id가 필요합니다' }, { status: 400 })
    }

    const { error: dbError } = await supabaseAdmin
      .from('enrollments')
      .delete()
      .eq('student_id', user.id)
      .eq('subject_id', subject_id)

    if (dbError) throw dbError

    return NextResponse.json({ message: '수강 취소되었습니다' })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
