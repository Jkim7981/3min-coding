# UI Components Guide

## `LogoMark`

Displays the Korea IT logo asset stored in `/public/koreait-logo.svg`.

### Props

- `className?: string`
- `priority?: boolean`

### Example

```tsx
import { LogoMark } from '@/components/ui/logo-mark'

export function Header() {
  return <LogoMark priority />
}
```

## `Button`

Reusable rounded button with visual states for hover, active, and disabled.

### Props

- `children: ReactNode`
- `variant?: 'primary' | 'secondary' | 'ghost'`
- `size?: 'sm' | 'md' | 'lg'`
- All native `button` props are supported

### Example

```tsx
import { Button } from '@/components/ui/button'

export function Actions() {
  return (
    <div className="flex gap-3">
      <Button variant="primary">학습 시작</Button>
      <Button variant="secondary">미리보기</Button>
      <Button variant="ghost" disabled>
        준비 중
      </Button>
    </div>
  )
}
```

## `SubjectCard`

Subject summary card for course previews or dashboard lists.

### Props

- `name: string`
- `description: string`
- `level: string`
- `accent: string`

### Example

```tsx
import { SubjectCard } from '@/components/ui/subject-card'

export function SubjectPreview() {
  return (
    <SubjectCard
      name="Python 기초"
      description="변수와 반복문을 정리하는 입문 수업"
      level="beginner"
      accent="#14b8a6"
    />
  )
}
```

## `QuestionCard`

Preview card for concept and coding questions.

### Props

- `title: string`
- `prompt: string`
- `category: 'concept' | 'coding'`
- `difficulty: string`

### Example

```tsx
import { QuestionCard } from '@/components/ui/question-card'

export function QuestionPreview() {
  return (
    <QuestionCard
      title="짝수 판별 함수 만들기"
      prompt="숫자를 받아 짝수면 True를 반환하는 함수를 작성하세요."
      category="coding"
      difficulty="medium"
    />
  )
}
```

## Data Source

- Sample subjects and questions are stored in `/data/dummy.json`.
- The current guide page imports the JSON directly and renders the cards from that data.
