type QuestionCardProps = {
  title: string
  prompt: string
  category: 'concept' | 'coding'
  difficulty: string
}

export function QuestionCard({ category, difficulty, prompt, title }: QuestionCardProps) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-[#fbfcfd] p-5">
      <div className="flex items-center justify-between gap-4">
        <span className="rounded-full bg-[#ccfbf1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#0f766e]">
          {category}
        </span>
        <span className="text-sm font-medium text-slate-500">{difficulty}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{prompt}</p>
    </article>
  )
}

export type { QuestionCardProps }
