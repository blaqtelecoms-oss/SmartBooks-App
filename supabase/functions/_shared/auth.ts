import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Returns a client acting AS THE CALLER (RLS applies), so a user can only touch companies they belong to.
export async function userClient(req: Request): Promise<{ db: SupabaseClient; userId: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await db.auth.getUser();
  if (error || !data?.user) return null;
  return { db, userId: data.user.id };
}
