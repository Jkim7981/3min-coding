import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role } = await req.json()

    if (!email || !password || !name || !role) {
      return NextResponse.json({ message: '모든 필드를 입력해주세요.' }, { status: 400 })
    }

    if (!['student', 'teacher'].includes(role)) {
      return NextResponse.json({ message: '올바른 역할을 선택해주세요.' }, { status: 400 })
    }

    // 이미 가입된 이메일 확인
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json({ message: '이미 사용 중인 이메일입니다.' }, { status: 409 })
    }

    // TODO: bcrypt로 비밀번호 해시 (현재는 평문 저장 — 개발 단계)
    const { error } = await supabaseAdmin.from('users').insert({
      email,
      name,
      role,
      password_hash: password, // TODO: bcrypt.hash(password, 10)
    })

    if (error) {
      console.error('signup error:', error)
      return NextResponse.json({ message: '회원가입에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ message: '회원가입 성공' }, { status: 201 })
  } catch (e) {
    console.error('signup exception:', e)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
