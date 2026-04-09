// 앱 시작 시 필수 환경변수 존재 여부 검증
// 누락된 환경변수가 있으면 런타임 오류 대신 즉시 에러 발생
const REQUIRED_ENV_VARS = [
  'OPENAI_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXTAUTH_SECRET',
] as const

REQUIRED_ENV_VARS.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`[환경변수 누락] ${key}가 설정되지 않았습니다. .env.local을 확인하세요.`)
  }
})

export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
} as const
