import openai from '@/lib/openai'

export interface Question {

  type: 'concept' | 'coding'
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  code_template?: string | null
  expected_output?: string | null
  answer: string
  hint: string
  explanation: string
  concept_tags?: string[]
}

interface ValidationResult {
  valid: boolean
  score: number // 1~5점
  reason?: string
}

// 개별 문제 품질 검증 (OpenAI)
export async function validateQuestion(question: Question): Promise<ValidationResult> {
  // 1차: 기본 구조 검증 (빠른 체크)
  if (!question.question || question.question.length < 10) {
    return { valid: false, score: 0, reason: '문제 내용이 너무 짧습니다' }
  }
  if (!question.answer || question.answer.trim() === '') {
    return { valid: false, score: 0, reason: '정답이 없습니다' }
  }
  if (question.type === 'coding' && !question.code_template?.includes('___')) {
    return { valid: false, score: 0, reason: '코딩 문제에 빈칸(___) 이 없습니다' }
  }

  // 2차: OpenAI로 품질 점수 검증
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 검증용은 mini 모델로 비용 절감
      messages: [
        {
          role: 'system',
          content: `너는 코딩 교육 문제 품질 검수관이야.
주어진 복습 문제를 아래 기준으로 평가해서 JSON으로만 응답해:
{
  "score": 1~5 (5=완벽, 3=보통, 1=불량),
  "valid": true/false (3점 이상이면 true),
  "reason": "점수가 3 미만일 때만 이유 설명"
}

평가 기준:
- 정확성: 정답이 실제로 맞는가? (오류 없는가?)
- 명확성: 문제가 이해하기 쉬운가?
- 적절성: 복습용으로 적합한 난이도인가?
- 힌트/해설: 학습에 도움이 되는가?`,
        },
        {
          role: 'user',
          content: `문제 유형: ${question.type}
문제: ${question.question}
${question.code_template ? `코드 템플릿:\n${question.code_template}` : ''}
정답: ${question.answer}
힌트: ${question.hint}
해설: ${question.explanation}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200,
    })

    const result = JSON.parse(completion.choices[0].message.content!)
    return {
      valid: result.valid ?? result.score >= 3,
      score: result.score,
      reason: result.reason,
    }
  } catch {
    // 검증 API 실패 시 기본 통과 (서비스 중단 방지)
    return { valid: true, score: 3, reason: '검증 API 오류로 기본 통과' }
  }
}

// 여러 문제 배치 검증 — 순차 처리로 OpenAI rate limit 방지
export async function validateQuestions(questions: Question[]): Promise<Question[]> {
  const validQuestions: Question[] = []

  for (const q of questions) {
    const validation = await validateQuestion(q)
    if (validation.valid) {
      validQuestions.push(q)
    }
  }

  return validQuestions
}
