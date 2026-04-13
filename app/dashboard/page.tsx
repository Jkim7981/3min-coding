import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import type { AuthUser } from '@/lib/auth'
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
  is_done: boolean      // 완전히 끝남 (정답 or 2차 오답)
  is_correct: boolean   // 최종 정답 여부
}

// 날짜 + 유저 ID 기반 결정론적 셔플
// 같은 날 같은 유저에게는 항상 동일한 순서 → 대시보드 새로고침해도 목록 안 바뀜
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function calcDifficulty(answers: { is_correct: boolean }[]): 'easy' | 'medium' | 'hard' {
  if (answers.length === 0) return 'medium'
  const recent = answers.slice(0, 10)
  const rate = recent.filter((a) => a.is_correct).length / recent.length
  if (rate >= 0.8) return 'hard'
  if (rate < 0.5) return 'easy'
  return 'medium'
}

interface DashboardData {
  subjects: Subject[]
  thisWeek: number
  streak: number
  daily: { new: DailyQuestion[]; review: DailyQuestion[]; total: number }
  targetDifficulty: 'easy' | 'medium' | 'hard'
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
  // KST 날짜 기반 시드: 같은 날 같은 유저는 항상 동일한 문제 순서
  const kstToday = toKSTDate(new Date().toISOString())
  const dateSeed = parseInt(kstToday.replace(/-/g, ''), 10) // e.g. 20260413
  // 유저 ID(UUID) 앞 8자리를 16진수로 변환해 더함 → 유저마다 다른 조합
  const userSeed = parseInt(userId.replace(/-/g, '').slice(0, 8), 16) % 1000000
  const dailySeed = dateSeed + userSeed

  if (user.role === 'teacher') {
    const { data } = await supabaseAdmin
      .from('subjects')
      .select('id, name, teacher_id, created_at')
      .eq('teacher_id', userId)
    return { subjects: data ?? [], thisWeek: 0, streak: 0, daily: { new: [], review: [], total: 0 }, targetDifficulty: 'medium' as const }
  }

  // 수강 과목 + 전체 답안 병렬 조회
  const [enrollmentResult, answersResult] = await Promise.all([
    supabaseAdmin
      .from('enrollments')
      .select('subject_id, subjects(id, name, teacher_id, created_at)')
      .eq('student_id', userId),
    supabaseAdmin
      .from('user_answers')
      .select('answered_at, question_id, is_correct, subject_id, attempt')
      .eq('student_id', userId)
      .order('answered_at', { ascending: false }),
  ])

  const enrollments = enrollmentResult.data ?? []
  const subjects = enrollments.map((e) => (e as any).subjects).filter(Boolean) as Subject[]
  const subjectIds = enrollments.map((e) => e.subject_id)
  const answers = (answersResult.data ?? []) as {
    answered_at: string
    question_id: string
    is_correct: boolean
    subject_id: string | null
    attempt: number
  }[]

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
  // 적응형 난이도: 최근 10개 답안 기준으로 목표 난이도 계산 (return에서 재사용)
  const targetDifficulty = calcDifficulty(answers)

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
      // 완전히 끝난 오답: 2차 시도까지 마친 것 (attempt=2 & wrong) 또는 정답 처리된 것
      const attempt2WrongIds = new Set(
        answersInSubjects.filter((a) => !a.is_correct && a.attempt === 2).map((a) => a.question_id)
      )
      // doneIds: 완전히 완료된 문제 (정답 or 2차 오답)
      const doneIds = new Set([...correctIds, ...attempt2WrongIds])

      // 문제 목록 + SM-2 복습 스케줄 병렬 조회
      const [questionsResult, reviewScheduleResult] = await Promise.all([
        supabaseAdmin
          .from('questions')
          .select('id, type, difficulty, question, lesson_id, lessons(title, session_number)')
          .in('lesson_id', lessonIds)
          .order('created_at', { ascending: true }),
        supabaseAdmin
          .from('review_schedule')
          .select('question_id')
          .eq('student_id', userId)
          .lte('next_review_date', kstToday)  // 오늘 이전 복습 예정된 문제만
          .order('next_review_date', { ascending: true }),  // 오래된 것 우선
      ])

      const allQ = questionsResult.data ?? []
      // SM-2 기준 오늘 복습해야 할 question_id 집합
      const dueIds = new Set((reviewScheduleResult.data ?? []).map((s) => s.question_id))

      // 전체 문제 풀에서 목표 난이도 우선 선택 (answeredIds 제외 안 함 → 오늘 5문제 하루 종일 고정)
      const targetQ = allQ.filter((q) => q.difficulty === targetDifficulty)
      const otherQ = allQ.filter((q) => q.difficulty !== targetDifficulty)
      const newQuestions = [
        ...shuffleSeeded(targetQ, dailySeed),
        ...shuffleSeeded(otherQ, dailySeed + 1),
      ].slice(0, 3).map((q) => ({
        ...q,
        is_done: doneIds.has(q.id),
        is_correct: correctIds.has(q.id),
      })) as unknown as DailyQuestion[]

      let reviewQuestions: DailyQuestion[] = []
      if (dueIds.size > 0) {
        const newQIds = new Set(newQuestions.map((q) => q.id))
        // SM-2 스케줄 기준: 오늘 복습 예정 문제 중 새 문제와 겹치지 않는 것
        const reviewPool = shuffleSeeded(
          allQ.filter((q) => dueIds.has(q.id) && !newQIds.has(q.id)),
          dailySeed + 2
        ).slice(0, 2)
        reviewQuestions = reviewPool.map((q) => ({
          ...q,
          is_done: doneIds.has(q.id),
          is_correct: correctIds.has(q.id),
        })) as unknown as DailyQuestion[]
      }

      daily = {
        new: newQuestions,
        review: reviewQuestions,
        total: newQuestions.length + reviewQuestions.length,
      }
    }
  }

  return { subjects, thisWeek, streak, daily, targetDifficulty: calcDifficulty(answers) }
}

const difficultyLabel = (d: string) =>
  d === 'easy' ? '쉬움' : d === 'hard' ? '어려움' : '보통'
const difficultyColor = (d: string) =>
  d === 'easy' ? 'text-green-500' : d === 'hard' ? 'text-red-500' : 'text-yellow-500'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const user = session.user as AuthUser
  const { subjects, thisWeek, streak, daily, targetDifficulty } = await fetchDashboardData(user)

  const difficultyBadge = {
    easy: { label: '쉬움 단계', color: 'bg-green-400/30 text-green-100' },
    medium: { label: '보통 단계', color: 'bg-yellow-400/30 text-yellow-100' },
    hard: { label: '어려움 단계', color: 'bg-red-400/30 text-red-100' },
  }[targetDifficulty]

  // 오늘의 문제 전체 ID 목록 (순서 고정 — 클릭 시점에 URL로 확정)
  const allDailyQuestions = [...daily.new, ...daily.review]
  const allDailyIds = allDailyQuestions.map((q) => q.id).join(',')
  const allDone = daily.total > 0 && allDailyQuestions.every((q) => q.is_done)
  const wrongDailyQuestions = allDailyQuestions.filter((q) => q.is_done && !q.is_correct)

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* 헤더 (우측 햄버거 버튼 공간 확보) */}
      <div className="pt-4 pr-12">
        <p className="text-sm text-gray-500">안녕하세요!</p>
        <h1 className="text-2xl font-bold text-primary-dark mt-0.5">{user.name}님 👋</h1>
      </div>

      {/* 오늘의 문제 */}
      <section className="bg-primary rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium opacity-80">매일 아침 9시</p>
            <p className="font-bold text-lg">오늘의 문제 🔥</p>
          </div>
          <div className="flex items-center gap-2">
            {user.role === 'student' && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${difficultyBadge.color}`}>
                {difficultyBadge.label}
              </span>
            )}
            {daily.total > 0 && (
              <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                {daily.total}문제
              </span>
            )}
          </div>
        </div>

        {allDone ? (
          /* ── 전체 완료 화면 ── */
          <div className="mb-4">
            <div className="bg-white/15 rounded-xl px-4 py-4 mb-3 text-center">
              <p className="text-2xl mb-1">🎉</p>
              <p className="font-bold text-base">오늘의 문제를 모두 완료했어요!</p>
              <p className="text-xs opacity-70 mt-1">내일 새로운 문제가 기다리고 있어요</p>
            </div>
            {wrongDailyQuestions.length > 0 && (
              <div>
                <p className="text-xs font-semibold opacity-70 mb-2 px-1">틀린 문제 다시 보기</p>
                <div className="flex flex-col gap-2">
                  {wrongDailyQuestions.map((q) => (
                    <Link
                      key={q.id}
                      href={`/questions/${q.id}?ids=${allDailyIds}`}
                      className="bg-red-400/20 hover:bg-red-400/30 transition-colors rounded-xl px-3 py-2.5 flex items-center gap-2"
                    >
                      <span className="text-xs bg-red-400/30 text-red-100 rounded-md px-1.5 py-0.5 font-medium shrink-0">
                        오답
                      </span>
                      <span className="text-sm font-medium truncate flex-1">{q.question}</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 opacity-60">
                        <path d="M5 2l5 5-5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : daily.total > 0 ? (
          /* ── 진행 중 문제 목록 ── */
          <div className="flex flex-col gap-2 mb-4">
            {daily.new.map((q, i) => (
              <Link
                key={q.id}
                href={`/questions/${q.id}?ids=${allDailyIds}`}
                className={`transition-colors rounded-xl px-3 py-2.5 flex items-center gap-2 ${
                  q.is_done ? 'bg-white/8 opacity-60' : 'bg-white/15 hover:bg-white/25'
                }`}
              >
                <span className="text-xs bg-white/20 rounded-md px-1.5 py-0.5 font-medium shrink-0">
                  새 문제 {i + 1}
                </span>
                <span className="text-sm font-medium truncate flex-1">{q.question}</span>
                {q.is_done ? (
                  <span className="text-xs font-bold text-green-300 shrink-0">✓</span>
                ) : (
                  <span className={`text-xs font-medium shrink-0 ${difficultyColor(q.difficulty)} bg-white/10 rounded px-1.5 py-0.5`}>
                    {difficultyLabel(q.difficulty)}
                  </span>
                )}
              </Link>
            ))}
            {daily.review.map((q, i) => (
              <Link
                key={q.id}
                href={`/questions/${q.id}?ids=${allDailyIds}`}
                className={`transition-colors rounded-xl px-3 py-2.5 flex items-center gap-2 ${
                  q.is_done ? 'bg-white/8 opacity-60' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <span className="text-xs bg-yellow-400/30 text-yellow-100 rounded-md px-1.5 py-0.5 font-medium shrink-0">
                  복습 {i + 1}
                </span>
                <span className="text-sm font-medium truncate flex-1">{q.question}</span>
                {q.is_done && (
                  <span className="text-xs font-bold text-green-300 shrink-0">✓</span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white/10 rounded-xl px-4 py-3 mb-4 text-sm opacity-80">
            오늘의 문제가 없어요. 수강 중인 과목을 확인해보세요.
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
