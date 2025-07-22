create type mastery_status as enum ('unrated','mastered','in_progress','not_mastered');

create table public.demos (
  id          uuid primary key default gen_random_uuid(),
  chapter_id  uuid references public.chapters on delete cascade,
  title       text not null,
  statement   text not null,
  proof       text not null,
  sort_index  int  default 0,
  created_at  timestamptz default now()
);

create index on public.demos(chapter_id);