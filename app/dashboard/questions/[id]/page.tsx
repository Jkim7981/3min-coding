'use client'

import { use } from 'react'

export default function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <div className="min-h-screen p-8 bg-primary-light">
      <h1 className="text-2xl font-bold text-primary-dark">문제 풀기</h1>
      <p className="text-gray-500 mt-2">문제 ID: {id} — 구현 예정</p>
    </div>
  )
}
