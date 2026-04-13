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
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  // 영상 분석 상태
  type VideoPhase = 'idle' | 'extracting' | 'analyzing' | 'done' | 'error'
  const [videoPhase, setVideoPhase] = useState<VideoPhase>('idle')
  const [videoProgress, setVideoProgress] = useState({ step: 0, total: 0, frames: 0 })

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

  function isVideoFile(f: File) {
    return (
      f.type.startsWith('video/') ||
      f.name.endsWith('.mp4') ||
      f.name.endsWith('.mov') ||
      f.name.endsWith('.avi') ||
      f.name.endsWith('.mkv') ||
      f.name.endsWith('.webm')
    )
  }

  function isValidFile(f: File) {
    return (
      isVideoFile(f) ||
      f.name.endsWith('.txt') ||
      f.name.endsWith('.md') ||
      f.name.endsWith('.ipynb') ||
      f.type.startsWith('text/')
    )
  }

  // .ipynb JSON에서 셀 소스 추출 → 텍스트로 변환
  function parseNotebook(json: string): string {
    try {
      const nb = JSON.parse(json)
      const cells: { cell_type: string; source: string | string[] }[] = nb.cells ?? []
      return cells
        .map((cell) => {
          const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source
          if (cell.cell_type === 'code') return '```python\n' + src + '\n```'
          return src
        })
        .filter(Boolean)
        .join('\n\n')
    } catch {
      return ''
    }
  }

  function addFiles(newFiles: File[]) {
    const valid = newFiles.filter(isValidFile)
    const invalid = newFiles.filter((f) => !isValidFile(f))
    if (invalid.length > 0) {
      setError(`지원하지 않는 파일 형식: ${invalid.map((f) => f.name).join(', ')}`)
    } else {
      setError('')
    }
    if (valid.length === 0) return

    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name))
      const filtered = valid.filter((f) => !existingNames.has(f.name))
      const next = [...prev, ...filtered]

      // 텍스트 파일만 내용 읽기 (영상 파일 제외)
      const textFiles = next.filter((f) => !isVideoFile(f))
      if (textFiles.length === 0) return next

      let pending = textFiles.length
      const contents: string[] = Array(textFiles.length).fill('')

      textFiles.forEach((file, i) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const raw = (e.target?.result as string) ?? ''
          contents[i] = file.name.endsWith('.ipynb')
            ? `[${file.name}]\n` + parseNotebook(raw)
            : `[${file.name}]\n` + raw
          pending--
          if (pending === 0) {
            setContent(contents.join('\n\n---\n\n'))
          }
        }
        reader.readAsText(file, 'utf-8')
      })

      return next
    })
  }

  function removeFile(name: string) {
    setFiles((prev) => {
      const next = prev.filter((f) => f.name !== name)
      const textFiles = next.filter((f) => !isVideoFile(f))
      if (textFiles.length === 0) {
        setContent('')
      } else {
        let pending = textFiles.length
        const contents: string[] = Array(textFiles.length).fill('')
        textFiles.forEach((file, i) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const raw = (e.target?.result as string) ?? ''
            contents[i] = file.name.endsWith('.ipynb')
              ? `[${file.name}]\n` + parseNotebook(raw)
              : `[${file.name}]\n` + raw
            pending--
            if (pending === 0) setContent(contents.join('\n\n---\n\n'))
          }
          reader.readAsText(file, 'utf-8')
        })
      }
      return next
    })
  }

  // ── 키프레임 추출 (브라우저 Canvas API) ──────────────
  function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, 3000)
      const handler = () => {
        clearTimeout(timeout)
        video.removeEventListener('seeked', handler)
        resolve()
      }
      video.addEventListener('seeked', handler)
      video.currentTime = time
    })
  }

  async function extractKeyframes(
    videoFile: File,
    onProgress: (step: number, total: number, frames: number) => void
  ): Promise<Blob[]> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const objectUrl = URL.createObjectURL(videoFile)
      video.src = objectUrl
      video.muted = true
      video.preload = 'metadata'

      const cmpCanvas = document.createElement('canvas') // 비교용 (저해상도)
      const capCanvas = document.createElement('canvas') // 저장용 (고해상도)
      cmpCanvas.width = 160;  cmpCanvas.height = 90
      capCanvas.width = 640;  capCanvas.height = 360
      const cmpCtx = cmpCanvas.getContext('2d')!
      const capCtx = capCanvas.getContext('2d')!

      const THRESHOLD = 8   // 픽셀 평균 차이 임계값 (0~255)
      const MAX_FRAMES = 60 // 최대 키프레임 수
      const keyframes: Blob[] = []

      video.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('영상을 읽을 수 없습니다'))
      })

      video.addEventListener('loadedmetadata', async () => {
        const duration = video.duration
        if (!duration || duration === Infinity) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('영상 길이를 확인할 수 없습니다'))
          return
        }

        // 30분 이상이면 5초 간격, 이하면 3초 간격
        const step = duration > 1800 ? 5 : 3
        const totalSteps = Math.floor(duration / step)
        let prevPixels: Uint8ClampedArray | null = null

        for (let i = 0; i <= totalSteps && keyframes.length < MAX_FRAMES; i++) {
          const t = i * step
          await seekTo(video, t)
          onProgress(i, totalSteps, keyframes.length)

          // 저해상도로 픽셀 비교
          cmpCtx.drawImage(video, 0, 0, 160, 90)
          const currPixels = cmpCtx.getImageData(0, 0, 160, 90).data

          let isKeyframe = prevPixels === null
          if (prevPixels) {
            let diffSum = 0
            for (let p = 0; p < currPixels.length; p += 4) {
              diffSum += Math.abs(currPixels[p]   - prevPixels[p])
              diffSum += Math.abs(currPixels[p+1] - prevPixels[p+1])
              diffSum += Math.abs(currPixels[p+2] - prevPixels[p+2])
            }
            isKeyframe = diffSum / (currPixels.length / 4 * 3) > THRESHOLD
          }

          if (isKeyframe) {
            // 고해상도로 저장
            const blob = await new Promise<Blob | null>((res) => {
              capCtx.drawImage(video, 0, 0, 640, 360)
              capCanvas.toBlob(res, 'image/jpeg', 0.85)
            })
            if (blob) keyframes.push(blob)
            prevPixels = currPixels
          }
        }

        URL.revokeObjectURL(objectUrl)
        resolve(keyframes)
      })
    })
  }

  async function handleVideoAnalysis() {
    const videoFile = files.find(isVideoFile)
    if (!videoFile) return

    setVideoPhase('extracting')
    setVideoProgress({ step: 0, total: 0, frames: 0 })
    setError('')

    try {
      // 1단계: 키프레임 추출
      const keyframes = await extractKeyframes(videoFile, (step, total, frames) => {
        setVideoProgress({ step, total, frames })
      })

      if (keyframes.length === 0) {
        setError('키프레임을 추출할 수 없습니다. 다른 영상을 시도해보세요.')
        setVideoPhase('error')
        return
      }

      // 2단계: GPT-4o Vision 분석
      setVideoPhase('analyzing')
      const formData = new FormData()
      keyframes.forEach((blob, i) => {
        formData.append('frames', new File([blob], `frame_${i}.jpg`, { type: 'image/jpeg' }))
      })

      const res = await fetch('/api/analyze-frames', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? '분석 중 오류가 발생했습니다')
        setVideoPhase('error')
        return
      }

      // 기존 content에 추가
      setContent((prev) =>
        prev.trim()
          ? prev + `\n\n---\n\n[${videoFile.name} — 영상 분석]\n` + data.content
          : `[${videoFile.name} — 영상 분석]\n` + data.content
      )
      setVideoPhase('done')
    } catch {
      setError('영상 분석 중 오류가 발생했습니다')
      setVideoPhase('error')
    }
  }
  // ────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length > 0) addFiles(selected)
    // input 초기화 (같은 파일 재선택 허용)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length > 0) addFiles(dropped)
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
                setFiles([])
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

        {/* 파일 드래그 앤 드롭 (다중 선택) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-xs font-semibold text-gray-500 mb-2">
            파일 업로드
            <span className="ml-1 font-normal text-gray-400">(여러 파일 동시 선택 가능)</span>
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={[
              'border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors',
              dragging ? 'border-primary bg-primary-light' : 'border-gray-200 hover:border-primary/50',
            ].join(' ')}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.ipynb,.mp4,.mov,.avi,.mkv,.webm,text/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <path d="M16 20V12M16 12l-4 4M16 12l4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="4" y="4" width="24" height="24" rx="6" stroke="#9CA3AF" strokeWidth="1.5" />
              </svg>
              <p className="text-sm font-medium">파일을 드래그하거나 탭하여 선택</p>
              <p className="text-xs">.txt · .md · .ipynb · 영상(.mp4, .mov 등)</p>
            </div>
          </div>

          {/* 선택된 파일 목록 */}
          {files.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {files.map((f) => {
                const isVid = isVideoFile(f)
                const ext = isVid ? '영상'
                  : f.name.endsWith('.ipynb') ? 'ipynb'
                  : f.name.endsWith('.md') ? 'md' : 'txt'
                return (
                  <div
                    key={f.name}
                    className="flex items-center justify-between bg-primary-light rounded-xl px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0 ${isVid ? 'bg-purple-100 text-purple-600' : 'text-primary bg-white'}`}>
                        {ext}
                      </span>
                      <span className="text-xs text-gray-700 truncate">{f.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{formatSize(f.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(f.name) }}
                      className="ml-2 text-gray-400 hover:text-red-400 transition-colors shrink-0"
                      aria-label={`${f.name} 제거`}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                )
              })}

              {/* 영상 분석 버튼 */}
              {files.some(isVideoFile) && (
                <div className="mt-1">
                  {videoPhase === 'idle' || videoPhase === 'error' ? (
                    <button
                      type="button"
                      onClick={handleVideoAnalysis}
                      className="w-full py-2.5 rounded-xl bg-purple-500 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-purple-600 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 3l7 5-7 5V3z" fill="white" />
                        <rect x="1" y="3" width="2.5" height="10" rx="1" fill="white" />
                      </svg>
                      영상 키프레임 분석 시작
                    </button>
                  ) : videoPhase === 'extracting' ? (
                    <div className="bg-purple-50 rounded-xl px-3 py-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-700">프레임 추출 중...</span>
                        <span className="text-xs text-purple-500">
                          키프레임 {videoProgress.frames}개 발견
                        </span>
                      </div>
                      <div className="w-full bg-purple-100 rounded-full h-1.5">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full transition-all"
                          style={{ width: videoProgress.total > 0 ? `${(videoProgress.step / videoProgress.total) * 100}%` : '5%' }}
                        />
                      </div>
                      <p className="text-xs text-purple-400">
                        {videoProgress.total > 0
                          ? `${videoProgress.step} / ${videoProgress.total} 구간 처리됨`
                          : '영상 로드 중...'}
                      </p>
                    </div>
                  ) : videoPhase === 'analyzing' ? (
                    <div className="bg-purple-50 rounded-xl px-3 py-3 flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-purple-700">AI 화면 분석 중...</p>
                        <p className="text-xs text-purple-400">키프레임 {videoProgress.frames}장을 GPT-4o가 분석하고 있어요</p>
                      </div>
                    </div>
                  ) : videoPhase === 'done' ? (
                    <div className="bg-green-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l4 4 6-6" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-xs font-semibold text-green-700">
                        영상 분석 완료 — 수업 자료 내용에 추가됐어요
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
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
