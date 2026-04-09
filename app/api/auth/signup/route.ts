import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/auth/signup - 회원가입
export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role = 'student' } = await req.json()

    // 입력값 검증
    if (!email || !password || !name) {
      return NextResponse.json({ error: '이메일, 비밀번호, 이름은 필수입니다' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다' }, { status: 400 })
    }

    if (!['student', 'teacher'].includes(role)) {
      return NextResponse.json({ error: '올바르지 않은 역할입니다' }, { status: 400 })
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

    // 비밀번호 해싱 (salt rounds: 12)
    const password_hash = await bcrypt.hash(password, 12)

    // 사용자 등록
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({ email, password_hash, name, role })
      .select('id, email, name, role, created_at')
      .single()

    if (error) throw error

    return NextResponse.json(
      {
        message: '회원가입이 완료됐습니다',
        user,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
