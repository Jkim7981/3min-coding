import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      // /admin/* 은 강사만 접근 가능
      if (req.nextUrl.pathname.startsWith('/admin')) {
        return token?.role === 'teacher'
      }
      // /dashboard/* 은 로그인만 되면 접근 가능
      return !!token
    },
  },
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
