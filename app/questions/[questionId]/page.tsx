import Link from 'next/link'
import { notFound } from 'next/navigation'
import { HintModal } from '@/components/questions/hint-modal'
import { getQuestionById } from '@/lib/mock-learning'

const difficultyLabel = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
} as const

export default async function QuestionPage(props: PageProps<'/questions/[questionId]'>) {
  const { questionId } = await props.params
  const question = getQuestionById(questionId)

  if (!question) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#f4f7f9] text-[#081217]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
        <section className="rounded-[2rem] bg-[#081217] px-6 py-8 text-white shadow-[0_24px_90px_rgba(8,18,23,0.18)] sm:px-8">
          <p className="text-xs uppercase tracking-[0.34em] text-[#5eead4]">
            {question.type === 'concept' ? 'T3-12 개념 문제 화면' : 'T3-13 코딩 문제 화면'}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {question.title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/70">
            {question.subjectName} · {question.round}회차 · {question.sessionTitle}
          </p>
        </section>

        <section className="rounded-[2rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#ccfbf1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#0f766e]">
              {question.type === 'concept' ? '개념 문제' : '코딩 문제'}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              난이도 {difficultyLabel[question.difficulty as keyof typeof difficultyLabel]}
            </span>
          </div>

          <p className="mt-6 text-lg leading-8 text-slate-800">{question.prompt}</p>

          {question.type === 'concept' ? (
            <div className="mt-8 grid gap-4">
              {question.choices?.map((choice, index) => (
                <label
                  key={choice}
                  className="flex cursor-pointer items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-[#fbfcfd] px-5 py-4 transition hover:border-teal-300 hover:bg-[#f0fdfa]"
                >
                  <input
                    type="radio"
                    name="concept-answer"
                    className="mt-1 h-4 w-4 accent-teal-600"
                  />
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      선택지 {index + 1}
                    </p>
                    <p className="mt-2 text-base font-medium text-slate-800">{choice}</p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              <div className="overflow-hidden rounded-[1.75rem] bg-[#081217] text-white shadow-[0_18px_50px_rgba(8,18,23,0.18)]">
                <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
                  <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
                  <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
                  <span className="h-3 w-3 rounded-full bg-[#10b981]" />
                  <span className="ml-3 text-xs uppercase tracking-[0.26em] text-white/55">
                    코드 블록
                  </span>
                </div>
                <pre className="overflow-x-auto px-5 py-6 text-sm leading-7 text-[#dbeafe]">
                  <code>{question.codeBlock}</code>
                </pre>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fbfcfd] p-5">
                <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {question.blankLabel}
                </label>
                <input
                  type="text"
                  placeholder="빈칸에 들어갈 코드만 입력하세요"
                  className="mt-3 h-12 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-teal-400"
                />
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={`/questions/${question.id}/result`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f766e,#14b8a6)] px-6 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,118,110,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(15,118,110,0.28)] active:translate-y-0"
            >
              <span>{question.type === 'concept' ? '답안 제출' : '실행하고 확인'}</span>
              <span aria-hidden="true">→</span>
            </Link>
            <HintModal hint={question.hint} />
          </div>
        </section>
      </div>
    </main>
  )
}
