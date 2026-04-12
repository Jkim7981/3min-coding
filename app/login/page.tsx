'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

type Tab = 'login' | 'signup'

// 비밀번호 입력 + 눈 아이콘 토글
function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  minLength?: number
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-base placeholder:text-gray-400 transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'}
        >
          {show ? (
            // 눈 감은 아이콘
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            // 눈 뜬 아이콘
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [academyCode, setAcademyCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isValidEmail(email)) {
      setError('유효한 이메일 주소를 입력해주세요.')
      return
    }

    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      return
    }

    const session = await getSession()
    const role = (session?.user as { role?: string })?.role
    router.push(role === 'teacher' ? '/admin' : '/dashboard')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isValidEmail(email)) {
      setError('유효한 이메일 주소를 입력해주세요.')
      return
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, academy_code: academyCode }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '회원가입에 실패했습니다.')
        setLoading(false)
        return
      }

      await signIn('credentials', { email, password, redirect: false })
      const session = await getSession()
      const userRole = (session?.user as { role?: string })?.role
      router.push(userRole === 'teacher' ? '/admin' : '/dashboard')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    setError('')
    setConfirmPassword('')
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
                onClick={() => switchTab(t)}
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
            {/* 로그인 */}
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
                <PasswordField
                  id="login-password"
                  label="비밀번호"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                />
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full mt-1">
                  {loading ? '로그인 중...' : '로그인'}
                </Button>
              </form>
            ) : (
              /* 회원가입 */
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
                <PasswordField
                  id="signup-password"
                  label="비밀번호"
                  placeholder="6자 이상 입력하세요"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                  minLength={6}
                />
                <PasswordField
                  id="signup-confirm-password"
                  label="비밀번호 확인"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />
                <div className="flex flex-col gap-1">
                  <Input
                    id="academy-code"
                    type="text"
                    label="학원코드"
                    placeholder="담당 멘토에게 받은 코드 입력 (예: A4AD)"
                    value={academyCode}
                    onChange={(e) => setAcademyCode(e.target.value.toUpperCase())}
                    required
                    maxLength={4}
                  />
                  <p className="text-xs text-gray-400 mt-0.5 pl-1">
                    코드를 모르시면 담당 멘토에게 문의해주세요
                  </p>
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
