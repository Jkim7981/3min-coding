# 3분코딩 API 명세서

> 백엔드 담당: jaeki  
> 프론트에서 API 호출할 때 이 문서 기준으로 맞춰줘!

---

## 공통 사항

- 모든 요청/응답은 `Content-Type: application/json`
- 로그인이 필요한 API는 NextAuth 세션이 있어야 함 (쿠키 자동 전송)
- 모든 필드명은 **snake_case** 사용 (`question_id`, `subject_id` 등)
- 에러 응답 형식: `{ "error": "에러 메시지" }`

---

## 인증

### 회원가입
```
POST /api/auth/signup
```
**로그인 불필요**

Request Body
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| email | string | O | 이메일 |
| password | string | O | 비밀번호 (최소 6자) |
| name | string | O | 이름 |
| role | string | | "student" (기본값) 또는 "teacher" |

Response 201
```json
{
  "message": "회원가입이 완료됐습니다",
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "student" }
}
```

### 로그인 / 로그아웃
NextAuth 기본 제공
```
POST /api/auth/signin
POST /api/auth/signout
GET  /api/auth/session
```

---

## 과목

### 과목 생성 (강사만)
```
POST /api/subjects
```

Request Body
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | O | 과목 이름 |

Response 201
```json
{ "id": "uuid", "name": "파이썬 기초반", "teacher_id": "uuid", "created_at": "..." }
```

### 내 과목 목록 조회
```
GET /api/subjects
```
강사/학생 모두 동일한 shape 반환
```json
[
  { "id": "uuid", "name": "파이썬 기초반", "teacher_id": "uuid", "created_at": "..." }
]
```

---

## 수강 등록

### 수강 신청 / 등록
```
POST /api/enrollments
```

Request Body
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| subject_id | string | O | 과목 ID |
| student_id | string | | 강사가 학생 직접 등록 시 (선택) |

- 학생: `subject_id`만 보내면 본인 자동 등록
- 강사: `subject_id` + `student_id` 함께 보내면 학생 등록

Response 201
```json
{ "id": "uuid", "student_id": "uuid", "subject_id": "uuid" }
```

### 수강 취소
```
DELETE /api/enrollments
```

Request Body
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| subject_id | string | O | 취소할 과목 ID |

---

## 수업 자료

### 수업 자료 업로드 (강사만)
```
POST /api/sessions
```

Request Body
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| subject_id | string | O | 과목 ID |
| title | string | O | 수업 제목 |
| content | string | O | 수업 자료 내용 |
| session_number | number | | 수업 회차 번호 |

### 수업 자료 목록 조회
```
GET /api/subjects/[id]/sessions
```
- `[id]`: 과목 ID

---

## 문제

### 오늘의 문제 조회 (학생, 이미 맞힌 문제 자동 제외)
```
GET /api/questions?subject_id={subject_id}
```

Response 200 - 문제 배열 (최대 5개)
- `type`이 `"coding"`이면 `code_template`에 빈칸(`___`) 포함
- `answer`, `explanation` 필드 미포함 (보안)

### 특정 회차 문제 목록 조회
```
GET /api/sessions/[id]/questions
```
- `[id]`: 수업 자료(session) ID

### AI 문제 생성 (강사만)
```
POST /api/questions
```

Request Body
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| lesson_id | string | O | 수업 자료 ID |
| difficulty | string | | "easy" / "medium" (기본값) / "hard" |
| count | number | | 생성할 문제 수 1~10 (기본값: 3) |

### 틀린 문제 재출제
```
GET /api/questions/retry?subject_id={subject_id}
```

Response 200
```json
{ "questions": [...], "count": 3 }
```

---

## 답안 제출

```
POST /api/answers
```

Request Body
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| question_id | string | O | 문제 ID |
| answer | string | O | 학생 답안 |

[중요] `attempt`는 서버 자동 계산 — 보내지 않아도 됨. 문제당 최대 2번, 이미 맞힌 문제 재제출 불가.

Response 200
```json
{
  "is_correct": true,
  "correct_answer": null,
  "review_scheduled": false,
  "next_review_days": null
}
```
- `correct_answer`: 2차 시도에서도 틀렸을 때만 정답 공개, 나머지는 `null`

---

## 오답 해설 (2차 오답 시 자동 호출)

```
POST /api/explanation
```

Request Body
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| question_id | string | O | 문제 ID |
| student_answer | string | O | 학생 답안 |

[변경] 기존 question/answer 직접 전송 방식 → question_id로 변경 (보안)

Response 200
```json
{ "explanation": "왜 틀렸는지 AI 설명..." }
```

---

## 코드 실행

```
POST /api/execute
```

Request Body
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| language | string | O | "python" / "javascript" / "java" |
| code | string | O | 실행할 코드 전체 (최대 5000자) |

Response 200
```json
{ "stdout": "Hello World\n", "stderr": "", "code": 0 }
```

---

## 난이도

```
GET /api/difficulty?subject_id={subject_id}
```

Response 200
```json
{ "difficulty": "medium", "correct_rate": 0.7 }
```

---

## 복습

### 오늘 복습할 문제 조회
```
GET /api/reviews
```

Response 200
```json
{
  "reviews": [
    {
      "id": "uuid",
      "next_review_date": "2026-04-10",
      "questions": {
        "id": "uuid", "type": "concept", "question": "...", "hint": "..."
      }
    }
  ],
  "count": 3
}
```
- `answer`, `explanation` 미포함 (보안)

### 복습 답안 제출
```
POST /api/reviews
```

Request Body
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| question_id | string | O | 문제 ID |
| student_answer | string | O | 학생 답안 |
| attempt | number | | 시도 횟수 (기본값: 1) |

---

## 취약점 리포트

```
GET /api/reports?period=weekly&subject_id={subject_id}
POST /api/reports
```

POST Body
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| period | string | | "weekly" (기본값) / "monthly" |
| subject_id | string | | 특정 과목만 분석 (선택) |

---

## 학습 통계

```
GET /api/stats?subject_id={subject_id}
```

Response 200
```json
{
  "total_answered": 42,
  "correct_rate": 0.76,
  "streak": 5,
  "this_week": 12,
  "due_reviews": 3,
  "weak_concepts": [
    { "concept": "for문", "count": 4 },
    { "concept": "리스트", "count": 2 }
  ],
  "recent_accuracy_trend": [
    { "date": "2026-04-04", "correct_rate": 0.8, "count": 5 }
  ],
  "by_subject": [
    { "subject_id": "uuid", "total": 20, "correct_rate": 0.8 }
  ]
}
```

---

## 취약 개념 분석

```
GET /api/analytics/weak-concepts?subject_id={subject_id}&days=7&limit=3
```

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| subject_id | 없음 | 과목 필터 (선택) |
| days | 7 | 분석 기간 (최대 30) |
| limit | 3 | 반환할 개념 수 (최대 10) |

Response 200
```json
{
  "weak_concepts": [
    { "concept": "for문", "count": 4 },
    { "concept": "리스트 인덱싱", "count": 3 }
  ],
  "period_days": 7,
  "total_wrong": 8
}
```
