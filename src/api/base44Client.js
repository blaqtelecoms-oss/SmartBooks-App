// Backend client. The app was migrated from Base44 to Supabase; this module keeps the
// original import path (`@/api/base44Client`) and call shapes so pages are unchanged.
// See src/api/supabaseClient.js for the implementation.
import { db } from '@/api/supabaseClient';

export const base44 = db;
