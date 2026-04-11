<<<<<<< HEAD
import Link from 'next/link'
import dummyData from '@/data/dummy.json'
import { LogoMark } from '@/components/ui/logo-mark'

type SessionStatus = 'completed' | 'current' | 'preview' | 'locked'

const sessionStatusLabel: Record<SessionStatus, string> = {
  completed: '완료',
  current: '진행 중',
  preview: '예습',
  locked: '잠김',
}

const sessionStatusClassName: Record<SessionStatus, string> = {
  completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  current: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  preview: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  locked: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
}

const questionStatusLabel = {
  completed: '완료',
  review: '복습',
  current: '현재',
  preview: '예정',
  locked: '잠김',
} as const

const difficultyLabel = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
} as const

function getAverageAccuracy() {
  return Math.round(
    dummyData.subjects.reduce((sum, subject) => sum + subject.weeklyAccuracy, 0) /
      dummyData.subjects.length
  )
}

function getTotalQuestionCount() {
  return dummyData.subjects.reduce(
    (sum, subject) =>
      sum +
      subject.sessions.reduce((sessionSum, session) => sessionSum + session.questions.length, 0),
    0
  )
}

export default async function Home() {
  await new Promise((resolve) => setTimeout(resolve, 900))

  const averageAccuracy = getAverageAccuracy()
  const totalQuestions = getTotalQuestionCount()

  return (
    <main className="min-h-screen bg-[#f4f7f9] text-[#081217]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-[#081217] text-white shadow-[0_24px_90px_rgba(8,18,23,0.18)]">
          <div className="grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.28em] text-[#99f6e4]">
                <span className="h-2 w-2 rounded-full bg-[#2dd4bf]" />
                담당 C · T2-13 ~ T2-15
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[3.25rem] lg:leading-[1.05]">
                로딩 화면과 주간 차트, 수강 과목 카드가 포함된 기본 홈 대시보드
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                요청된 로딩 화면, 홈 퍼블리싱, 6회차와 회차당 5문제로 확장한 더미 데이터를
                한 화면에서 확인할 수 있도록 구성했습니다.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/7 p-4">
                  <p className="text-sm text-white/60">과목 수</p>
                  <p className="mt-2 text-3xl font-semibold">{dummyData.subjects.length}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/7 p-4">
                  <p className="text-sm text-white/60">회차 수</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {dummyData.subjects.reduce((sum, subject) => sum + subject.sessions.length, 0)}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/7 p-4">
                  <p className="text-sm text-white/60">문제 수</p>
                  <p className="mt-2 text-3xl font-semibold">{totalQuestions}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#7dd3fc]">
                    사용자 정보 카드
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold">{dummyData.user.name}</h2>
                  <p className="mt-1 text-sm text-white/60">
                    {dummyData.user.role} · {dummyData.user.cohort}
                  </p>
                </div>
                <LogoMark className="origin-top-right scale-[0.82]" />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white/8 px-3 py-4">
                  <p className="text-xs text-white/50">풀이 완료</p>
                  <p className="mt-2 text-2xl font-semibold">{dummyData.user.solvedCount}</p>
                </div>
                <div className="rounded-2xl bg-white/8 px-3 py-4">
                  <p className="text-xs text-white/50">전체 문제</p>
                  <p className="mt-2 text-2xl font-semibold">{dummyData.user.totalCount}</p>
                </div>
                <div className="rounded-2xl bg-white/8 px-3 py-4">
                  <p className="text-xs text-white/50">복습 대상</p>
                  <p className="mt-2 text-2xl font-semibold">{dummyData.user.reviewCount}</p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl bg-[#f4f7f9] p-5 text-slate-900">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
                  이번 주 목표
                </p>
                <p className="mt-2 text-xl font-semibold">{dummyData.user.goal}</p>
                <p className="mt-2 text-sm text-slate-600">
                  집중 학습 주제: {dummyData.user.focus}
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e_0%,#14b8a6_50%,#22d3ee_100%)]"
                    style={{ width: `${averageAccuracy}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-600">평균 정답률 {averageAccuracy}%</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-700">
                  주간 정답률
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  이번 주 정답률 차트
                </h2>
              </div>
              <div className="rounded-full bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700">
                최고치 {Math.max(...dummyData.weeklyAccuracy.map((point) => point.accuracy))}%
              </div>
            </div>

            <div className="mt-8 flex h-72 items-end gap-3 sm:gap-4">
              {dummyData.weeklyAccuracy.map((point) => (
                <div key={point.week} className="flex flex-1 flex-col items-center gap-3">
                  <div className="relative flex h-full w-full flex-1 items-end">
                    <div className="flex h-full w-full items-end rounded-t-[1.4rem] bg-slate-100">
                      <div
                        className="w-full min-h-[2.75rem] rounded-t-[1.4rem] bg-[linear-gradient(180deg,#0f766e_0%,#14b8a6_60%,#67e8f9_100%)] shadow-[0_12px_30px_rgba(20,184,166,0.25)]"
                        style={{ height: `${point.accuracy}%` }}
                      />
                    </div>
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-full bg-[#081217] px-3 py-1 text-xs font-semibold text-white">
                      {point.accuracy}%
                    </div>
                  </div>
                  <span className="text-center text-xs font-medium text-slate-500 sm:text-sm">
                    {point.week}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-[#f7f8fb] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">
              체크포인트
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              기본 화면 완성도 확인
            </h2>

            <div className="mt-6 space-y-4">
              {[
                'T2-13 로딩 화면 퍼블리싱',
                'T2-14 홈 대시보드 퍼블리싱',
                'T2-15 회차별 데이터 6회차',
                'T2-15 회차당 문제 5개 구성',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4"
                >
                  <span className="font-medium text-slate-700">{item}</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                    완료
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.6rem] bg-[#081217] p-5 text-white">
              <p className="text-xs uppercase tracking-[0.28em] text-[#5eead4]">포함 항목</p>
              <p className="mt-3 text-lg font-semibold">
                사용자 정보 카드, 차트, 수강 과목 카드, 확장된 학습 더미 데이터
              </p>
              <p className="mt-2 text-sm leading-7 text-white/65">
                홈 화면에서 동일한 더미 데이터를 사용해 실제 학습 진행 상황처럼 보이도록
                과목별 회차와 문제 구성을 연결했습니다.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">
                문제 화면
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                퍼블리싱된 문제 화면 열기
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                아래 링크에서 T3-12부터 T3-15까지 만든 개념 문제, 코딩 문제, 결과 화면을
                바로 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/questions/js-4-2"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#081217] px-5 text-sm font-semibold text-white transition hover:bg-[#12212d] active:bg-[#050b10]"
              >
                개념 문제
              </Link>
              <Link
                href="/questions/js-4-3"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 active:bg-slate-100"
              >
                코딩 문제
              </Link>
              <Link
                href="/questions/js-4-2/result"
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#99f6e4] px-5 text-sm font-semibold text-[#0f766e] transition hover:bg-[#ccfbf1] active:bg-[#99f6e4]"
              >
                결과 화면
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-700">
                수강 과목 카드
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                스타일링된 수강 과목 목록
              </h2>
            </div>
            <p className="text-sm text-slate-500">2개 과목 · 과목당 6회차 · 회차당 5문제</p>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {dummyData.subjects.map((subject) => (
              <article
                key={subject.id}
                className="overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]"
              >
                <div
                  className="px-6 py-6 text-white sm:px-7"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${subject.accent}, #081217)`,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                        수강 과목
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold">{subject.name}</h3>
                      <p className="mt-1 text-sm text-white/80">{subject.instructor}</p>
                    </div>
                    <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm">
                      주간 정답률 {subject.weeklyAccuracy}%
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/12 px-4 py-4">
                      <p className="text-xs text-white/70">진도율</p>
                      <p className="mt-2 text-2xl font-semibold">{subject.progress}%</p>
                    </div>
                    <div className="rounded-2xl bg-white/12 px-4 py-4">
                      <p className="text-xs text-white/70">연속 학습</p>
                      <p className="mt-2 text-2xl font-semibold">{subject.streak}일</p>
                    </div>
                    <div className="rounded-2xl bg-white/12 px-4 py-4">
                      <p className="text-xs text-white/70">다음 수업</p>
                      <p className="mt-2 text-sm font-semibold leading-6">{subject.nextLesson}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 px-6 py-6 sm:px-7">
                  {subject.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-[1.6rem] border border-slate-200 bg-[#fbfcfd] p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                            {session.round}회차
                          </p>
                          <h4 className="mt-2 text-lg font-semibold text-slate-900">
                            {session.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${sessionStatusClassName[session.status as SessionStatus]}`}
                          >
                            {sessionStatusLabel[session.status as SessionStatus]}
                          </span>
                          <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                            {session.accuracy > 0 ? `${session.accuracy}%` : '대기 중'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3">
                        {session.questions.map((question) => (
                          <div
                            key={question.id}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-base font-medium text-slate-800">
                                {question.title}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {question.type === 'concept' ? '개념 문제' : '코딩 문제'} ·{' '}
                                {
                                  difficultyLabel[
                                    question.difficulty as keyof typeof difficultyLabel
                                  ]
                                }
                              </p>
                            </div>
                            <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                              {
                                questionStatusLabel[
                                  question.status as keyof typeof questionStatusLabel
                                ]
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
=======
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'

export default async function RootPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const role = (session.user as { role?: string })?.role
  if (role === 'teacher') {
    redirect('/admin')
  }

  redirect('/dashboard')
>>>>>>> 864a28694a0ccc77f3168faf30465ff3e71f96a6
}
