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

    // lesson_id 목록으로 문제 조회
    const { data, error } = await supabaseAdmin
      .from('questions')
      .select('*, lessons(title, session_number)')
      .in('lesson_id', lessonIds)
      .order('created_at', { ascending: false })
      .limit(5)

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
      "code_template": "코딩 문제일 때만 빈칸 템플릿 (___사용), 개념 문제는 null",
      "expected_output": "코딩 문제 예상 출력값, 개념 문제는 null",
      "answer": "정답",
      "hint": "힌트",
      "explanation": "해설"
    }
  ]
}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content!)
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
          answer: q.answer,
          hint: q.hint,
          explanation: q.explanation,
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
