import { supabaseAdmin } from '@/lib/supabase'

// 학생: 수강 등록 여부 확인 / 강사: 과목 소유 여부 확인
export async function checkSubjectAccess(
  userId: string,
  subjectId: string,
  role: 'student' | 'teacher'
): Promise<boolean> {
  if (role === 'teacher') {
    const { data } = await supabaseAdmin
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .eq('teacher_id', userId)
      .single()
    return !!data
  } else {
    const { data } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('student_id', userId)
      .single()
    return !!data
  }
}
