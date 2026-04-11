import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { ACADEMY_CURRICULUM } from '@/lib/academyData'

// POST /api/auth/signup - 회원가입
export async function POST(req: NextRequest) {
  try {
    const { email, password, name, academy_code } = await req.json()

    // 입력값 검증
    if (!email || !password || !name || !academy_code) {
      return NextResponse.json(
        { error: '이름, 이메일, 비밀번호, 학원코드는 모두 필수입니다' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다' }, { status: 400 })
    }

    // ── 학원코드 검증 ──────────────────────────────
    const { data: member, error: memberError } = await supabaseAdmin
      .from('academy_members')
      .select('id, name, role, used')
      .eq('code', academy_code.trim().toUpperCase())
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: '유효하지 않은 학원코드입니다' }, { status: 400 })
    }

    if (member.used) {
      return NextResponse.json({ error: '이미 사용된 학원코드입니다' }, { status: 400 })
    }

    // 이름 일치 확인 (공백 제거 후 비교)
    const normalize = (s: string) => s.trim().replace(/\s+/g, '')
    if (normalize(member.name) !== normalize(name)) {
      return NextResponse.json(
        { error: '학원코드와 이름이 일치하지 않습니다. 담당 멘토에게 확인해주세요' },
        { status: 400 }
      )
    }

    // 이메일 중복 확인
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다' }, { status: 409 })
    }

    // ── 사용자 생성 (role은 코드에서 자동 결정) ───────
    const password_hash = await bcrypt.hash(password, 12)
    const role = member.role

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({ email, password_hash, name, role })
      .select('id, email, name, role')
      .single()

    if (userError || !user) throw userError

    // ── 담당/수강 과목 자동 연결 ───────────────────
    const { data: memberSubjects } = await supabaseAdmin
      .from('academy_member_subjects')
      .select('subject_name')
      .eq('member_id', member.id)

    const subjectNames = memberSubjects?.map((s) => s.subject_name) ?? []

    if (role === 'teacher') {
      // 강사: 과목 자동 생성 + 커리큘럼 연결
      for (const subjectName of subjectNames) {
        const { data: newSubject } = await supabaseAdmin
          .from('subjects')
          .insert({ name: subjectName, teacher_id: user.id })
          .select('id')
          .single()

        if (newSubject) {
          const curriculum = ACADEMY_CURRICULUM.find((c) => c.name === subjectName)
          if (curriculum) {
            await supabaseAdmin.from('academy_curriculum').insert({
              subject_id: newSubject.id,
              total_sessions: curriculum.totalSessions,
              description: curriculum.description,
            })
          }
        }
      }
    } else {
      // 학생: 과목명으로 subjects 조회 후 enrollments 생성
      // academy_curriculum에 등록된 과목(정식 등록 과목)을 우선, 없으면 최신 과목
      for (const subjectName of subjectNames) {
        const { data: subjects } = await supabaseAdmin
          .from('subjects')
          .select('id')
          .eq('name', subjectName)
          .order('created_at', { ascending: false })
          .limit(1)

        const subject = subjects?.[0]
        if (subject) {
          // 이미 등록된 enrollment면 무시 (upsert)
          await supabaseAdmin
            .from('enrollments')
            .upsert(
              { student_id: user.id, subject_id: subject.id },
              { onConflict: 'student_id,subject_id', ignoreDuplicates: true }
            )
        }
      }
    }

    // ── 코드 사용 처리 ────────────────────────────
    await supabaseAdmin
      .from('academy_members')
      .update({ used: true })
      .eq('id', member.id)

    return NextResponse.json(
      { message: '회원가입이 완료됐습니다', user },
      { status: 201 }
    )
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
