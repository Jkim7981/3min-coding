'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ACADEMY_CURRICULUM } from '@/lib/academyData'

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
  // sessionNumber는 자동 계산되어 고정됨 (수동 입력 불가)
  const [sessionNumber, setSessionNumber] = useState<number | null>(null)
  const [totalSessions, setTotalSessions] = useState<number | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [allSessionsDone, setAllSessionsDone] = useState(false)
  // 수업 날짜 (YYYY-MM-DD). 미입력 시 즉시 오픈
  const [scheduledDate, setScheduledDate] = useState('')
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
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

  // 과목 선택 시 → 다음 회차 자동 계산
  useEffect(() => {
    if (!subjectId) {
      setSessionNumber(null)
      setTotalSessions(null)
      setAllSessionsDone(false)
      return
    }

    const selectedSubject = subjects.find((s) => s.id === subjectId)
    const curriculum = selectedSubject
      ? ACADEMY_CURRICULUM.find((c) => c.name === selectedSubject.name)
      : undefined
    const maxTotal = curriculum?.totalSessions ?? null
    setTotalSessions(maxTotal)

    setSessionLoading(true)
    fetch(`/api/subjects/${subjectId}/sessions`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const maxSession =
            data.length > 0 ? Math.max(...data.map((s: { session_number?: number }) => s.session_number ?? 0)) : 0
          const next = maxSession + 1
          if (maxTotal !== null && next > maxTotal) {
            setAllSessionsDone(true)
            setSessionNumber(null)
          } else {
            setAllSessionsDone(false)
            setSessionNumber(next)
          }
        }
      })
      .catch(() => {})
      .finally(() => setSessionLoading(false))
  }, [subjectId, subjects])

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
    if (sessionNumber === null) return setError('회차 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요')

    setLoading(true)

    // 업로드 15초 타임아웃
    const uploadController = new AbortController()
    const uploadTimeout = setTimeout(() => uploadController.abort(), 15000)

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: subjectId,
          title: title.trim(),
          content: content.trim(),
          session_number: sessionNumber,
          scheduled_date: scheduledDate || null,
        }),
        signal: uploadController.signal,
      })
      clearTimeout(uploadTimeout)

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '업로드 중 오류가 발생했습니다')
        return
      }

      // 업로드 완료 후 자동으로 문제 생성 (AI 처리 60초 타임아웃)
      setLoading(false)
      setGeneratingQuestions(true)

      const genController = new AbortController()
      const genTimeout = setTimeout(() => genController.abort(), 60000)

      try {
        const qRes = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lesson_id: data.id, difficulty: 'medium', count: 5 }),
          signal: genController.signal,
        })
        clearTimeout(genTimeout)

        const qData = await qRes.json()
        if (!qRes.ok) {
          setError(qData.error ?? '문제 생성 중 오류가 발생했습니다')
          setGeneratingQuestions(false)
          return
        }
      } catch (err) {
        clearTimeout(genTimeout)
        if (err instanceof Error && err.name === 'AbortError') {
          setError('문제 생성 시간이 초과됐습니다. 다시 시도해주세요.')
        } else {
          throw err
        }
        setGeneratingQuestions(false)
        return
      }

      setGeneratingQuestions(false)
      setSuccess(true)
    } catch (err) {
      clearTimeout(uploadTimeout)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('업로드 시간이 초과됐습니다. 다시 시도해주세요.')
      } else {
        setError('네트워크 오류가 발생했습니다')
      }
    } finally {
      setLoading(false)
      setGeneratingQuestions(false)
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  if (generatingQuestions) {
    return (
      <div className="min-h-screen bg-primary-light flex flex-col items-center justify-center px-5 gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-primary-light" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-primary-dark">문제 생성 중</p>
          <p className="text-sm text-gray-500 mt-1">AI가 수업 자료를 분석하고 있어요</p>
          <p className="text-xs text-gray-400 mt-1">약 10~30초 소요됩니다</p>
        </div>
      </div>
    )
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
                // 과목 선택은 유지 — 같은 과목 다음 회차 연속 업로드 편의성
                // subjectId useEffect가 자동으로 다음 sessionNumber 재계산
                setSuccess(false)
                setTitle('')
                setContent('')
                setFile(null)
                setScheduledDate('')
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
          {/* 회차 정보 표시 */}
          {subjectId && (
            <div className="flex items-center justify-between bg-primary-light rounded-xl px-3 py-2.5">
              <span className="text-xs font-semibold text-gray-500">다음 업로드 회차</span>
              {sessionLoading ? (
                <span className="text-xs text-gray-400">불러오는 중...</span>
              ) : allSessionsDone ? (
                <span className="text-xs font-bold text-green-600">
                  ✓ 모든 회차 업로드 완료 ({totalSessions}회차)
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-primary">
                    {sessionNumber}회차
                  </span>
                  {totalSessions && (
                    <span className="text-xs text-gray-400">/ 전체 {totalSessions}회차</span>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">수업 제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={sessionNumber ? `예) ${sessionNumber}회차 - 반복문 for/while` : '예) 반복문 for/while'}
              className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              수업 날짜
              <span className="ml-1 font-normal text-gray-400">(미입력 시 즉시 오픈)</span>
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
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
          disabled={loading || allSessionsDone || sessionNumber === null}
          className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base shadow-md active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              업로드 중...
            </span>
          ) : allSessionsDone ? (
            '모든 회차 업로드 완료'
          ) : (
            sessionNumber ? `${sessionNumber}회차 수업 자료 업로드` : '수업 자료 업로드'
          )}
        </button>
      </form>
    </div>
  )
}
