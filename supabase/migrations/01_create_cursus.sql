-- supabase/migrations/01_create_cursus.sql

create table if not exists public.cursus (
  code       text primary key,
  name       text not null,
  created_at timestamptz not null default now()
);

-- insère les cursus de base
insert into public.cursus (code, name) values
  ('MathsSup','MathsSup'),
  ('MathsSpé','MathsSpé'),
  ('L1 - SU','L1 - SU'),
  ('L2 - SU','L2 - SU')
on conflict (code) do nothing;
