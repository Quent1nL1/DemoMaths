import { createClient } from '@supabase/supabase-js';

//  Remplacez par vos vraies valeurs :
const SUPABASE_URL = 'https://mnanqrszcfunljrqzyyp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYW5xcnN6Y2Z1bmxqcnF6eXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzcyNjEsImV4cCI6MjA2ODc1MzI2MX0.W051XY1icbyIbl8a2Lly-yW6DNCExoMhtMej7Hee4mY';

console.log('Supabase URL:', SUPABASE_URL);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);