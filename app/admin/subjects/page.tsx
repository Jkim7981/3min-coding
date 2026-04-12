// [C 추가 — A 영역] 과목별 수강생 현황 페이지 신규 생성.
// 기존 AdminBottomNav의 "자료 업로드" 탭을 "과목" 탭으로 교체하면서 연결되는 페이지.
// /api/admin/students (C가 만든 B 영역 API) 데이터를 과목별로 그룹핑해서 표시.
// 각 과목 카드에서 수강생 학습 현황 확인 + 자료 업로드 이동 가능.

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface StudentStat {
  student_id: string
  student_name: string
  student_email: string
  subject_id: string
  subject_name: string
  total_answered: number
  correct_rate: number
  last_answered: string | null
}

interface SubjectGroup {
  subject_id: string
  subject_name: string
  students: StudentStat[]
}

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/students')
      .then((r) => r.ok ? r.json() : [])
      .then((data: StudentStat[]) => {
        if (!Array.isArray(data)) return

        // 과목별 그룹핑
        const map = new Map<string, SubjectGroup>()
        data.forEach((s) => {
          if (!map.has(s.subject_id)) {
            map.set(s.subject_id, {
              subject_id: s.subject_id,
              subject_name: s.subject_name,
              students: [],
            })
          }
          map.get(s.subject_id)!.students.push(s)
        })
        setSubjects(Array.from(map.values()))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen px-5 pt-8 pb-24 gap-4">
        <h1 className="text-xl font-bold text-primary-dark">과목 관리</h1>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm h-24 animate-pulse bg-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-8 pb-24 gap-4">
      <h1 className="text-xl font-bold text-primary-dark">과목 관리</h1>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-sm text-gray-400">등록된 과목이 없습니다</p>
        </div>
      ) : (
        subjects.map((subject) => {
          const avgCorrect =
            subject.students.length > 0
              ? Math.round(
                  subject.students.reduce((sum, s) => sum + s.correct_rate, 0) /
                  subject.students.length
                )
              : 0
          const totalAnswered = subject.students.reduce((sum, s) => sum + s.total_answered, 0)
          const isExpanded = expandedId === subject.subject_id

          return (
            <div key={subject.subject_id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* 과목 헤더 */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : subject.subject_id)}
                className="w-full p-5 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {subject.subject_name[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{subject.subject_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    수강생 {subject.students.length}명 · 평균 정답률 {avgCorrect}% · 총 {totalAnswered}문제
                  </p>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 16 16" fill="none"
                  className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                >
                  <path d="M6 4l4 4-4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              {/* 펼쳐지는 학생 목록 + 업로드 버튼 */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {/* 학생 목록 */}
                  {subject.students.map((s) => (
                    <div
                      key={s.student_id}
                      className="flex items-center gap-3 px-5 py-3 border-b border-gray-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-gray-500">{s.student_name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">{s.student_name}</p>
                        <p className="text-xs text-gray-400">{s.total_answered}문제 풀이</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-primary">{s.correct_rate}%</p>
                        <p className="text-[10px] text-gray-400">정답률</p>
                      </div>
                    </div>
                  ))}

                  {/* 버튼 영역 */}
                  <div className="p-4 flex flex-col gap-2">
                    <Link
                      href={`/admin/upload?subjectId=${subject.subject_id}`}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-white text-sm font-bold"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 11V4M8 4L5 7M8 4l3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      수업 자료 업로드
                    </Link>
                    <Link
                      href={`/admin/questions?subjectId=${subject.subject_id}`}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white border border-primary text-primary text-sm font-bold"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="12" height="12" rx="2" stroke="#185FA5" strokeWidth="1.5" />
                        <path d="M4 6h8M4 9h8M4 12h5" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      문제 관리
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
