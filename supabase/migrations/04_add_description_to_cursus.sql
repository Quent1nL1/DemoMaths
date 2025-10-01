-- supabase/migrations/04_add_description_to_cursus.sql

-- Ajoute une colonne 'description' pour stocker la description du cours
ALTER TABLE public.cursus
ADD COLUMN IF NOT EXISTS description text;

-- Optionnel: remplir des descriptions par défaut si besoin
-- UPDATE public.cursus SET description = '...' WHERE code = 'MathsSup';
