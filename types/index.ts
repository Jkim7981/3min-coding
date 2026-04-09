export type UserRole = 'student' | 'teacher'
export type QuestionType = 'concept' | 'coding'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type ReportPeriod = 'weekly' | 'monthly'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
}

export interface Subject {
  id: string
  name: string
  teacher_id: string
  created_at: string
}

export interface Enrollment {
  id: string
  student_id: string
  subject_id: string
}

export interface Lesson {
  id: string
  subject_id: string
  title: string
  content: string
  session_number: number
  created_at: string
}

export interface Question {
  id: string
  lesson_id: string
  type: QuestionType
  difficulty: Difficulty
  question: string
  code_template?: string
  expected_output?: string
  answer: string
  hint?: string
  explanation?: string
  created_at: string
}

export interface UserAnswer {
  id: string
  student_id: string
  question_id: string
  subject_id: string
  attempt: 1 | 2
  answer: string
  is_correct: boolean
  used_hint: boolean
  answered_at: string
}

export interface WeaknessReport {
  id: string
  student_id: string
  subject_id: string
  period: ReportPeriod
  summary: string
  created_at: string
}
