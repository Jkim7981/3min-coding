type LogoMarkProps = {
  className?: string
  priority?: boolean
}

export function LogoMark({ className = '' }: LogoMarkProps) {
  return (
    <div
      className={`inline-flex min-w-[190px] flex-col rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-[#0b3b8f] shadow-[0_20px_40px_rgba(15,23,42,0.12)] ${className}`}
      aria-label="KOREAIT 로고 자리"
    >
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.5em] text-slate-400">
        logo
      </span>
      <span className="mt-2 text-3xl font-black uppercase tracking-[0.16em]">KOREAIT</span>
      <span className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.22em] text-slate-400">
        replaceable placeholder
      </span>
    </div>
  )
}

export type { LogoMarkProps }
