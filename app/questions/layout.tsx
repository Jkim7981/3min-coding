import BottomNav from '@/components/BottomNav'

export default function QuestionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-primary-light flex justify-center">
      <div className="w-full max-w-sm min-h-screen bg-primary-light pb-20 relative">
        {children}
        <BottomNav />
      </div>
    </div>
  )
}
