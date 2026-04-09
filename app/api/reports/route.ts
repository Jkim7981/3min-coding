import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import openai from '@/lib/openai'
import { requireAuth } from '@/lib/auth'

// GET /api/reports?period=weekly&subject_id=xxx - 취약점 리포트 조회
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const userId = user.id
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'weekly'
    const subject_id = searchParams.get('subject_id')

    let query = supabaseAdmin
      .from('weakness_reports')
      .select('*')
      .eq('student_id', userId)
      .eq('period', period)

    if (subject_id) {
      query = query.eq('subject_id', subject_id)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return NextResponse.json(data || null)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// POST /api/reports - 취약점 리포트 생성 (주간/월간 트리거)
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const userId = user.id
    const { period = 'weekly', subject_id } = await req.json()

    // 오늘 이미 생성된 리포트가 있으면 캐시 반환 (OpenAI 중복 호출 방지)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    let cacheQuery = supabaseAdmin
      .from('weakness_reports')
      .select('*')
      .eq('student_id', userId)
      .eq('period', period)
      .gte('created_at', todayStart.toISOString())

    if (subject_id) {
      cacheQuery = cacheQuery.eq('subject_id', subject_id)
    }

    const { data: cached } = await cacheQuery
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (cached) {
      return NextResponse.json({
        report: cached,
        analysis: JSON.parse(cached.summary),
        cached: true,
      })
    }

    // 기간 계산
    const days = period === 'weekly' ? 7 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 해당 기간 오답 데이터 조회
    let wrongQuery = supabaseAdmin
      .from('user_answers')
      .select(
        `
        *,
        questions (
          type,
          difficulty,
          question,
          answer,
          lesson_id,
          lessons (
            title,
            subject_id,
            subjects (name)
          )
        )
      `
      )
      .eq('student_id', userId)
      .eq('is_correct', false)
      .gte('answered_at', startDate.toISOString())
      .order('answered_at', { ascending: false })

    if (subject_id) {
      wrongQuery = wrongQuery.eq('subject_id', subject_id)
    }

    const { data: wrongAnswers, error: waError } = await wrongQuery

    if (waError) throw waError

    // 오답 데이터가 없으면 리포트 생성 불필요
    if (!wrongAnswers || wrongAnswers.length === 0) {
      return NextResponse.json({
        message: `최근 ${days}일간 오답이 없어요! 훌륭해요 🎉`,
        summary: null,
      })
    }

    // OpenAI로 취약점 패턴 분석
    const wrongSummary = wrongAnswers.map((wa) => ({
      문제유형: wa.questions?.type,
      난이도: wa.questions?.difficulty,
      문제: wa.questions?.question,
      정답: wa.questions?.answer,
      학생답안: wa.answer,
      과목: wa.questions?.lessons?.subjects?.name,
      수업: wa.questions?.lessons?.title,
    }))

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `너는 학습 분석 전문가야. 학생의 오답 데이터를 보고 취약점을 분석해줘.
한국어로, 친근하고 구체적으로 작성해.
분석 결과는 아래 JSON 형식으로만 답해:
{
  "weak_concepts": ["취약한 개념1", "취약한 개념2"],
  "weak_types": ["취약한 문제 유형"],
  "pattern": "전반적인 취약 패턴 설명 (2-3문장)",
  "advice": ["조언1", "조언2", "조언3"],
  "encouragement": "격려 메시지 (1문장)"
}`,
        },
        {
          role: 'user',
          content: `다음은 학생의 최근 ${days}일간 오답 목록이야 (총 ${wrongAnswers.length}개):

${JSON.stringify(wrongSummary, null, 2)}

어떤 개념이나 유형에서 자주 틀리는지 분석하고, 개선을 위한 조언을 줘.`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const analysis = JSON.parse(completion.choices[0].message.content!)

    // 리포트 저장
    const { data: report, error: rError } = await supabaseAdmin
      .from('weakness_reports')
      .insert({
        student_id: userId,
        subject_id: subject_id || null,
        period,
        summary: JSON.stringify(analysis),
      })
      .select()
      .single()

    if (rError) throw rError

    return NextResponse.json({
      report,
      analysis,
      wrong_count: wrongAnswers.length,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '리포트 생성 중 오류가 발생했습니다' }, { status: 500 })
  }
}
