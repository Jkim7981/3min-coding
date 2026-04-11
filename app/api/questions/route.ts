import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import openai from '@/lib/openai'
import { validateQuestions, Question } from '@/lib/validateQuestion'
import { requireAuth, requireTeacher } from '@/lib/auth'
import { checkSubjectAccess } from '@/lib/access'

// GET /api/questions?subject_id=xxx - 오늘의 문제 조회 (학생)
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const { searchParams } = new URL(req.url)
    const subject_id = searchParams.get('subject_id')

    if (!subject_id) {
      return NextResponse.json({ error: 'subject_id가 필요합니다' }, { status: 400 })
    }

    const hasAccess = await checkSubjectAccess(user.id, subject_id, user.role)
    if (!hasAccess) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 })
    }

    // 해당 과목의 lesson_id 목록 먼저 조회 (PostgREST는 관계 테이블 필터 직접 미지원)
    const { data: lessons, error: lsError } = await supabaseAdmin
      .from('lessons')
      .select('id')
      .eq('subject_id', subject_id)

    if (lsError) throw lsError

    const lessonIds = lessons?.map((l) => l.id) ?? []

    if (lessonIds.length === 0) {
      return NextResponse.json([])
    }

    // 이미 정답 맞힌 문제 ID 조회 (해당 과목 기준)
    const { data: correct } = await supabaseAdmin
      .from('user_answers')
      .select('question_id')
      .eq('student_id', user.id)
      .eq('subject_id', subject_id)
      .eq('is_correct', true)

    const solvedIds = correct?.map((a) => a.question_id) ?? []

    // 아직 안 푼 문제만 조회
    let query = supabaseAdmin
      .from('questions')
      .select('*, lessons(title, session_number)')
      .in('lesson_id', lessonIds)
      .order('created_at', { ascending: false })
      .limit(5)

    if (solvedIds.length > 0) {
      query = query.not('id', 'in', `(${solvedIds.join(',')})`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// POST /api/questions - AI 문제 생성 (강사)
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireTeacher()
    if (response) return response

    const { lesson_id, difficulty = 'medium', count = 3 } = await req.json()

    if (!lesson_id) {
      return NextResponse.json({ error: 'lesson_id가 필요합니다' }, { status: 400 })
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return NextResponse.json({ error: 'difficulty는 easy, medium, hard 중 하나여야 합니다' }, { status: 400 })
    }

    if (typeof count !== 'number' || count < 1 || count > 10) {
      return NextResponse.json({ error: 'count는 1~10 사이의 숫자여야 합니다' }, { status: 400 })
    }

    // 수업 자료 조회 (subject_id 포함해서 소유권 확인용)
    const { data: lesson, error: lError } = await supabaseAdmin
      .from('lessons')
      .select('content, title, subject_id')
      .eq('id', lesson_id)
      .single()

    if (lError || !lesson) {
      return NextResponse.json({ error: '수업 자료를 찾을 수 없습니다' }, { status: 404 })
    }

    // 이 lesson이 본인 과목 소속인지 확인
    const hasAccess = await checkSubjectAccess(user.id, lesson.subject_id, user.role)
    if (!hasAccess) {
      return NextResponse.json(
        { error: '본인 과목의 수업에만 문제를 생성할 수 있습니다' },
        { status: 403 }
      )
    }

    // OpenAI로 문제 생성
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `너는 코딩 학원 강사 도우미야. 수업 자료를 분석해서 복습 문제를 만들어.
난이도는 ${difficulty} 수준으로 생성해. (easy / medium / hard)
문제 유형: 개념 문제(객관식/단답형), 코딩 문제(빈칸 채우기, ___ 사용)
응답은 반드시 아래 JSON 형식으로만 답해.`,
        },
        {
          role: 'user',
          content: `다음 수업 자료를 바탕으로 복습 문제 ${count}개를 만들어줘.

[수업 자료]
${lesson.content}

응답 형식:
{
  "questions": [
    {
      "type": "concept 또는 coding",
      "difficulty": "${difficulty}",
      "question": "문제 내용",
      "code_template": "코딩 문제일 때만. 빈칸은 ___로 표시. 함수 정의만 작성하고 print/호출 코드는 넣지 말 것. 개념 문제는 null",
      "test_cases": [
        {"input": [인자1, 인자2], "expected": 기댓값},
        {"input": [인자3, 인자4], "expected": 기댓값2}
      ],
      "expected_output": "test_cases[0]의 기댓값을 문자열로. 개념 문제는 null",
      "answer": "빈칸에 들어갈 정답",
      "hint": "힌트",
      "explanation": "해설",
      "concept_tags": ["개념태그1", "개념태그2"]
    }
  ]
}

코딩 문제 작성 규칙:
- code_template에는 함수 정의만 작성 (print나 함수 호출 코드 절대 포함 금지)
- test_cases는 반드시 2개 이상 제공
- input은 항상 배열 형태 (인자가 1개여도 [값] 형태로)
- expected는 함수의 return 값 (문자열이면 "값", 숫자면 숫자, 리스트면 배열)
- concept_tags는 한국어로 1~3개`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    let result
    try {
      const content = completion.choices[0]?.message?.content
      if (!content) throw new Error('no content')
      result = JSON.parse(content)
    } catch {
      return NextResponse.json(
        { error: 'AI 응답 파싱에 실패했습니다. 다시 시도해주세요.' },
        { status: 422 }
      )
    }
    const rawQuestions = result.questions

    // 품질 검증 - 기준 미달 문제 필터링
    const validQuestions = await validateQuestions(rawQuestions)

    // 유효한 문제가 너무 적으면 경고
    if (validQuestions.length === 0) {
      return NextResponse.json(
        { error: '품질 기준을 통과한 문제가 없습니다. 수업 자료를 확인해주세요.' },
        { status: 422 }
      )
    }

    // DB에 검증된 문제만 저장
    const { data: saved, error: sError } = await supabaseAdmin
      .from('questions')
      .insert(
        validQuestions.map((q: Question) => ({
          lesson_id,
          type: q.type,
          difficulty: q.difficulty,
          question: q.question,
          code_template: q.code_template,
          expected_output: q.expected_output,
          test_cases: q.test_cases ?? null,
          answer: q.answer,
          hint: q.hint,
          explanation: q.explanation,
          concept_tags: q.concept_tags ?? [],
        }))
      )
      .select()

    if (sError) throw sError

    return NextResponse.json({
      questions: saved,
      generated: rawQuestions.length,
      passed_validation: validQuestions.length,
      rejected: rawQuestions.length - validQuestions.length,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '문제 생성 중 오류가 발생했습니다' }, { status: 500 })
  }
}
