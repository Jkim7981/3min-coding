# 3분코딩 API 명세서

> 백엔드 담당: jaeki  
> 프론트에서 API 호출할 때 이 문서 기준으로 맞춰줘!

---

## 공통 사항

- 모든 요청/응답은 `Content-Type: application/json`
- 로그인이 필요한 API는 NextAuth 세션이 있어야 함 (쿠키 자동 전송)
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
- 강사: 내가 만든 과목 목록
- 학생: 내가 수강 중인 과목 목록

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
GET /api/sessions?subject_id={subject_id}
```

---

## 문제

### 오늘의 문제 조회 (학생)
```
GET /api/questions?subject_id={subject_id}
```

Response 200 - 문제 배열 (최대 5개)
- type이 "coding"이면 code_template에 빈칸(___)이 포함된 코드 있음

### AI 문제 생성 (강사만)
```
POST /api/questions
```

Request Body
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| lesson_id | string | O | 수업 자료 ID |
| difficulty | string | | "easy" / "medium" (기본값) / "hard" |
| count | number | | 생성할 문제 수 (기본값: 3) |

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

[중요] attempt는 서버에서 자동 계산 - 보내지 않아도 됨. 문제당 최대 2번까지만 가능.

Response 200
```json
{
  "is_correct": true,
  "correct_answer": null,
  "review_scheduled": false,
  "next_review_days": null
}
```
- correct_answer: 2차 시도에서 틀렸을 때만 정답 공개, 나머지는 null

---

## 오답 해설 (2차 오답 시 자동 호출)

```
POST /api/explanation
```

Request Body
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| question | string | O | 문제 내용 |
| answer | string | O | 정답 |
| student_answer | string | O | 학생 답안 |

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
| code | string | O | 실행할 코드 전체 |

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

