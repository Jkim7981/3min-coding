'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

// TODO: API 연결 후 실제 데이터로 교체
const mockSubjects = [
  {
    id: 'python-basics',
    name: '파이썬 기초',
    tag: '파이썬',
    currentSession: 3,
    totalSessions: 10,
    progress: 60,
  },
  {
    id: 'java-oop',
    name: '자바 객체지향',
    tag: '자바',
    currentSession: 1,
    totalSessions: 8,
    progress: 30,
  },
]

const mockStats = {
  todayQuestions: 8,
  streak: 7,
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? '학생'

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* 헤더 */}
      <div className="pt-4">
        <p className="text-sm text-gray-500">안녕하세요!</p>
        <h1 className="text-2xl font-bold text-primary-dark mt-0.5">{userName}님 홈 화면</h1>
      </div>

      {/* 수강 과목 카드 */}
      <section className="flex flex-col gap-3">
        {mockSubjects.map((subject) => (
          <Link
            key={subject.id}
            href={`/subjects/${subject.id}`}
            className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                {subject.tag}
              </span>
              <span className="font-bold text-gray-800">{subject.name}</span>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              {subject.currentSession}회차 진행중 · 총 {subject.totalSessions}회차
            </p>
            <div className="flex items-center gap-2">
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
          </Link>
        ))}

        <Link
          href="/dashboard/subjects"
          className="text-center text-sm text-primary font-medium py-2"
        >
          전체 과목 보기 →
        </Link>
      </section>

      {/* 학습 현황 */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">오늘 풀이</p>
          <p className="text-2xl font-bold text-primary-dark">
            {mockStats.todayQuestions}
            <span className="text-sm font-normal text-gray-400 ml-1">문제</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">연속 학습</p>
          <p className="text-2xl font-bold text-primary-dark">
            {mockStats.streak}
            <span className="text-sm font-normal text-gray-400 ml-1">일</span>
          </p>
        </div>
      </section>

      {/* 오늘의 문제 바로가기 */}
      <section className="bg-primary rounded-2xl p-5 text-white">
        <p className="text-sm font-medium opacity-80 mb-1">오늘의 문제</p>
        <p className="font-bold text-lg mb-3">3분 복습 시작할까요?</p>
        <Link
          href="/dashboard/subjects"
          className="inline-block bg-white text-primary text-sm font-bold px-4 py-2 rounded-xl"
        >
          문제 풀기 →
        </Link>
      </section>
    </div>
  )
}
