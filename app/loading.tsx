import { LogoMark } from '@/components/ui/logo-mark'

export default function Loading() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#081217] text-white">
      <div className="relative flex min-h-screen items-center justify-center px-6 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.25),_transparent_42%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.18),_transparent_34%)]" />

        <div className="relative w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/6 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.34em] text-white/55">
            <span>KOREAIT</span>
            <span>로딩 화면</span>
          </div>

          <div className="mt-10 flex flex-col items-center text-center">
            <div className="relative">
              <div className="absolute inset-[-14px] rounded-[2rem] bg-[conic-gradient(from_180deg_at_50%_50%,rgba(20,184,166,0),rgba(20,184,166,0.95),rgba(56,189,248,0.55),rgba(20,184,166,0))] blur-[2px] animate-[spin_4s_linear_infinite]" />
              <LogoMark className="relative z-10" priority />
            </div>

            <p className="mt-8 text-sm uppercase tracking-[0.38em] text-[#5eead4]">
              스마트 학습 대시보드
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              학습 홈 화면을 준비하고 있어요
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/68 sm:text-base">
              주간 학습 현황, 수강 과목 카드, 문제 요약 정보를 불러와 다음 화면에 맞게
              정리하고 있습니다.
            </p>
          </div>

          <div className="mt-10">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>콘텐츠 불러오는 중</span>
              <span>78%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[78%] rounded-full bg-[linear-gradient(90deg,#14b8a6_0%,#67e8f9_50%,#bfdbfe_100%)] animate-[pulse_1.6s_ease-in-out_infinite]" />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5 text-sm text-white/50">
            <span>3분 코딩 대시보드</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </main>
  )
}
