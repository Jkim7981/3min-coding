-- push_subscriptions: 학생별 PWA 푸시 구독 저장
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  subscription jsonb not null,
  created_at timestamptz default now(),
  unique (user_id, (subscription->>'endpoint'))
);

-- RLS: 본인 구독만 조회/삭제 가능
alter table push_subscriptions enable row level security;

create policy "본인 구독만 접근" on push_subscriptions
  for all using (auth.uid() = user_id);

-- 서비스롤은 전체 접근 (크론잡에서 전체 발송 용)
create policy "서비스롤 전체 접근" on push_subscriptions
  for select using (true);
