// Redeems a single-use password reset link and sets the new password.
// Deploy: supabase functions deploy reset-password
import { adminClient, corsHeaders, json } from '../_shared/auth.ts';
import { hashValue } from '../_shared/codes.ts';

const MIN_PASSWORD_LENGTH = 6;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? '').trim();
  const newPassword = String(body.new_password ?? '');

  if (!/^[a-f0-9]{32,}$/i.test(token)) {
    return json({ error: 'This reset link is invalid or has expired. Request a new one.' }, 400);
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return json({ error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.` }, 400);
  }

  const admin = adminClient();
  const { data: record, error: readError } = await admin
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', await hashValue(token, 'reset'))
    .maybeSingle();

  if (readError) {
    console.error('Could not read password reset token', readError);
    return json({ error: 'We could not reset your password. Please try again.' }, 500);
  }
  if (!record || record.used_at) {
    return json({ error: 'This reset link is invalid or has expired. Request a new one.' }, 400);
  }
  if (new Date(record.expires_at).getTime() <= Date.now()) {
    return json({ error: 'This reset link has expired. Request a new one.' }, 400);
  }

  const { error: updatePasswordError } = await admin.auth.admin.updateUserById(record.user_id, {
    password: newPassword,
  });
  if (updatePasswordError) {
    console.error('Could not set the new password', updatePasswordError);
    return json({ error: 'We could not reset your password. Please try again.' }, 500);
  }

  await admin
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', record.user_id)
    .is('used_at', null);

  return json({ reset: true });
});
