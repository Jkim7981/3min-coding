import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'

export default async function RootPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const role = (session.user as { role?: string })?.role
  if (role === 'teacher') {
    redirect('/admin')
  }

  redirect('/dashboard')
}
