'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Subject {
  id: string
  name: string
}

export default function UploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [sessionNumber, setSessionNumber] = useState('')
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSubjects(data)
      })
      .catch(() => {})
  }, [])

  function readFile(f: File) {
    if (!f.type.startsWith('text/') && !f.name.endsWith('.txt') && !f.name.endsWith('.md')) {
      setError('텍스트 파일(.txt, .md)만 지원합니다')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setContent((e.target?.result as string) ?? '')
      setError('')
    }
    reader.readAsText(f, 'utf-8')
    setFile(f)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) readFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) readFile(f)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!subjectId) return setError('과목을 선택해주세요')
    if (!title.trim()) return setError('수업 제목을 입력해주세요')
    if (!content.trim()) return setError('수업 자료 내용을 입력하거나 파일을 업로드해주세요')

    setLoading(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: subjectId,
          title: title.trim(),
          content: content.trim(),
          session_number: sessionNumber ? Number(sessionNumber) : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '업로드 중 오류가 발생했습니다')
        return
      }

      setSuccess(true)
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  if (success) {
    return (
      <div className="min-h-screen bg-primary-light flex flex-col items-center justify-center px-5">
        <div className="bg-white rounded-3xl p-8 shadow-sm text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 17l5 5 11-11" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">업로드 완료!</h2>
          <p className="text-sm text-gray-500 mb-6">수업 자료가 성공적으로 등록되었습니다</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setSuccess(false)
                setTitle('')
                setContent('')
                setFile(null)
                setSessionNumber('')
              }}
              className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-semibold"
            >
              추가 업로드
            </button>
            <button
              onClick={() => router.push('/admin/questions')}
              className="w-full py-3 rounded-2xl bg-white border border-gray-200 text-gray-600 text-sm font-semibold"
            >
              문제 생성하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary-light">
      {/* 헤더 */}
      <div className="flex items-center justify-center relative px-5 pt-8 pb-4">
        <button
          onClick={() => router.back()}
          className="absolute left-5 p-1.5 rounded-full hover:bg-white/60 transition-colors"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-xs text-gray-400 font-medium">강사 관리</p>
          <h1 className="text-lg font-bold text-primary-dark">수업 자료 업로드</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-5 flex flex-col gap-4 pb-10">
        {/* 과목 선택 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-xs font-semibold text-gray-500 mb-2">과목 선택 *</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-primary"
          >
            <option value="">과목을 선택해주세요</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 수업 정보 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">수업 제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 3회차 - 반복문 for/while"
              className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">회차 번호</label>
            <input
              type="number"
              value={sessionNumber}
              onChange={(e) => setSessionNumber(e.target.value)}
              placeholder="예) 3"
              min={1}
              className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* 파일 드래그 앤 드롭 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-xs font-semibold text-gray-500 mb-2">파일 업로드</label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={[
              'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors',
              dragging ? 'border-primary bg-primary-light' : 'border-gray-200 hover:border-primary/50',
            ].join(' ')}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,text/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M11 2H5a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V9l-6-7z" stroke="#185FA5" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M11 2v7h6" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                </div>
                <span className="text-xs text-primary font-medium">파일 변경하기</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 20V12M16 12l-4 4M16 12l4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="4" y="4" width="24" height="24" rx="6" stroke="#9CA3AF" strokeWidth="1.5" />
                </svg>
                <p className="text-sm font-medium">파일을 드래그하거나 탭하여 선택</p>
                <p className="text-xs">.txt, .md 파일 지원</p>
              </div>
            )}
          </div>
        </div>

        {/* 수동 입력 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-xs font-semibold text-gray-500 mb-2">
            수업 자료 내용 *
            <span className="ml-1 font-normal text-gray-400">(직접 입력 또는 파일 업로드)</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="수업에서 다룬 내용을 입력하세요. 예) 오늘은 for 반복문에 대해 배웠습니다..."
            rows={8}
            className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-primary resize-none leading-relaxed"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{content.length}자</p>
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 제출 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base shadow-md active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              업로드 중...
            </span>
          ) : (
            '수업 자료 업로드'
          )}
        </button>
      </form>
    </div>
  )
}
