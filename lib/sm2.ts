// SM-2 간격 반복 알고리즘
// 참고: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
//
// quality 점수 기준:
// 5 = 1차 시도에서 정답 (완벽)
// 3 = 1차 오답 + 2차 정답 (힌트 후 맞춤)
// 1 = 2차 시도에서도 오답 (완전히 모름)

export interface SM2State {
  interval_days: number
  easiness_factor: number
  repetition_count: number
}

export interface SM2Result extends SM2State {
  next_review_date: string
  quality: number
}

export function calculateSM2(state: SM2State, quality: number): SM2Result {
  let { interval_days, easiness_factor, repetition_count } = state

  // quality 3 미만이면 처음부터 다시 (틀린 경우)
  if (quality < 3) {
    repetition_count = 0
    interval_days = 1
  } else {
    // 반복 횟수에 따른 interval 계산
    if (repetition_count === 0) {
      interval_days = 1
    } else if (repetition_count === 1) {
      interval_days = 6
    } else {
      interval_days = Math.round(interval_days * easiness_factor)
    }
    repetition_count += 1
  }

  // EF(난이도 계수) 업데이트 - 최소값 1.3
  easiness_factor = Math.max(
    1.3,
    easiness_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  )

  // interval 최대 60일로 제한
  interval_days = Math.min(interval_days, 60)

  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + interval_days)
  const next_review_date = nextDate.toISOString().split('T')[0]

  return {
    interval_days,
    easiness_factor,
    repetition_count,
    next_review_date,
    quality,
  }
}

// 시도 결과를 quality 점수로 변환
export function getQualityScore(attempt: number, isCorrect: boolean): number {
  if (attempt === 1 && isCorrect) return 5  // 1차 정답: 완벽
  if (attempt === 2 && isCorrect) return 3  // 2차 정답: 힌트 후 맞춤
  return 1                                   // 2차 오답: 완전히 모름
}
