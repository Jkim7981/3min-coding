import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

// GET /api/analytics/weak-concepts?subject_id=xxx&days=7&limit=3
// 최근 N일간 가장 자주 틀린 개념 태그 Top K 반환
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const { searchParams } = new URL(req.url)
    const subject_id = searchParams.get('subject_id')
    const days = Math.min(parseInt(searchParams.get('days') ?? '7'), 30) // 최대 30일
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '3'), 10) // 최대 10개

    const since = new Date(Date.now() - days * 86400000).toISOString()

    // 최근 N일 오답 + 해당 문제의 concept_tags 조회
    let query = supabaseAdmin
      .from('user_answers')
      .select('questions(concept_tags)')
      .eq('student_id', user.id)
      .eq('is_correct', false)
      .gte('answered_at', since)

    if (subject_id) {
      query = query.eq('subject_id', subject_id)
    }

    const { data, error: dbError } = await query

    if (dbError) throw dbError

    // concept_tags 배열 펼쳐서 빈도 집계
    const tagCount = new Map<string, number>()

    for (const row of data ?? []) {
      const tags = (row.questions as unknown as { concept_tags: string[] } | null)?.concept_tags ?? []
      for (const tag of tags) {
        tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1)
      }
    }

    // 빈도 높은 순 정렬 후 Top K 반환
    const weak_concepts = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([concept, count]) => ({ concept, count }))

    return NextResponse.json({
      weak_concepts,
      period_days: days,
      total_wrong: data?.length ?? 0,
    })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
