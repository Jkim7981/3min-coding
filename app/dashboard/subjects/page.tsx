'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// [B 수정] 목 데이터 → 실제 API 연결.
// 기존: mockSubjects 배열에 id가 'python-basics' 같은 가짜 값이 하드코딩되어 있어서
// 카드를 누르면 /subjects/python-basics로 이동 → DB에 없는 id라서 "등록된 회차가 없습니다"만 뜸.
// 수정: /api/subjects로 실제 과목 목록을 불러온 뒤 실제 uuid를 href에 사용.

interface Subject {
  id: string
  name: string
}

export default function SubjectsPage() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSubjects(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-5 pt-8 pb-4">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full hover:bg-white/60 transition-colors"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-primary-dark">수강 과목</h1>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex justify-center mt-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {/* 과목 없음 */}
      {!loading && subjects.length === 0 && (
        <div className="flex flex-col items-center mt-20 gap-3 text-center px-5">
          <div className="text-4xl">📭</div>
          <p className="text-sm text-gray-500">수강 중인 과목이 없습니다</p>
          <p className="text-xs text-gray-400">강사에게 수강 등록을 요청해 주세요</p>
        </div>
      )}

      {/* 과목 카드 목록 */}
      <div className="flex flex-col gap-3 px-5">
        {subjects.map((subject) => (
          <Link
            key={subject.id}
            href={`/subjects/${subject.id}`}
            className="bg-white rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-transform block"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                과목
              </span>
              <span className="font-bold text-gray-800 text-base">{subject.name}</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">회차별 로드맵에서 학습을 시작하세요</span>
              <span className="text-xs text-primary font-semibold">로드맵 보기 →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
