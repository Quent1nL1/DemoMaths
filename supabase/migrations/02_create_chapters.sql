-- supabase/migrations/01_create_chapters.sql

-- Si vous êtes en développement et pouvez vous permettre de tout recréer :
DROP TABLE IF EXISTS public.chapters CASCADE;

-- Création de la table chapters avec liaison immédiate au cursus
CREATE TABLE public.chapters (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  sort_index   INTEGER NOT NULL DEFAULT 0,
  cover_url    TEXT,
  cursus_code  TEXT NOT NULL REFERENCES public.cursus(code),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
