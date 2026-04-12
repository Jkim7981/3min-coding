import dummyData from '@/data/dummy.json'

const difficultyLabel = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
} as const

const statusLabel = {
  completed: '완료',
  review: '복습',
  current: '진행 중',
  preview: '예습',
  locked: '잠김',
} as const

function getAllQuestions() {
  return dummyData.subjects.flatMap((subject) =>
    subject.sessions.flatMap((session) =>
      session.questions.map((question) => ({
        ...question,
        subjectName: subject.name,
        sessionTitle: session.title,
      }))
    )
  )
}

function getDifficultySummary() {
  const summary = {
    easy: 0,
    medium: 0,
    hard: 0,
  }

  for (const question of getAllQuestions()) {
    if (question.difficulty in summary) {
      summary[question.difficulty as keyof typeof summary] += 1
    }
  }

  return summary
}

function getStatusSummary() {
  const summary = {
    completed: 0,
    review: 0,
    current: 0,
    preview: 0,
    locked: 0,
  }

  for (const question of getAllQuestions()) {
    if (question.status in summary) {
      summary[question.status as keyof typeof summary] += 1
    }
  }

  return summary
}

function getSubjectAccuracy() {
  return dummyData.subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    accuracy: subject.weeklyAccuracy,
    progress: subject.progress,
    reviewCount: subject.sessions.reduce(
      (sum, session) => sum + session.questions.filter((question) => question.status === 'review').length,
      0
    ),
  }))
}

export default function StatsPage() {
  const questions = getAllQuestions()
  const difficultySummary = getDifficultySummary()
  const statusSummary = getStatusSummary()
  const subjectAccuracy = getSubjectAccuracy()
  const averageAccuracy = Math.round(
    dummyData.subjects.reduce((sum, subject) => sum + subject.weeklyAccuracy, 0) /
      dummyData.subjects.length
  )

  return (
    <main className="min-h-screen bg-[#f4f7f9] text-[#081217]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-[#081217] px-6 py-8 text-white shadow-[0_24px_90px_rgba(8,18,23,0.18)] sm:px-8 lg:px-10">
          <p className="text-xs uppercase tracking-[0.34em] text-[#5eead4]">
            담당 C · T4-11 통계 화면 퍼블리싱
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            학습 통계와 취약 영역을 한눈에 보는 대시보드
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
            과목별 정답률, 문제 분포, 복습 대상 현황을 카드와 차트 중심으로 정리해 UI 일관성을
            확인할 수 있도록 구성했습니다.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[1.8rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
              총 문제 수
            </p>
            <p className="mt-4 text-4xl font-semibold text-slate-900">{questions.length}</p>
            <p className="mt-3 text-sm text-slate-500">2개 과목 · 12회차 전체 기준</p>
          </article>

          <article className="rounded-[1.8rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
              평균 정답률
            </p>
            <p className="mt-4 text-4xl font-semibold text-slate-900">{averageAccuracy}%</p>
            <p className="mt-3 text-sm text-slate-500">이번 주 기준 과목 평균</p>
          </article>

          <article className="rounded-[1.8rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
              복습 대상
            </p>
            <p className="mt-4 text-4xl font-semibold text-slate-900">{statusSummary.review}</p>
            <p className="mt-3 text-sm text-slate-500">오답 또는 재확인이 필요한 문제</p>
          </article>

          <article className="rounded-[1.8rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-700">
              잠김 문제
            </p>
            <p className="mt-4 text-4xl font-semibold text-slate-900">{statusSummary.locked}</p>
            <p className="mt-3 text-sm text-slate-500">예습 전 단계 문제 수</p>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[2rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
                  과목별 성과
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  과목별 정답률과 진도율
                </h2>
              </div>
              <span className="rounded-full bg-[#ecfeff] px-4 py-2 text-sm font-medium text-cyan-700">
                주간 기준
              </span>
            </div>

            <div className="mt-8 space-y-6">
              {subjectAccuracy.map((subject) => (
                <div key={subject.id} className="rounded-[1.5rem] border border-slate-200 bg-[#fbfcfd] p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{subject.name}</p>
                      <p className="mt-1 text-sm text-slate-500">복습 대상 {subject.reviewCount}문제</p>
                    </div>
                    <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                      정답률 {subject.accuracy}%
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>정답률</span>
                        <span>{subject.accuracy}%</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#14b8a6,#67e8f9)]"
                          style={{ width: `${subject.accuracy}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>진도율</span>
                        <span>{subject.progress}%</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#1d4ed8,#3b82f6,#93c5fd)]"
                          style={{ width: `${subject.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
              문제 난이도 분포
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">학습 난이도 밸런스</h2>

            <div className="mt-8 space-y-5">
              {(Object.entries(difficultySummary) as Array<
                [keyof typeof difficultySummary, number]
              >).map(([difficulty, count]) => {
                const percent = Math.round((count / questions.length) * 100)

                return (
                  <div key={difficulty} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>{difficultyLabel[difficulty]}</span>
                      <span>
                        {count}문제 · {percent}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#081217,#0f766e,#67e8f9)]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 rounded-[1.5rem] bg-[#081217] p-5 text-white">
              <p className="text-xs uppercase tracking-[0.28em] text-[#5eead4]">취약 유형 분석</p>
              <div className="mt-4 grid gap-3">
                {(Object.entries(statusSummary) as Array<[keyof typeof statusSummary, number]>).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <span className="text-sm text-white/70">{statusLabel[status]}</span>
                      <span className="text-sm font-semibold text-white">{count}문제</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-[2rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
            최근 확인한 문제
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            화면 스타일 점검용 문제 리스트
          </h2>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {questions.slice(0, 6).map((question) => (
              <article
                key={question.id}
                className="rounded-[1.5rem] border border-slate-200 bg-[#fbfcfd] p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                    {question.subjectName}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    {statusLabel[question.status as keyof typeof statusLabel]}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{question.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{question.sessionTitle}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#ecfeff] px-3 py-1 text-xs font-semibold text-cyan-700">
                    {question.type === 'concept' ? '개념 문제' : '코딩 문제'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {
                      difficultyLabel[
                        question.difficulty as keyof typeof difficultyLabel
                      ]
                    }
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
