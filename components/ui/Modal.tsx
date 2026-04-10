'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import Button from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** 2단계 오답 플로우 전용 footer 숨김 여부 */
  hideFooter?: boolean
  className?: string
}

export default function Modal({ isOpen, onClose, title, children, hideFooter, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div
        className={cn(
          'w-full max-w-md rounded-2xl bg-white shadow-xl',
          'animate-in fade-in zoom-in-95 duration-200',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          {title && <h2 className="text-lg font-bold text-primary-dark">{title}</h2>}
          <button
            onClick={onClose}
            className="ml-auto rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5">{children}</div>

        {/* 기본 푸터 (hideFooter=true 면 숨김 — 2단계 오답 플로우에서 자체 버튼 사용) */}
        {!hideFooter && (
          <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              닫기
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
