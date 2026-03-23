-- =============================================================
-- Mise en Place — Supabase setup
-- Paste this entire file into: Supabase → SQL Editor → Run
-- =============================================================

-- RECIPES
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  base_portions numeric,
  description text,
  ingredients jsonb default '[]',
  steps jsonb default '[]',
  plating_instructions text,
  ai_plating jsonb,
  labels jsonb default '[]',
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

-- DAILY PLANS
create table if not exists daily_plans (
  id uuid primary key default gen_random_uuid(),
  plan_date text not null,
  preset_name text,
  dishes jsonb default '[]',
  schedule jsonb default '[]',
  settings_override jsonb,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

-- WEEKLY PLANS
create table if not exists weekly_plans (
  id uuid primary key default gen_random_uuid(),
  week_start text not null,
  preset_name text,
  days jsonb default '{}',
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

-- CLEANING TASKS
create table if not exists cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  frequency text check (frequency in ('daily', 'weekly')),
  day_of_week text,
  time_of_day text,
  completions jsonb default '[]',
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

-- KITCHEN SETTINGS
create table if not exists kitchen_settings (
  id uuid primary key default gen_random_uuid(),
  kitchen_name text,
  staff_count numeric not null,
  prep_start_time text not null,
  service_start_time text not null,
  is_default boolean default false,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

-- LABELS
create table if not exists labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

-- =============================================================
-- Row Level Security — any authenticated user can read/write
-- (shared company data)
-- =============================================================

alter table recipes enable row level security;
alter table daily_plans enable row level security;
alter table weekly_plans enable row level security;
alter table cleaning_tasks enable row level security;
alter table kitchen_settings enable row level security;
alter table labels enable row level security;

-- Recipes
create policy "Authenticated users can read recipes"
  on recipes for select to authenticated using (true);
create policy "Authenticated users can insert recipes"
  on recipes for insert to authenticated with check (true);
create policy "Authenticated users can update recipes"
  on recipes for update to authenticated using (true);
create policy "Authenticated users can delete recipes"
  on recipes for delete to authenticated using (true);

-- Daily Plans
create policy "Authenticated users can read daily_plans"
  on daily_plans for select to authenticated using (true);
create policy "Authenticated users can insert daily_plans"
  on daily_plans for insert to authenticated with check (true);
create policy "Authenticated users can update daily_plans"
  on daily_plans for update to authenticated using (true);
create policy "Authenticated users can delete daily_plans"
  on daily_plans for delete to authenticated using (true);

-- Weekly Plans
create policy "Authenticated users can read weekly_plans"
  on weekly_plans for select to authenticated using (true);
create policy "Authenticated users can insert weekly_plans"
  on weekly_plans for insert to authenticated with check (true);
create policy "Authenticated users can update weekly_plans"
  on weekly_plans for update to authenticated using (true);
create policy "Authenticated users can delete weekly_plans"
  on weekly_plans for delete to authenticated using (true);

-- Cleaning Tasks
create policy "Authenticated users can read cleaning_tasks"
  on cleaning_tasks for select to authenticated using (true);
create policy "Authenticated users can insert cleaning_tasks"
  on cleaning_tasks for insert to authenticated with check (true);
create policy "Authenticated users can update cleaning_tasks"
  on cleaning_tasks for update to authenticated using (true);
create policy "Authenticated users can delete cleaning_tasks"
  on cleaning_tasks for delete to authenticated using (true);

-- Kitchen Settings
create policy "Authenticated users can read kitchen_settings"
  on kitchen_settings for select to authenticated using (true);
create policy "Authenticated users can insert kitchen_settings"
  on kitchen_settings for insert to authenticated with check (true);
create policy "Authenticated users can update kitchen_settings"
  on kitchen_settings for update to authenticated using (true);
create policy "Authenticated users can delete kitchen_settings"
  on kitchen_settings for delete to authenticated using (true);

-- Labels
create policy "Authenticated users can read labels"
  on labels for select to authenticated using (true);
create policy "Authenticated users can insert labels"
  on labels for insert to authenticated with check (true);
create policy "Authenticated users can update labels"
  on labels for update to authenticated using (true);
create policy "Authenticated users can delete labels"
  on labels for delete to authenticated using (true);
