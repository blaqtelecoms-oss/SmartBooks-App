// Checks a six-digit account verification code and marks the profile verified.
// Deploy: supabase functions deploy verify-email-code
import { adminClient, corsHeaders, json, userClient } from '../_shared/auth.ts';
import { hashValue, normalizeCode, sameHash } from '../_shared/codes.ts';

const MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const caller = await userClient(req);
  if (!caller) return json({ error: 'Please sign in to verify your account.' }, 401);

  const body = await req.json().catch(() => ({}));
  const code = normalizeCode(body.code);
  if (code.length !== 6) return json({ error: 'Enter the 6-digit code from your email.' }, 400);

  const admin = adminClient();
  const { data: record, error: readError } = await admin
    .from('email_verification_codes')
    .select('id, code_hash, expires_at, attempts')
    .eq('user_id', caller.userId)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) {
    console.error('Could not read verification code', readError);
    return json({ error: 'We could not check that code. Please try again.' }, 500);
  }
  if (!record) return json({ error: 'That code is no longer valid. Request a new one.' }, 400);

  if (new Date(record.expires_at).getTime() <= Date.now()) {
    return json({ error: 'That code has expired. Request a new one.' }, 400);
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return json({ error: 'Too many incorrect attempts. Request a new code.' }, 429);
  }

  if (!sameHash(await hashValue(code, 'verify'), record.code_hash)) {
    const attempts = record.attempts + 1;
    await admin.from('email_verification_codes').update({ attempts }).eq('id', record.id);
    const left = MAX_ATTEMPTS - attempts;
    return json(
      {
        error: left > 0
          ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
          : 'Too many incorrect attempts. Request a new code.',
      },
      400,
    );
  }

  const verifiedAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from('email_verification_codes')
    .update({ consumed_at: verifiedAt })
    .eq('id', record.id);

  if (updateError) {
    console.error('Could not consume verification code', updateError);
    return json({ error: 'We could not verify your account. Please try again.' }, 500);
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ email_verified_at: verifiedAt })
    .eq('id', caller.userId);

  if (profileError) {
    console.error('Could not mark profile verified', profileError);
    return json({ error: 'We could not verify your account. Please try again.' }, 500);
  }

  return json({ verified: true });
});
