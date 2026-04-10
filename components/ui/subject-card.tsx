type SubjectCardProps = {
  name: string
  description: string
  level: string
  accent: string
}

export function SubjectCard({ accent, description, level, name }: SubjectCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Subject</p>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">{name}</h3>
        </div>
        <span
          className="h-4 w-4 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,1)]"
          style={{ backgroundColor: accent }}
        />
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-600">{description}</p>
      <div className="mt-5 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
        Level {level}
      </div>
    </article>
  )
}

export type { SubjectCardProps }
