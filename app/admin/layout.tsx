import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string })?.role

  if (!session || role !== 'teacher') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-primary-light flex justify-center">
      <div className="w-full max-w-sm min-h-screen bg-primary-light pb-6 relative">
        {children}
      </div>
    </div>
  )
}
