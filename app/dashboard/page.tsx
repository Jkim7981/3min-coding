import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import type { AuthUser } from '@/lib/auth'
import SignOutButton from './SignOutButton'
import PushSubscriber from './PushSubscriber'

interface Subject {
  id: string
  name: string
  teacher_id: string
  created_at: string
}

interface DailyQuestion {
  id: string
  type: string
  difficulty: string
  question: string
  lesson_id: string
  lessons: { title: string; session_number: number } | null
}

interface DashboardData {
  subjects: Subject[]
  thisWeek: number
  streak: number
  daily: { new: DailyQuestion[]; review: DailyQuestion[]; total: number }
}

function toKSTDate(timestamp: string): string {
  return new Date(new Date(timestamp).getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

function calcStreak(timestamps: string[]): number {
  if (timestamps.length === 0) return 0
  const dates = [...new Set(timestamps.map(toKSTDate))].sort((a, b) => b.localeCompare(a))
  const today = toKSTDate(new Date().toISOString())
  const yesterday = toKSTDate(new Date(Date.now() - 86400000).toISOString())
  if (dates[0] !== today && dates[0] !== yesterday) return 0
  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000
    if (diff === 1) streak++
    else break
  }
  return streak
}

async function fetchDashboardData(user: AuthUser): Promise<DashboardData> {
  const userId = user.id

  if (user.role === 'teacher') {
    const { data } = await supabaseAdmin
      .from('subjects')
      .select('id, name, teacher_id, created_at')
      .eq('teacher_id', userId)
    return { subjects: data ?? [], thisWeek: 0, streak: 0, daily: { new: [], review: [], total: 0 } }
  }

  // 수강 과목 + 전체 답안 병렬 조회
  const [enrollmentResult, answersResult] = await Promise.all([
    supabaseAdmin
      .from('enrollments')
      .select('subject_id, subjects(id, name, teacher_id, created_at)')
      .eq('student_id', userId),
    supabaseAdmin
      .from('user_answers')
      .select('answered_at, question_id, is_correct, subject_id')
      .eq('student_id', userId)
      .order('answered_at', { ascending: false }),
  ])

  const enrollments = enrollmentResult.data ?? []
  const subjects = enrollments.map((e) => (e as any).subjects).filter(Boolean) as Subject[]
  const subjectIds = enrollments.map((e) => e.subject_id)
  const answers = answersResult.data ?? []

  // 이번 주 / 스트릭
  const mondayUTC = (() => {
    const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const monday = new Date(nowKST)
    monday.setUTCDate(nowKST.getUTCDate() - ((nowKST.getUTCDay() + 6) % 7))
    monday.setUTCHours(0, 0, 0, 0)
    return new Date(monday.getTime() - 9 * 60 * 60 * 1000)
  })()
  const thisWeek = answers.filter((a) => new Date(a.answered_at) >= mondayUTC).length
  const streak = calcStreak(answers.map((a) => a.answered_at))

  // 오늘의 문제
  let daily: DashboardData['daily'] = { new: [], review: [], total: 0 }

  if (subjectIds.length > 0) {
    const { data: lessons } = await supabaseAdmin
      .from('lessons')
      .select('id')
      .in('subject_id', subjectIds)

    const lessonIds = lessons?.map((l) => l.id) ?? []

    if (lessonIds.length > 0) {
      const answersInSubjects = answers.filter(
        (a) => a.subject_id && subjectIds.includes(a.subject_id)
      )
      const correctIds = new Set(answersInSubjects.filter((a) => a.is_correct).map((a) => a.question_id))
      const wrongIds = new Set(answersInSubjects.filter((a) => !a.is_correct).map((a) => a.question_id))
      const allAnsweredIds = new Set([...correctIds, ...wrongIds])

      const { data: allQuestions } = await supabaseAdmin
        .from('questions')
        .select('id, type, difficulty, question, lesson_id, lessons(title, session_number)')
        .in('lesson_id', lessonIds)
        .order('created_at', { ascending: true })

      const unsolved = (allQuestions ?? []).filter((q) => !allAnsweredIds.has(q.id))
      const newQuestions = unsolved.sort(() => Math.random() - 0.5).slice(0, 3) as unknown as DailyQuestion[]

      let reviewQuestions: DailyQuestion[] = []
      if (wrongIds.size > 0) {
        const wrongQList = (allQuestions ?? []).filter((q) => wrongIds.has(q.id))
        const wrongLessonIds = [...new Set(wrongQList.map((q) => q.lesson_id))]
        const newQIds = new Set(newQuestions.map((q) => q.id))
        const sameConceptUnsolved = (allQuestions ?? []).filter(
          (q) =>
            wrongLessonIds.includes(q.lesson_id) &&
            !allAnsweredIds.has(q.id) &&
            !newQIds.has(q.id)
        )
        if (sameConceptUnsolved.length >= 2) {
          reviewQuestions = sameConceptUnsolved.sort(() => Math.random() - 0.5).slice(0, 2) as unknown as DailyQuestion[]
        } else {
          const wrongList = wrongQList
            .filter((q) => !newQIds.has(q.id))
            .sort(() => Math.random() - 0.5)
          reviewQuestions = [
            ...sameConceptUnsolved,
            ...wrongList.slice(0, 2 - sameConceptUnsolved.length),
          ].slice(0, 2) as unknown as DailyQuestion[]
        }
      }

      daily = {
        new: newQuestions,
        review: reviewQuestions,
        total: newQuestions.length + reviewQuestions.length,
      }
    }
  }

  return { subjects, thisWeek, streak, daily }
}

const difficultyLabel = (d: string) =>
  d === 'easy' ? '쉬움' : d === 'hard' ? '어려움' : '보통'
const difficultyColor = (d: string) =>
  d === 'easy' ? 'text-green-500' : d === 'hard' ? 'text-red-500' : 'text-yellow-500'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const user = session.user as AuthUser
  const { subjects, thisWeek, streak, daily } = await fetchDashboardData(user)

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* 헤더 */}
      <div className="pt-4 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">안녕하세요!</p>
          <h1 className="text-2xl font-bold text-primary-dark mt-0.5">{user.name}님 👋</h1>
        </div>
        <SignOutButton />
      </div>

      {/* 오늘의 문제 */}
      <section className="bg-primary rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium opacity-80">매일 아침 9시</p>
            <p className="font-bold text-lg">오늘의 문제 🔥</p>
          </div>
          {daily.total > 0 && (
            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
              {daily.total}문제
            </span>
          )}
        </div>

        {daily.total > 0 ? (
          <div className="flex flex-col gap-2 mb-4">
            {daily.new.map((q, i) => (
              <Link
                key={q.id}
                href={`/questions/${q.id}`}
                className="bg-white/15 hover:bg-white/25 transition-colors rounded-xl px-3 py-2.5 flex items-center gap-2"
              >
                <span className="text-xs bg-white/20 rounded-md px-1.5 py-0.5 font-medium shrink-0">
                  새 문제 {i + 1}
                </span>
                <span className="text-sm font-medium truncate flex-1">{q.question}</span>
                <span className={`text-xs font-medium shrink-0 ${difficultyColor(q.difficulty)} bg-white/10 rounded px-1.5 py-0.5`}>
                  {difficultyLabel(q.difficulty)}
                </span>
              </Link>
            ))}
            {daily.review.map((q, i) => (
              <Link
                key={q.id}
                href={`/questions/${q.id}`}
                className="bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-3 py-2.5 flex items-center gap-2"
              >
                <span className="text-xs bg-yellow-400/30 text-yellow-100 rounded-md px-1.5 py-0.5 font-medium shrink-0">
                  복습 {i + 1}
                </span>
                <span className="text-sm font-medium truncate flex-1">{q.question}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white/10 rounded-xl px-4 py-3 mb-4 text-sm opacity-80">
            오늘의 문제를 모두 완료했어요! 🎉
          </div>
        )}

        <Link
          href="/dashboard/subjects"
          className="inline-flex items-center bg-white text-primary text-sm font-bold px-4 py-2.5 rounded-xl min-h-[44px]"
        >
          회차별 문제 보기 →
        </Link>
      </section>

      {/* 수강 과목 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-500">내 과목</h2>
        {subjects.length > 0 ? (
          subjects.slice(0, 2).map((subject) => (
            <Link
              key={subject.id}
              href={`/subjects/${subject.id}`}
              className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                  과목
                </span>
                <span className="font-bold text-gray-800">{subject.name}</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
            <p className="text-sm text-gray-400">수강 중인 과목이 없습니다</p>
          </div>
        )}
        <Link
          href="/dashboard/subjects"
          className="text-center text-sm text-primary font-medium py-2 min-h-[44px] flex items-center justify-center"
        >
          전체 과목 보기 →
        </Link>
      </section>

      {/* 학습 현황 */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">이번 주 풀이</p>
          <p className="text-2xl font-bold text-primary-dark">
            {thisWeek}
            <span className="text-sm font-normal text-gray-400 ml-1">문제</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">연속 학습</p>
          <p className="text-2xl font-bold text-primary-dark">
            {streak}
            <span className="text-sm font-normal text-gray-400 ml-1">일</span>
          </p>
        </div>
      </section>

      <PushSubscriber />
    </div>
  )
}
