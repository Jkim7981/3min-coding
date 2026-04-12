'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-semibold transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.97]',
          variant === 'primary' && 'bg-primary text-white hover:bg-primary-dark',
          variant === 'secondary' && 'bg-primary-light text-primary hover:bg-blue-100',
          variant === 'ghost' && 'bg-transparent text-primary border border-primary hover:bg-primary-light',
          size === 'sm' && 'px-3 py-2 text-sm min-h-[44px]',
          size === 'md' && 'px-5 py-3 text-base min-h-[44px]',
          size === 'lg' && 'px-6 py-3.5 text-lg min-h-[44px]',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
