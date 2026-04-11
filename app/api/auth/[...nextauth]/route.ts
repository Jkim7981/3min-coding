import NextAuth from 'next-auth'
// frontend-usang: getServerSession에서 authOptions를 공유하기 위해 lib/authOptions.ts로 분리 후 import 추가
import { authOptions } from '@/lib/authOptions'


const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
