-- Goals table
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  smart_score integer,
  smart_tips jsonb,
  measurement_types text[] not null default '{}',
  frequency_count integer,
  frequency_unit text check (frequency_unit in ('day', 'week', 'month')),
  duration_type text check (duration_type in ('count', 'date')),
  duration_value text,
  ai_reality_check jsonb,
  status text not null default 'draft' check (status in ('draft', 'pending', 'active', 'completed')),
  created_at timestamptz default now()
);

-- Challenges table (links a creator's goal to a group challenge)
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_goal_id uuid references public.goals(id) on delete cascade not null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'completed')),
  created_at timestamptz default now()
);

-- Challenge participants (each participant has their own goal)
create table if not exists public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_id uuid references public.goals(id),
  status text not null default 'invited' check (status in ('invited', 'submitted', 'approved', 'rejected')),
  invited_at timestamptz default now(),
  unique(challenge_id, user_id)
);

-- RLS
alter table public.goals enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;

create policy "Users can manage own goals"
  on public.goals for all
  using (auth.uid() = user_id);

create policy "Users can view challenges they are part of"
  on public.challenges for select
  using (
    creator_goal_id in (select id from public.goals where user_id = auth.uid())
    or
    id in (select challenge_id from public.challenge_participants where user_id = auth.uid())
  );

create policy "Creators can insert challenges"
  on public.challenges for insert
  with check (
    creator_goal_id in (select id from public.goals where user_id = auth.uid())
  );

create policy "Creators can update their challenges"
  on public.challenges for update
  using (
    creator_goal_id in (select id from public.goals where user_id = auth.uid())
  );

create policy "Participants can view their own rows"
  on public.challenge_participants for select
  using (
    user_id = auth.uid()
    or
    challenge_id in (
      select c.id from public.challenges c
      join public.goals g on g.id = c.creator_goal_id
      where g.user_id = auth.uid()
    )
  );

create policy "Creators can manage participants"
  on public.challenge_participants for all
  using (
    challenge_id in (
      select c.id from public.challenges c
      join public.goals g on g.id = c.creator_goal_id
      where g.user_id = auth.uid()
    )
  );
