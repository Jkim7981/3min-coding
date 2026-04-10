'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { UserRole } from '@/types'

type Tab = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      return
    }

    const session = await getSession()
    const role = (session?.user as any)?.role
    router.push(role === 'teacher' ? '/admin' : '/dashboard')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? '회원가입에 실패했습니다.')
        setLoading(false)
        return
      }

      // 가입 후 자동 로그인
      await signIn('credentials', { email, password, redirect: false })
      const session = await getSession()
      const userRole = (session?.user as any)?.role
      router.push(userRole === 'teacher' ? '/admin' : '/dashboard')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-light px-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-dark">3분코딩</h1>
          <p className="mt-2 text-gray-500 text-sm">AI 기반 맞춤형 복습 플랫폼</p>
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* 탭 */}
          <div className="flex border-b border-gray-100">
            {(['login', 'signup'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={[
                  'flex-1 py-4 text-sm font-semibold transition-colors',
                  tab === t
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-400 hover:text-gray-600',
                ].join(' ')}
              >
                {t === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>

          <div className="px-8 py-8">
            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <Input
                  id="email"
                  type="email"
                  label="이메일"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <Input
                  id="password"
                  type="password"
                  label="비밀번호"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full mt-1">
                  {loading ? '로그인 중...' : '로그인'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="flex flex-col gap-5">
                <Input
                  id="name"
                  type="text"
                  label="이름"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  id="signup-email"
                  type="email"
                  label="이메일"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <Input
                  id="signup-password"
                  type="password"
                  label="비밀번호"
                  placeholder="8자 이상 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />

                {/* 역할 선택 */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-gray-700">역할 선택</span>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    {([
                      { value: 'student', label: '학생', emoji: '📚' },
                      { value: 'teacher', label: '강사', emoji: '👩‍🏫' },
                    ] as { value: UserRole; label: string; emoji: string }[]).map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className={[
                          'flex flex-col items-center gap-1 rounded-xl border-2 py-4 text-sm font-semibold transition-all',
                          role === r.value
                            ? 'border-primary bg-primary-light text-primary'
                            : 'border-gray-200 text-gray-500 hover:border-primary-light',
                        ].join(' ')}
                      >
                        <span className="text-2xl">{r.emoji}</span>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full mt-1">
                  {loading ? '가입 중...' : '회원가입'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
