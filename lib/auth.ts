import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
// frontend-usang: getServerSession이 JWT의 id/role 필드를 올바르게 읽도록 authOptions 전달
import { authOptions } from '@/lib/authOptions'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: 'student' | 'teacher'
}

// 인증 필수 route에서 세션 체크 + 유저 정보 반환
// 미인증 시 401 Response 반환 (throw 대신 { user, error } 패턴 사용)
export async function requireAuth(): Promise<
  { user: AuthUser; response: null } | { user: null; response: NextResponse }
> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      user: null,
      response: NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 }),
    }
  }

  return {
    user: session.user as AuthUser,
    response: null,
  }
}

// 강사 전용 route에서 사용
export async function requireTeacher(): Promise<
  { user: AuthUser; response: null } | { user: null; response: NextResponse }
> {
  const result = await requireAuth()
  if (result.response) return result

  if (result.user.role !== 'teacher') {
    return {
      user: null,
      response: NextResponse.json({ error: '강사만 접근할 수 있습니다' }, { status: 403 }),
    }
  }

  return result
}
