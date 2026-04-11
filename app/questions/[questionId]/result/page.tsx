import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getNextQuestionId, getQuestionById } from '@/lib/mock-learning'

export default async function QuestionResultPage(
  props: PageProps<'/questions/[questionId]/result'>
) {
  const { questionId } = await props.params
  const question = getQuestionById(questionId)

  if (!question) {
    notFound()
  }

  const isCorrect = question.status === 'completed' || question.status === 'current'
  const nextQuestionId = getNextQuestionId(questionId)

  return (
    <main className="min-h-screen bg-[#f4f7f9] text-[#081217]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
        <section className="rounded-[2rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.34em] text-teal-700">
            T3-15 결과 및 해설 화면
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                isCorrect
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
              }`}
            >
              {isCorrect ? '정답입니다' : '다시 시도해보세요'}
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              {question.subjectName} · {question.round}회차
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight">{question.title}</h1>
          <p className="mt-4 text-base leading-8 text-slate-700">{question.prompt}</p>

          <div className="mt-8 rounded-[1.75rem] bg-[#081217] p-6 text-white shadow-[0_18px_50px_rgba(8,18,23,0.18)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#5eead4]">AI 생성 해설</p>
            <p className="mt-4 text-lg font-semibold">{question.correctAnswer}</p>
            <p className="mt-4 text-sm leading-7 text-white/72">{question.explanation}</p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {nextQuestionId ? (
              <Link
                href={`/questions/${nextQuestionId}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f766e,#14b8a6)] px-6 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,118,110,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(15,118,110,0.28)] active:translate-y-0"
              >
                <span>다음 문제</span>
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f766e,#14b8a6)] px-6 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,118,110,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(15,118,110,0.28)] active:translate-y-0"
              >
                <span>홈으로 돌아가기</span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
            <Link
              href={`/questions/${questionId}`}
              className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 active:bg-slate-100"
            >
              문제 다시 보기
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
