// Emails a single-use password reset link through Resend.
// Deploy: supabase functions deploy request-password-reset
import { adminClient, corsHeaders, json } from '../_shared/auth.ts';
import { EmailError, button, emailLayout, sendEmail } from '../_shared/email.ts';
import { hashValue, randomToken } from '../_shared/codes.ts';

const RESET_TTL_MINUTES = 60;
const RESEND_COOLDOWN_SECONDS = 60;
const FALLBACK_APP_URL = 'https://app.smartbooks-app.co.za';

const siteUrl = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!/^https?:\/\/[^/\s]+/i.test(raw)) return null;
  return raw.replace(/\/+$/, '');
};

// The link must point at the running app: the configured site wins, otherwise the
// origin the request came from.
const resolveBaseUrl = (req: Request, appUrl: unknown) =>
  siteUrl(Deno.env.get('APP_BASE_URL')) ||
  siteUrl(appUrl) ||
  siteUrl(req.headers.get('origin')) ||
  FALLBACK_APP_URL;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Enter a valid email address.' }, 400);
  }

  const admin = adminClient();
  const { data: profile, error: lookupError } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error('Could not look up account for password reset', lookupError);
    return json({ error: 'We could not process that request. Please try again.' }, 500);
  }

  // Never reveal whether an account exists: unknown emails report success.
  if (!profile) return json({ sent: true });

  const { data: latest } = await admin
    .from('password_reset_tokens')
    .select('created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest && Date.now() - new Date(latest.created_at).getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
    return json({ sent: true });
  }

  const token = randomToken();
  const { data: inserted, error: insertError } = await admin
    .from('password_reset_tokens')
    .insert({
      user_id: profile.id,
      email,
      token_hash: await hashValue(token, 'reset'),
      expires_at: new Date(Date.now() + RESET_TTL_MINUTES * 60_000).toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    console.error('Could not store password reset token', insertError);
    return json({ error: 'We could not create a reset link. Please try again.' }, 500);
  }

  const link = `${resolveBaseUrl(req, body.app_url)}/reset-password?token=${token}`;
  const html = emailLayout({
    heading: 'Reset your password',
    body: `<p style="margin:0 0 12px 0;">We received a request to reset the password for your SmartBooks account.</p>
      ${button(link, 'Reset password')}
      <p style="margin:0 0 12px 0;">This link expires in ${RESET_TTL_MINUTES} minutes and can be used once.</p>
      <p style="margin:0;color:#6B6B72;font-size:13px;">If you didn't ask to reset your password, you can ignore this email — your password stays the same.</p>`,
  });

  try {
    await sendEmail({ to: email, subject: 'Reset your SmartBooks password', html });
  } catch (err) {
    await admin.from('password_reset_tokens').delete().eq('id', inserted.id);
    console.error('Password reset email failed', err);
    return json(
      { error: err instanceof EmailError ? err.message : 'We could not send the reset email. Please try again.' },
      502,
    );
  }

  await admin
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', profile.id)
    .is('used_at', null)
    .neq('id', inserted.id);

  return json({ sent: true, expires_in_minutes: RESET_TTL_MINUTES });
});
