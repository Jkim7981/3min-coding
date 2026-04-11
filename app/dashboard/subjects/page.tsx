'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

// TODO: /api/subjects + /api/enrollments 연결 후 실제 데이터로 교체
const mockSubjects = [
  {
    id: 'python-basics',
    name: '파이썬 기초',
    tag: '파이썬',
    tagColor: 'bg-blue-500',
    currentSession: 3,
    totalSessions: 10,
    progress: 60,
    nextSession: '반복문 for/while',
  },
  {
    id: 'java-oop',
    name: '자바 객체지향',
    tag: '자바',
    tagColor: 'bg-orange-500',
    currentSession: 1,
    totalSessions: 8,
    progress: 30,
    nextSession: '클래스와 객체',
  },
  {
    id: 'js-basics',
    name: '자바스크립트 기초',
    tag: 'JS',
    tagColor: 'bg-yellow-500',
    currentSession: 0,
    totalSessions: 6,
    progress: 0,
    nextSession: '변수와 타입',
  },
]

export default function SubjectsPage() {
  const router = useRouter()

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

      {/* 과목 카드 목록 */}
      <div className="flex flex-col gap-3 px-5">
        {mockSubjects.map((subject) => (
          <Link
            key={subject.id}
            href={`/subjects/${subject.id}`}
            className="bg-white rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-transform block"
          >
            {/* 태그 + 이름 */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`${subject.tagColor} text-white text-xs font-bold px-2.5 py-1 rounded-lg`}>
                {subject.tag}
              </span>
              <span className="font-bold text-gray-800 text-base">{subject.name}</span>
            </div>

            {/* 진행 현황 */}
            <p className="text-xs text-gray-400 mb-3">
              {subject.currentSession > 0
                ? `${subject.currentSession}회차 진행중 · 총 ${subject.totalSessions}회차`
                : `총 ${subject.totalSessions}회차 · 시작 전`}
            </p>

            {/* 프로그레스 바 */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${subject.progress}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-primary w-8 text-right">
                {subject.progress}%
              </span>
            </div>

            {/* 다음 회차 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#9CA3AF" strokeWidth="1.2" />
                  <path d="M7 4v3.5l2 2" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                다음: {subject.nextSession}
              </div>
              <span className="text-xs text-primary font-semibold">로드맵 보기 →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
