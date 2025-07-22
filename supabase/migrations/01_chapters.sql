create table public.chapters (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  cover_url  text,
  sort_index int  default 0,
  created_at timestamptz default now()
);