-- supabase/migrations/02_create_demos.sql

DROP TABLE IF EXISTS public.demos CASCADE;

CREATE TABLE public.demos (
  id           TEXT PRIMARY KEY,
  chapter_id   TEXT NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  statement    TEXT NOT NULL,
  proof        TEXT NOT NULL,
  sort_index   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
