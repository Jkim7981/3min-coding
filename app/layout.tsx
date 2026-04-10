import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '코리아IT 학습 대시보드',
  description: '코리아IT 학습 앱을 위한 디자인 에셋, 더미 데이터, 화면 가이드입니다.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
