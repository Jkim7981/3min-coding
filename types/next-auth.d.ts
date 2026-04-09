import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    id: string
    role: 'student' | 'teacher'
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'student' | 'teacher'
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'student' | 'teacher'
  }
}
