import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary-light px-4 text-center">
      <div className="mb-6 text-6xl font-extrabold text-primary opacity-30">404</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">페이지를 찾을 수 없어요</h1>
      <p className="text-gray-500 text-sm mb-8">
        주소가 잘못됐거나 삭제된 페이지예요.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
