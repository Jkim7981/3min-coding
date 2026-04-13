export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-primary-light flex justify-center">
      <div className="w-full max-w-sm min-h-screen bg-primary-light pb-6 relative">
        {children}
      </div>
    </div>
  )
}
