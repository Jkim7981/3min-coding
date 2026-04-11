'use client'

import { useState } from 'react'

type HintModalProps = {
  hint: string
}

export function HintModal({ hint }: HintModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center justify-center rounded-full border border-[#99f6e4] px-5 text-sm font-semibold text-[#0f766e] transition hover:bg-[#ccfbf1] active:bg-[#99f6e4]"
      >
        힌트 보기
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081217]/55 px-4">
          <div
            className="absolute inset-0 animate-[fadeIn_180ms_ease-out]"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-lg animate-[modalRise_220ms_ease-out] rounded-[2rem] border border-white/12 bg-white p-7 shadow-[0_28px_90px_rgba(8,18,23,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-teal-700">힌트 팝업</p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">
                  먼저 이 단서를 확인해보세요
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-500 transition hover:bg-slate-100"
                aria-label="힌트 모달 닫기"
              >
                ×
              </button>
            </div>

            <p className="mt-6 rounded-[1.5rem] bg-[#f4f7f9] p-5 text-sm leading-7 text-slate-700">
              {hint}
            </p>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#081217] px-5 text-sm font-semibold text-white transition hover:bg-[#12212d] active:bg-[#050b10]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
