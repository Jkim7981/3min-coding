// 정답 비교 전 문자열 정규화
// 코딩 문제: 따옴표 통일 + 연속 공백 정규화
// 개념 문제: 대소문자 무시 + 앞뒤 공백 제거
export function normalizeAnswer(answer: string, type: string): string {
  const trimmed = answer.trim()
  if (type === 'coding') {
    return trimmed.replace(/'/g, '"').replace(/\s+/g, ' ')
  }
  return trimmed.toLowerCase()
}
