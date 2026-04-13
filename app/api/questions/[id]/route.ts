import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

// GET /api/questions/[id] - 단일 문제 조회
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireAuth()
    if (response) return response

    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('questions')
      .select('id, type, difficulty, question, code_template, expected_output, test_cases, hint, concept_tags, lesson_id')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '문제를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
