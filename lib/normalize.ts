// 정답 비교 전 문자열 정규화
// 코딩 문제: 따옴표 통일 + 모든 공백 제거
// 개념 문제: 소문자 + 모든 공백/특수문자 제거
export function normalizeAnswer(answer: string, type: string): string {
  const trimmed = answer.trim()
  if (type === 'coding') {
    // 따옴표 통일 + 모든 공백 제거 (들여쓰기 차이 무시)
    return trimmed.replace(/'/g, '"').replace(/\s+/g, '')
  }
  // 개념 문제: 소문자 + 공백·특수문자 전부 제거
  return trimmed
    .toLowerCase()
    .replace(/\s+/g, '')           // 공백 제거
    .replace(/[.,!?;:'"()\-]/g, '') // 일반 특수문자 제거
    .replace(/[은는이가을를의]/g, '') // 한국어 조사 제거
}
