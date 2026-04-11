import NextAuth from 'next-auth'
// frontend-usang: getServerSession에서 authOptions를 공유하기 위해 lib/authOptions.ts로 분리 후 import 추가
import { authOptions } from '@/lib/authOptions'

<<<<<<< HEAD
type SessionUser = {
  id: string
  role: 'student' | 'teacher'
}

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Supabase에서 사용자 조회
        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .single()

        if (error || !user || !user.password_hash) return null

        // 비밀번호 검증 (bcrypt)
        const isValid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && 'role' in user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as typeof session.user & SessionUser
        sessionUser.id = token.id
        sessionUser.role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
})
=======
const handler = NextAuth(authOptions)
>>>>>>> 864a28694a0ccc77f3168faf30465ff3e71f96a6

export { handler as GET, handler as POST }
