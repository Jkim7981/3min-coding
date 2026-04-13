import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from '@/components/Providers'
import Nav from '@/components/Nav'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: '3분코딩 — AI 기반 맞춤형 복습',
  description: '코딩 학원생을 위한 AI 맞춤형 복습 웹앱. 하루 3분으로 복습 완료.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '3분코딩',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#185FA5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">
        <Providers>
          <Nav />
          <main className="flex-1">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
          <footer className="border-t border-gray-100 bg-white py-6 text-center text-xs text-gray-400">
            © 2026 3분코딩 — KEG 바이브코딩 콘테스트 출품작
          </footer>
        </Providers>
      </body>
    </html>
  )
}
