/**
 * 임시 학원 커리큘럼 데이터
 * 실제 서비스에서는 학원 DB API로 대체 예정
 *
 * name: Supabase subjects 테이블의 name 값과 일치해야 함
 * totalSessions: 해당 과목의 전체 회차 수 (이 이상 업로드 불가)
 */

export interface AcademyCurriculum {
  name: string
  totalSessions: number
  description?: string
}

export const ACADEMY_CURRICULUM: AcademyCurriculum[] = [
  {
    name: 'Python 기초',
    totalSessions: 12,
    description: '파이썬 문법 기초부터 함수, 클래스까지',
  },
  {
    name: 'JavaScript 기초',
    totalSessions: 10,
    description: 'ES6 문법, DOM 조작, 비동기 처리',
  },
  {
    name: 'Java 기초',
    totalSessions: 14,
    description: '객체지향 프로그래밍, 자료구조 기초',
  },
  {
    name: 'C++ 기초',
    totalSessions: 10,
    description: '포인터, 메모리 관리, STL',
  },
  {
    name: '알고리즘 기초',
    totalSessions: 8,
    description: '정렬, 탐색, 그래프 알고리즘',
  },
]

/** 과목명으로 커리큘럼 정보 조회 (없으면 undefined) */
export function getAcademyCurriculum(subjectName: string): AcademyCurriculum | undefined {
  return ACADEMY_CURRICULUM.find((c) => c.name === subjectName)
}
