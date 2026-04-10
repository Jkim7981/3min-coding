import { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    'bg-[#081217] text-white shadow-[0_16px_32px_rgba(8,18,23,0.24)] hover:-translate-y-0.5 hover:bg-[#12212d] active:translate-y-0 active:bg-[#050b10] disabled:bg-slate-300 disabled:text-slate-500',
  secondary:
    'bg-white text-[#081217] ring-1 ring-slate-200 hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 active:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-400',
  ghost:
    'bg-transparent text-[#0f766e] ring-1 ring-[#99f6e4] hover:bg-[#ccfbf1] active:bg-[#99f6e4] disabled:border-slate-200 disabled:text-slate-400 disabled:ring-slate-200',
}

const sizeClassName: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-sm',
  lg: 'h-14 px-6 text-base',
}

export function Button({
  children,
  className = '',
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-full font-semibold tracking-[-0.01em] transition duration-200 ease-out disabled:cursor-not-allowed ${sizeClassName[size]} ${variantClassName[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export type { ButtonProps, ButtonSize, ButtonVariant }
