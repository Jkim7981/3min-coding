import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireTeacher } from '@/lib/auth'
import { checkSubjectAccess } from '@/lib/access'
import { getAcademyCurriculum } from '@/lib/academyData'

// POST /api/sessions - 수업 자료 업로드 (강사)
// GET 목록 조회는 GET /api/subjects/[id]/sessions 사용
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireTeacher()
    if (response) return response

    const { subject_id, title, content, session_number, scheduled_date } = await req.json()

    if (!subject_id || !title || !content) {
      return NextResponse.json({ error: 'subject_id, title, content는 필수입니다' }, { status: 400 })
    }

    const hasAccess = await checkSubjectAccess(user.id, subject_id, user.role)
    if (!hasAccess) {
      return NextResponse.json({ error: '본인 과목에만 자료를 업로드할 수 있습니다' }, { status: 403 })
    }

    // 현재 과목의 기존 회차 조회 (순서 검증용)
    const { data: existingSessions, error: sessionFetchError } = await supabaseAdmin
      .from('lessons')
      .select('session_number')
      .eq('subject_id', subject_id)
      .order('session_number', { ascending: false })

    if (sessionFetchError) throw sessionFetchError

    const maxSessionNumber =
      existingSessions && existingSessions.length > 0
        ? Math.max(...existingSessions.map((s) => s.session_number ?? 0))
        : 0
    const expectedNextSession = maxSessionNumber + 1

    // 회차 번호 검증: 반드시 (마지막 회차 + 1) 이어야 함
    if (session_number !== expectedNextSession) {
      return NextResponse.json(
        {
          error: `회차 번호가 올바르지 않습니다. ${expectedNextSession}회차부터 업로드해야 합니다.`,
          expected_session_number: expectedNextSession,
        },
        { status: 400 }
      )
    }

    // 학원 커리큘럼 최대 회차 검증
    const { data: subjectData } = await supabaseAdmin
      .from('subjects')
      .select('name')
      .eq('id', subject_id)
      .single()

    if (subjectData) {
      const curriculum = getAcademyCurriculum(subjectData.name)
      if (curriculum && session_number > curriculum.totalSessions) {
        return NextResponse.json(
          {
            error: `${subjectData.name} 과목은 최대 ${curriculum.totalSessions}회차까지 등록 가능합니다.`,
          },
          { status: 400 }
        )
      }
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('lessons')
      .insert({
        subject_id,
        title,
        content,
        session_number,
        // scheduled_date가 없으면 null → 즉시 오픈 (하위 호환)
        scheduled_date: scheduled_date || null,
      })
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
