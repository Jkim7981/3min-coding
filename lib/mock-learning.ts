import dummyData from '@/data/dummy.json'

type QuestionStatus = 'completed' | 'review' | 'current' | 'preview' | 'locked'
type QuestionType = 'concept' | 'coding'
type SessionStatus = 'completed' | 'current' | 'preview' | 'locked'

export type MockQuestion = {
  id: string
  title: string
  type: QuestionType
  difficulty: string
  status: QuestionStatus
}

export type MockSession = {
  id: string
  round: number
  title: string
  status: SessionStatus
  accuracy: number
  questions: MockQuestion[]
}

export type MockSubject = {
  id: string
  name: string
  description: string
  accent: string
  instructor: string
  progress: number
  streak: number
  nextLesson: string
  weeklyAccuracy: number
  sessions: MockSession[]
}

type QuestionDetail = MockQuestion & {
  subjectId: string
  subjectName: string
  sessionId: string
  sessionTitle: string
  round: number
  prompt: string
  choices?: string[]
  codeBlock?: string
  blankLabel?: string
  hint: string
  explanation: string
  correctAnswer: string
}

const QUESTION_DETAILS: Record<
  string,
  Omit<
    QuestionDetail,
    | 'subjectId'
    | 'subjectName'
    | 'sessionId'
    | 'sessionTitle'
    | 'round'
    | 'type'
    | 'difficulty'
    | 'status'
    | 'title'
  >
> = {
  'py-1-1': {
    prompt: '파이썬에서 변수의 역할을 가장 잘 설명하는 문장을 고르세요.',
    choices: [
      '같은 코드를 자동으로 반복한다.',
      '값을 저장해서 나중에 다시 사용할 수 있게 한다.',
      '파이썬 버전을 바꾼다.',
      '프로그램을 자동으로 더 빠르게 만든다.',
    ],
    hint: '값에 이름을 붙여서 다시 꺼내 쓰는 상황을 떠올려 보세요.',
    explanation: '변수는 값에 이름을 붙여서 코드를 읽기 쉽고 재사용하기 쉽게 만들어 줍니다.',
    correctAnswer: '값을 저장해서 나중에 다시 사용할 수 있게 한다.',
  },
  'py-5-2': {
    prompt: '파이썬 함수가 return 문을 만나면 어떤 일이 일어날까요?',
    choices: [
      '첫 줄부터 다시 실행된다.',
      '값을 돌려주고 실행을 멈춘다.',
      '남은 줄을 계속 실행한다.',
      '파일 안의 변수를 모두 삭제한다.',
    ],
    hint: 'return은 함수가 일을 끝내고 결과를 건네주는 순간입니다.',
    explanation: 'return 문은 함수 실행을 끝내고 호출한 쪽으로 값을 돌려줍니다.',
    correctAnswer: '값을 돌려주고 실행을 멈춘다.',
  },
  'js-4-2': {
    prompt: '자바스크립트에서 이벤트 리스너를 붙이는 이유는 무엇일까요?',
    choices: [
      '매초마다 페이지를 새로고침하기 위해서',
      '사용자 동작을 기다렸다가 코드를 실행하기 위해서',
      'CSS 스타일을 자동으로 생성하기 위해서',
      '브라우저 캐시에 바로 저장하기 위해서',
    ],
    hint: '클릭, 입력, 제출 같은 동작이 일어날 때 반응하는 기능입니다.',
    explanation: '이벤트 리스너는 특정 사용자 동작을 기다렸다가 맞는 로직을 실행하게 해줍니다.',
    correctAnswer: '사용자 동작을 기다렸다가 코드를 실행하기 위해서',
  },
  'js-5-1': {
    prompt: '컴포넌트 기반 UI에서 props의 가장 중요한 역할은 무엇일까요?',
    choices: [
      '패키지를 자동으로 설치한다.',
      '컴포넌트에 데이터를 전달한다.',
      '모달 창을 자동으로 연다.',
      'CSS 변수를 바꾼다.',
    ],
    hint: '부모 컴포넌트에서 자식 컴포넌트로 값을 넘기는 상황을 떠올려 보세요.',
    explanation:
      'props는 부모 컴포넌트가 자식 컴포넌트에 값을 전달해서 동적인 UI를 만들 수 있게 해줍니다.',
    correctAnswer: '컴포넌트에 데이터를 전달한다.',
  },
  'py-1-3': {
    prompt: '변수에 값 10이 저장되도록 빈칸을 채우세요.',
    codeBlock: 'score = ___',
    blankLabel: '저장할 값',
    hint: '숫자 자체만 넣으면 됩니다.',
    explanation: '숫자 10을 그대로 대입하면 변수에 10이 저장됩니다.',
    correctAnswer: '10',
  },
  'py-5-3': {
    prompt: '입력받은 수의 제곱을 반환하도록 빈칸을 채우세요.',
    codeBlock: 'def square(number):\n    return ___',
    blankLabel: '반환식',
    hint: '같은 수를 한 번 더 곱하면 됩니다.',
    explanation: '제곱은 같은 수를 자기 자신과 곱하는 방식으로 표현할 수 있습니다.',
    correctAnswer: 'number * number',
  },
  'js-4-3': {
    prompt: '요소에 `active` 클래스를 토글하도록 빈칸을 채우세요.',
    codeBlock: "button.addEventListener('click', () => {\n  button.classList.___\n})",
    blankLabel: 'classList 메서드',
    hint: '현재 상태에 따라 클래스를 넣거나 빼는 메서드를 떠올려 보세요.',
    explanation: 'classList.toggle("active")는 active 클래스를 켜고 끄는 데 사용됩니다.',
    correctAnswer: 'toggle("active")',
  },
  'js-5-3': {
    prompt: '리액트에서 배열의 각 항목을 렌더링하도록 빈칸을 채우세요.',
    codeBlock: '{items.___(item => <li key={item.id}>{item.name}</li>)}',
    blankLabel: '배열 메서드',
    hint: '배열의 각 항목을 새로운 JSX로 바꾸는 메서드를 사용하면 됩니다.',
    explanation: 'map은 배열의 각 항목을 JSX 요소로 변환할 때 가장 자주 쓰는 메서드입니다.',
    correctAnswer: 'map',
  },
}

function getFallbackDetail(question: MockQuestion) {
  if (question.type === 'concept') {
    return {
      prompt: `${question.title}에 가장 알맞은 답을 고르세요.`,
      choices: ['선택지 1', '선택지 2', '선택지 3', '선택지 4'],
      hint: '핵심 개념과 맞지 않는 선택지부터 지워보세요.',
      explanation: '이 설명은 나중에 실제 AI 해설로 교체할 수 있는 기본 문구입니다.',
      correctAnswer: '선택지 2',
    }
  }

  return {
    prompt: `${question.title} 문제의 빈칸을 채우세요.`,
    codeBlock: 'function solve() {\n  return ___\n}',
    blankLabel: '빈칸 답안',
    hint: '빠진 한 줄이나 표현식만 정확히 채우는 데 집중해 보세요.',
    explanation: '이 설명은 나중에 실제 AI 해설로 교체할 수 있는 기본 문구입니다.',
    correctAnswer: '정답 표현식',
  }
}

export function getDashboardData() {
  return dummyData
}

export function getAllQuestions(): QuestionDetail[] {
  return dummyData.subjects.flatMap((subject) =>
    subject.sessions.flatMap((session) =>
      session.questions.map((question) => ({
        ...question,
        subjectId: subject.id,
        subjectName: subject.name,
        sessionId: session.id,
        sessionTitle: session.title,
        round: session.round,
        ...(QUESTION_DETAILS[question.id] ?? getFallbackDetail(question)),
      }))
    )
  )
}

export function getQuestionById(questionId: string) {
  return getAllQuestions().find((question) => question.id === questionId) ?? null
}

export function getNextQuestionId(questionId: string) {
  const questions = getAllQuestions()
  const currentIndex = questions.findIndex((question) => question.id === questionId)
  if (currentIndex === -1) return null
  return questions[currentIndex + 1]?.id ?? null
}
