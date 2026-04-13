# 3분코딩 (Three-Min-Coding) — CLAUDE.md

> 2026 제1회 KEG 바이브코딩 콘테스트 출품작  
> AI 기반 학원생 맞춤형 복습 웹앱

---

## 프로젝트 개요

코딩 학원 강사가 수업 자료를 업로드하면, OpenAI API가 맞춤형 복습 문제를 자동 생성하고 학생 스마트폰으로 매일 배포한다. 학생은 하루 3분으로 복습을 완료한다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| AI | OpenAI API (gpt-4o, gpt-4o-mini) |
| 코드 실행 | Judge0 CE (https://ce.judge0.com) |
| 배포 | Vercel |
| 인증 | NextAuth.js |
| PWA | next-pwa |

---

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
CRON_SECRET=
VAPID_MAILTO=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

> ⚠️ 실제 키 값은 절대 커밋하지 않는다. 값은 `.env.local`에만 보관.

---

## 핵심 기능 명세

### 1. AI 문제 자동 생성

강사가 수업 자료(텍스트/코드 파일)를 업로드하면 OpenAI API가 자동으로 문제를 생성한다.

**문제 유형 2가지:**
- **개념 문제**: 객관식 / 단답형 (이론, 용어 이해)
- **코딩 문제**: 빈칸 채우기 형식 (코드 일부를 `___`로 비워둠) + Judge0으로 실제 실행

**프롬프트 구조 (문제 생성):**
```
system: 너는 코딩 학원 강사 도우미야. 수업 자료를 분석해서 복습 문제를 만들어.
        난이도는 {difficulty} 수준으로 생성해. (easy / medium / hard)
        문제 유형: 개념 문제(객관식/단답형), 코딩 문제(빈칸 채우기)
        응답은 반드시 JSON 형식으로.

user: 다음 수업 자료를 바탕으로 복습 문제 {n}개를 만들어줘.
      [수업 자료 내용]
```

**생성 JSON 스키마:**
```json
{
  "questions": [
    {
      "type": "concept | coding",
      "difficulty": "easy | medium | hard",
      "question": "문제 내용",
      "code_template": "for ___ in range(10):\n    print(___)",
      "answer": "정답",
      "hint": "힌트 내용",
      "explanation": "정답 해설"
    }
  ]
}
```

---

### 2. 적응형 난이도 시스템

학생의 누적 정답률에 따라 다음 문제 생성 시 난이도 파라미터를 자동 조절한다.

**난이도 조절 로직:**
```
최근 10문제 정답률 >= 80%  →  difficulty: "hard"
최근 10문제 정답률 50~79%  →  difficulty: "medium"
최근 10문제 정답률 < 50%   →  difficulty: "easy"
```

- 과목별로 독립적으로 계산
- DB의 `user_answers` 테이블에서 최근 10개 기록으로 계산
- 첫 시작 시 기본값: `"medium"`

---

### 3. 2단계 오답 플로우

문제를 틀렸을 때 바로 정답을 주지 않고 재시도 기회를 준다.

```
문제 풀기
    ↓
[1차 오답]
  → "다시 한번 생각해봐!" 메시지 표시
  → [힌트 보기] 버튼 노출 (선택, 누르면 hint 필드 표시)
  → 재시도 입력창 활성화
    ↓
[2차 오답 OR 2차 정답]
  → 정답 공개
  → OpenAI가 자동 생성한 해설 표시:
      - 왜 틀렸는지
      - 왜 이 답이 정답인지
      - 관련 개념 설명
[1차 정답]
  → 바로 정답 처리, 간단한 칭찬 메시지
```

**해설 생성 프롬프트:**
```
system: 너는 친절한 코딩 튜터야. 학생이 문제를 틀렸을 때 해설을 제공해.
        한국어로, 쉽고 간결하게 설명해.

user: 문제: {question}
      정답: {answer}
      학생 답안: {student_answer}
      
      왜 틀렸는지, 왜 {answer}이 정답인지 설명해줘.
```

- 해설은 2차 오답 시 자동 호출 (사용자가 별도 액션 불필요)
- 힌트 버튼은 1차 오답 시에만 노출

---

### 4. 코드 실행 (Judge0 CE)

코딩 문제(빈칸 채우기)에서 학생이 빈칸을 채우면 실제로 코드를 실행해 결과를 보여준다.

**지원 언어:** Python, JavaScript, Java (학원 수업 기준)

**API 호출:**
```
POST https://ce.judge0.com/submissions?base64_encoded=false&wait=true
Headers:
  Content-Type: application/json
Body:
  {
    "language_id": 71,
    "source_code": "완성된 코드",
    "stdin": ""
  }
```

**language_id 매핑:**
- Python: 71
- JavaScript: 63
- Java: 62

- 테스트 케이스 모드: 함수명 자동 추출 후 러너 코드 삽입해 케이스별 통과 여부 판정
- 실행 타임아웃: 15초

---

### 5. SM-2 간격 반복 알고리즘

학생 오답을 SM-2 알고리즘으로 복습 스케줄링한다. `lib/sm2.ts` 참고.

**quality 점수 기준:**
```
5 = 1차 시도 정답 (완벽)
3 = 2차 시도 정답 (힌트 후 맞춤)
1 = 2차 시도 오답 (완전히 모름)
```

**복습 간격:**
```
1회 → 1일
2회 → 6일
3회~ → interval × EF (EF 최소 1.3, 최대 60일)
```

- 답안 제출 시 자동으로 `review_schedule` 테이블에 `next_review_date` 저장
- 대시보드 복습 탭: `next_review_date <= 오늘` 조건으로 오늘 복습할 문제 표시

---

### 6. 주간/월간 취약점 분석 리포트

학생의 오답 히스토리를 분석해 취약 패턴을 감지하고 주기적으로 알려준다.

**분석 프롬프트:**
```
system: 너는 학습 분석 전문가야. 학생의 오답 데이터를 보고 취약점을 분석해줘.
        한국어로, 친근하고 구체적으로.

user: 다음은 학생의 최근 오답 목록이야:
      {오답_목록_JSON}
      
      어떤 개념이나 유형에서 자주 틀리는지 분석하고,
      개선을 위한 조언을 3줄 이내로 요약해줘.
```

---

## DB 스키마 (Supabase)

```sql
-- 사용자
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  role text check (role in ('student', 'teacher')) default 'student',
  created_at timestamptz default now()
);

-- 학원 멤버 (회원가입 코드 관리)
create table academy_members (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  role text check (role in ('student', 'teacher')),
  used boolean default false
);

-- 학원 멤버별 수강 과목
create table academy_member_subjects (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references academy_members(id),
  subject_name text not null
);

-- 과목
create table subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid references users(id),
  created_at timestamptz default now()
);

-- 과목 커리큘럼 (총 회차 수 등)
create table academy_curriculum (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id),
  total_sessions int,
  description text
);

-- 수강 관계
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references users(id),
  subject_id uuid references subjects(id),
  unique (student_id, subject_id)
);

-- 수업 자료
create table lessons (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id),
  title text,
  content text,
  session_number int,
  created_at timestamptz default now()
);

-- 문제
create table questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references lessons(id),
  type text check (type in ('concept', 'coding')),
  difficulty text check (difficulty in ('easy', 'medium', 'hard')) default 'medium',
  question text not null,
  code_template text,
  expected_output text,
  answer text not null,
  hint text,
  explanation text,
  test_cases jsonb,
  concept_tags text[],
  created_at timestamptz default now()
);

-- 학생 답안
create table user_answers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references users(id),
  question_id uuid references questions(id),
  subject_id uuid references subjects(id),
  attempt int check (attempt in (1, 2)) default 1,
  answer text,
  is_correct boolean,
  used_hint boolean default false,
  answered_at timestamptz default now()
);

-- SM-2 복습 스케줄
create table review_schedule (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references users(id),
  question_id uuid references questions(id),
  interval_days int default 1,
  easiness_factor float default 2.5,
  repetition_count int default 0,
  next_review_date date,
  wrong_count int default 0,
  correct_count int default 0,
  updated_at timestamptz default now()
);

-- PWA 푸시 구독
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  subscription jsonb not null,
  created_at timestamptz default now()
);

-- 취약점 리포트
create table weakness_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references users(id),
  subject_id uuid references subjects(id),
  period text check (period in ('weekly', 'monthly')),
  summary text,
  created_at timestamptz default now()
);
```

---

## API Routes 구조

```
/api
  /auth
    /[...nextauth]          # NextAuth 인증
    /signup                 # 회원가입 (학원코드 검증 + 과목 자동 연결)
  /subjects
    GET                     # 내 과목 목록 (역할별)
    POST                    # 과목 생성 (강사)
  /sessions
    POST                    # 수업 자료 업로드 (강사)
  /subjects/[id]/sessions
    GET                     # 과목별 회차 목록
  /enrollments
    POST                    # 수강 등록
    DELETE                  # 수강 취소
  /questions
    POST                    # AI 문제 생성 (강사)
    GET                     # 오늘의 문제 조회
  /questions/[id]
    GET                     # 단일 문제 조회 (answer 필드 제외)
  /daily-questions
    GET                     # 오늘의 문제 5개 (3 신규 + 2 SM-2 복습)
  /answers
    GET                     # 이전 답안 조회 (복습 모드용)
    POST                    # 답안 제출 (정규화 → OpenAI 의미 비교 → SM-2 업데이트)
  /reviews
    GET                     # 오늘 SM-2 복습 예정 문제 조회
    POST                    # 복습 답안 제출 및 스케줄 업데이트
  /explanation
    POST                    # 오답 해설 생성 (AI)
  /execute
    POST                    # Judge0 코드 실행 (Python / JavaScript / Java)
  /difficulty
    GET                     # 학생별 현재 난이도 조회
  /stats
    GET                     # 학습 통계 (정답률, 스트릭, 이번 주, 취약 개념 등)
  /analytics/weak-concepts
    GET                     # 최근 오답 기반 취약 개념 Top N
  /reports
    GET                     # 취약점 리포트 조회
    POST                    # 리포트 생성 (주간/월간)
  /push/subscribe
    POST                    # PWA 푸시 구독 등록
    DELETE                  # 푸시 구독 해제
  /cron/daily-notify
    GET                     # Vercel Cron — 매일 KST 09:00 푸시 알림 발송
```

---

## 페이지 구조

```
/                           # 홈 (로그인 전: 랜딩, 로그인 후: 대시보드로 리다이렉트)
/login                      # 로그인 / 회원가입
/dashboard                  # 학생 메인 (오늘의 문제, 학습 현황)
  /subjects                 # 과목 목록
  /stats                    # 학습 통계 (스트릭, 정답률, 취약 개념)
  /report                   # 취약점 리포트
  /settings                 # 설정
/questions/[id]             # 문제 풀기 (2단계 오답 플로우)
  /result                   # 문제 결과 + AI 해설
/subjects/[id]              # 과목 상세
  /sessions/[sessionId]     # 회차별 문제 목록
/admin                      # 강사 관리자
  /upload                   # 수업 자료 업로드 + AI 문제 생성
  /questions                # 생성된 문제 확인/수정
  /settings                 # 강사 설정
```

---

## 개발 우선순위

### 🔴 필수 (완성)
1. 로그인/회원가입 (NextAuth + 학원코드) ✅
2. 수업 자료 업로드 ✅
3. OpenAI 문제 생성 ✅
4. 문제 풀기 + 2단계 오답 플로우 ✅
5. 적응형 난이도 ✅
6. 오답 자동 해설 ✅
7. Vercel 배포 ✅

### 🟡 중요 (완성)
8. 빈칸 채우기 + Judge0 코드 실행 ✅
9. 힌트 버튼 ✅
10. 취약점 리포트 (주간/월간) ✅
11. PWA + 푸시 알림 ✅
12. 학습 대시보드 (정답률, 스트릭, SM-2 복습) ✅

### 🟢 선택 (시간 남으면)
13. 관리자 배포 스케줄링 UI
14. 상세 통계 차트
15. 오프라인 모드

---

## 개발 규칙

- 브랜치 전략: `main` (배포용) / `dev` (개발용) / 기능별 `feature/기능명`
- PR 머지 전 팀원 1명 이상 확인
- 환경변수는 절대 커밋하지 않음 (`.env.local` → `.gitignore`)
- Supabase RLS(Row Level Security) 반드시 설정 (학생은 본인 데이터만 조회)
- API Route에서 OpenAI 호출 시 에러 핸들링 필수 (try/catch + fallback 메시지)
- 컴포넌트는 `components/` 폴더, API 로직은 `lib/` 폴더로 분리

## 코드 스타일 (Prettier)

팀원 간 코드 스타일 통일을 위해 Prettier를 사용한다.
저장 시 자동 포맷팅되도록 VSCode 설정 권장.

**`.prettierrc` 설정:**
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

**VSCode 설정 (각자 적용):**
- VSCode에서 `Ctrl+Shift+P` → `Open User Settings (JSON)` 입력
- 아래 내용 추가:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

**VSCode 확장 설치:**
- `Prettier - Code formatter` (esbenp.prettier-vscode) 설치 필수

---

## 참고 링크

- 기획서: https://jinjoooppa.tistory.com/35
- Judge0 CE: https://ce.judge0.com
- OpenAI API Docs: https://platform.openai.com/docs
- Supabase Docs: https://supabase.com/docs
- Next.js App Router: https://nextjs.org/docs/app
- SM-2 알고리즘: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
