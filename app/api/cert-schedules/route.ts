import { NextResponse } from 'next/server'

export interface ExamEvent {
  id: string
  cert: string
  certShort: string
  round: string
  type: 'doc_reg' | 'doc_exam' | 'doc_pass' | 'prac_reg' | 'prac_exam' | 'prac_pass' | 'exam' | 'reg' | 'pass'
  typeLabel: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  color: string
  source: 'live' | 'static' // live = data.go.kr API, static = hardcoded
}

const COLORS: Record<string, string> = {
  '정보처리기사': '#185FA5',
  '빅데이터분석기사': '#7C3AED',
  'SQLD': '#059669',
  'ADsP': '#D97706',
  '리눅스마스터': '#DC2626',
}

// ─────────────────────────────────────────────
// data.go.kr XML 파싱 유틸
// ─────────────────────────────────────────────
function getXmlValue(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}>([^<]*)<\\/${tag}>`))
  return (m?.[1] ?? m?.[2] ?? '').trim()
}

function formatDate(s: string): string {
  // 20260407 → 2026-04-07
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  return s
}

function parseQnetXML(xml: string): ExamEvent[] {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? []
  const events: ExamEvent[] = []

  for (const item of items) {
    const jmNm = getXmlValue(item, 'jmNm')
    if (!jmNm.includes('정보처리기사')) continue

    const seq = getXmlValue(item, 'implSeq')
    const round = `${seq}회`
    const color = COLORS['정보처리기사']

    const push = (
      id: string,
      type: ExamEvent['type'],
      typeLabel: string,
      startRaw: string,
      endRaw: string
    ) => {
      const startDate = formatDate(startRaw)
      const endDate = formatDate(endRaw || startRaw)
      if (!startDate || startDate === '') return
      events.push({ id, cert: '정보처리기사', certShort: '정처기', round, type, typeLabel, startDate, endDate, color, source: 'live' })
    }

    push(`jgi-${seq}-doc-reg`, 'doc_reg', '필기 접수',
      getXmlValue(item, 'docExamRecptStartDt'), getXmlValue(item, 'docExamRecptEndDt'))
    push(`jgi-${seq}-doc-exam`, 'doc_exam', '필기 시험',
      getXmlValue(item, 'docExamStartDt'), getXmlValue(item, 'docExamEndDt'))
    push(`jgi-${seq}-doc-pass`, 'doc_pass', '필기 합격발표',
      getXmlValue(item, 'docPassDt'), getXmlValue(item, 'docPassDt'))
    push(`jgi-${seq}-prac-reg`, 'prac_reg', '실기 접수',
      getXmlValue(item, 'pracExamRecptStartDt'), getXmlValue(item, 'pracExamRecptEndDt'))
    push(`jgi-${seq}-prac-exam`, 'prac_exam', '실기 시험',
      getXmlValue(item, 'pracExamStartDt'), getXmlValue(item, 'pracExamEndDt'))
    push(`jgi-${seq}-prac-pass`, 'prac_pass', '최종 합격발표',
      getXmlValue(item, 'pracPassDt'), getXmlValue(item, 'pracPassDt'))
  }

  return events
}

async function fetchQnetSchedule(): Promise<ExamEvent[]> {
  try {
    const apiKey = process.env.DATA_GO_KR_API_KEY
    if (!apiKey) return []

    const url =
      `http://apis.data.go.kr/B490007/qualExamSchd/getQualExamSchdList` +
      `?serviceKey=${encodeURIComponent(apiKey)}&implYy=2026&pageNo=1&numOfRows=100`

    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } })
    if (!res.ok) return []

    const xml = await res.text()
    return parseQnetXML(xml)
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────
// 정적 일정 데이터 (K-DATA / KAIT)
// 출처: dataq.or.kr, ihd.or.kr 공식 발표 기준
// ─────────────────────────────────────────────
function getStaticSchedules(): ExamEvent[] {
  const ev = (
    id: string, cert: string, certShort: string, round: string,
    type: ExamEvent['type'], typeLabel: string,
    startDate: string, endDate: string
  ): ExamEvent => ({
    id, cert, certShort, round, type, typeLabel,
    startDate, endDate, color: COLORS[cert] ?? '#6B7280', source: 'static',
  })

  return [
    // ── 빅데이터분석기사 12회 (상반기) ──────────
    ev('bd-12-doc-reg',  '빅데이터분석기사', '빅분기', '12회', 'doc_reg',  '필기 접수', '2026-03-03', '2026-03-09'),
    ev('bd-12-doc-exam', '빅데이터분석기사', '빅분기', '12회', 'doc_exam', '필기 시험', '2026-04-04', '2026-04-04'),
    ev('bd-12-doc-pass', '빅데이터분석기사', '빅분기', '12회', 'doc_pass', '필기 합격발표', '2026-04-24', '2026-04-24'),
    ev('bd-12-prac-reg',  '빅데이터분석기사', '빅분기', '12회', 'prac_reg',  '실기 접수', '2026-05-12', '2026-05-18'),
    ev('bd-12-prac-exam', '빅데이터분석기사', '빅분기', '12회', 'prac_exam', '실기 시험', '2026-06-13', '2026-06-13'),
    ev('bd-12-prac-pass', '빅데이터분석기사', '빅분기', '12회', 'prac_pass', '최종 합격발표', '2026-07-03', '2026-07-03'),

    // ── 빅데이터분석기사 13회 (하반기) ──────────
    ev('bd-13-doc-reg',  '빅데이터분석기사', '빅분기', '13회', 'doc_reg',  '필기 접수', '2026-08-18', '2026-08-24'),
    ev('bd-13-doc-exam', '빅데이터분석기사', '빅분기', '13회', 'doc_exam', '필기 시험', '2026-09-19', '2026-09-19'),
    ev('bd-13-doc-pass', '빅데이터분석기사', '빅분기', '13회', 'doc_pass', '필기 합격발표', '2026-10-09', '2026-10-09'),
    ev('bd-13-prac-reg',  '빅데이터분석기사', '빅분기', '13회', 'prac_reg',  '실기 접수', '2026-10-20', '2026-10-26'),
    ev('bd-13-prac-exam', '빅데이터분석기사', '빅분기', '13회', 'prac_exam', '실기 시험', '2026-11-21', '2026-11-21'),
    ev('bd-13-prac-pass', '빅데이터분석기사', '빅분기', '13회', 'prac_pass', '최종 합격발표', '2026-12-11', '2026-12-11'),

    // ── SQLD ────────────────────────────────────
    ev('sqld-60-reg',  'SQLD', 'SQLD', '60회', 'reg', '접수', '2026-02-09', '2026-02-13'),
    ev('sqld-60-exam', 'SQLD', 'SQLD', '60회', 'exam', '시험', '2026-03-07', '2026-03-07'),
    ev('sqld-60-pass', 'SQLD', 'SQLD', '60회', 'pass', '합격발표', '2026-03-27', '2026-03-27'),

    ev('sqld-61-reg',  'SQLD', 'SQLD', '61회', 'reg',  '접수', '2026-05-04', '2026-05-08'),
    ev('sqld-61-exam', 'SQLD', 'SQLD', '61회', 'exam', '시험', '2026-05-31', '2026-05-31'),
    ev('sqld-61-pass', 'SQLD', 'SQLD', '61회', 'pass', '합격발표', '2026-06-19', '2026-06-19'),

    ev('sqld-62-reg',  'SQLD', 'SQLD', '62회', 'reg',  '접수', '2026-07-27', '2026-07-31'),
    ev('sqld-62-exam', 'SQLD', 'SQLD', '62회', 'exam', '시험', '2026-08-22', '2026-08-22'),
    ev('sqld-62-pass', 'SQLD', 'SQLD', '62회', 'pass', '합격발표', '2026-09-11', '2026-09-11'),

    ev('sqld-63-reg',  'SQLD', 'SQLD', '63회', 'reg',  '접수', '2026-10-19', '2026-10-23'),
    ev('sqld-63-exam', 'SQLD', 'SQLD', '63회', 'exam', '시험', '2026-11-14', '2026-11-14'),
    ev('sqld-63-pass', 'SQLD', 'SQLD', '63회', 'pass', '합격발표', '2026-12-04', '2026-12-04'),

    // ── ADsP ────────────────────────────────────
    ev('adsp-48-reg',  'ADsP', 'ADsP', '48회', 'reg',  '접수', '2026-01-05', '2026-01-09'),
    ev('adsp-48-exam', 'ADsP', 'ADsP', '48회', 'exam', '시험', '2026-02-07', '2026-02-07'),
    ev('adsp-48-pass', 'ADsP', 'ADsP', '48회', 'pass', '합격발표', '2026-02-27', '2026-02-27'),

    ev('adsp-49-reg',  'ADsP', 'ADsP', '49회', 'reg',  '접수', '2026-04-13', '2026-04-17'),
    ev('adsp-49-exam', 'ADsP', 'ADsP', '49회', 'exam', '시험', '2026-05-16', '2026-05-16'),
    ev('adsp-49-pass', 'ADsP', 'ADsP', '49회', 'pass', '합격발표', '2026-06-05', '2026-06-05'),

    ev('adsp-50-reg',  'ADsP', 'ADsP', '50회', 'reg',  '접수', '2026-07-13', '2026-07-17'),
    ev('adsp-50-exam', 'ADsP', 'ADsP', '50회', 'exam', '시험', '2026-08-15', '2026-08-15'),
    ev('adsp-50-pass', 'ADsP', 'ADsP', '50회', 'pass', '합격발표', '2026-09-04', '2026-09-04'),

    ev('adsp-51-reg',  'ADsP', 'ADsP', '51회', 'reg',  '접수', '2026-10-12', '2026-10-16'),
    ev('adsp-51-exam', 'ADsP', 'ADsP', '51회', 'exam', '시험', '2026-11-14', '2026-11-14'),
    ev('adsp-51-pass', 'ADsP', 'ADsP', '51회', 'pass', '합격발표', '2026-12-04', '2026-12-04'),

    // ── 리눅스마스터 ────────────────────────────
    ev('lm-1-reg',  '리눅스마스터', '리눅스', '1회', 'reg',  '접수', '2026-02-09', '2026-02-22'),
    ev('lm-1-exam', '리눅스마스터', '리눅스', '1회', 'exam', '시험', '2026-03-21', '2026-03-21'),
    ev('lm-1-pass', '리눅스마스터', '리눅스', '1회', 'pass', '합격발표', '2026-04-11', '2026-04-11'),

    ev('lm-2-reg',  '리눅스마스터', '리눅스', '2회', 'reg',  '접수', '2026-07-13', '2026-07-26'),
    ev('lm-2-exam', '리눅스마스터', '리눅스', '2회', 'exam', '시험', '2026-08-22', '2026-08-22'),
    ev('lm-2-pass', '리눅스마스터', '리눅스', '2회', 'pass', '합격발표', '2026-09-12', '2026-09-12'),
  ]
}

// ─────────────────────────────────────────────
// 정보처리기사 fallback (API 실패 시)
// ─────────────────────────────────────────────
function getQnetFallback(): ExamEvent[] {
  const ev = (
    id: string, round: string, type: ExamEvent['type'], typeLabel: string,
    startDate: string, endDate: string
  ): ExamEvent => ({
    id, cert: '정보처리기사', certShort: '정처기', round, type, typeLabel,
    startDate, endDate, color: COLORS['정보처리기사'], source: 'static',
  })

  return [
    ev('jgi-1-doc-reg',  '1회', 'doc_reg',  '필기 접수',    '2026-01-06', '2026-01-09'),
    ev('jgi-1-doc-exam', '1회', 'doc_exam', '필기 시험',    '2026-02-07', '2026-02-08'),
    ev('jgi-1-doc-pass', '1회', 'doc_pass', '필기 합격발표', '2026-02-26', '2026-02-26'),
    ev('jgi-1-prac-reg',  '1회', 'prac_reg',  '실기 접수',    '2026-03-17', '2026-03-20'),
    ev('jgi-1-prac-exam', '1회', 'prac_exam', '실기 시험',    '2026-04-19', '2026-05-09'),
    ev('jgi-1-prac-pass', '1회', 'prac_pass', '최종 합격발표', '2026-06-09', '2026-06-09'),

    ev('jgi-2-doc-reg',  '2회', 'doc_reg',  '필기 접수',    '2026-04-13', '2026-04-16'),
    ev('jgi-2-doc-exam', '2회', 'doc_exam', '필기 시험',    '2026-05-10', '2026-05-10'),
    ev('jgi-2-doc-pass', '2회', 'doc_pass', '필기 합격발표', '2026-05-28', '2026-05-28'),
    ev('jgi-2-prac-reg',  '2회', 'prac_reg',  '실기 접수',    '2026-06-22', '2026-06-25'),
    ev('jgi-2-prac-exam', '2회', 'prac_exam', '실기 시험',    '2026-07-19', '2026-08-02'),
    ev('jgi-2-prac-pass', '2회', 'prac_pass', '최종 합격발표', '2026-08-25', '2026-08-25'),

    ev('jgi-3-doc-reg',  '3회', 'doc_reg',  '필기 접수',    '2026-06-22', '2026-06-25'),
    ev('jgi-3-doc-exam', '3회', 'doc_exam', '필기 시험',    '2026-07-26', '2026-07-26'),
    ev('jgi-3-doc-pass', '3회', 'doc_pass', '필기 합격발표', '2026-08-12', '2026-08-12'),
    ev('jgi-3-prac-reg',  '3회', 'prac_reg',  '실기 접수',    '2026-09-07', '2026-09-10'),
    ev('jgi-3-prac-exam', '3회', 'prac_exam', '실기 시험',    '2026-10-18', '2026-11-01'),
    ev('jgi-3-prac-pass', '3회', 'prac_pass', '최종 합격발표', '2026-11-24', '2026-11-24'),
  ]
}

// ─────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────
export async function GET() {
  const [qnetEvents, staticEvents] = await Promise.all([
    fetchQnetSchedule(),
    Promise.resolve(getStaticSchedules()),
  ])

  const infoProcessingEvents = qnetEvents.length > 0 ? qnetEvents : getQnetFallback()
  const allEvents = [...infoProcessingEvents, ...staticEvents]

  // 시작일 오름차순 정렬
  allEvents.sort((a, b) => a.startDate.localeCompare(b.startDate))

  return NextResponse.json({
    events: allEvents,
    liveSource: qnetEvents.length > 0, // 정보처리기사 live 여부
  })
}
