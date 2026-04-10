'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-[200px] px-5 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-2xl">
              😵
            </div>
            <p className="text-sm font-semibold text-gray-700">오류가 발생했습니다</p>
            <p className="text-xs text-gray-400">{this.state.message || '잠시 후 다시 시도해주세요'}</p>
            <button
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="mt-1 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold min-h-[44px]"
            >
              다시 시도
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
