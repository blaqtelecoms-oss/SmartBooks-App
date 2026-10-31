// Emails a six-digit account verification code through Resend.
// Deploy: supabase functions deploy send-verification-code
import { adminClient, corsHeaders, json, userClient } from '../_shared/auth.ts';
import { EmailError, codeBlock, emailLayout, sendEmail } from '../_shared/email.ts';
import { hashValue, sixDigitCode } from '../_shared/codes.ts';

const CODE_TTL_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 45;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const caller = await userClient(req);
  if (!caller) return json({ error: 'Please sign in to request a verification code.' }, 401);

  const admin = adminClient();
  const { data: authUser, error: userError } = await admin.auth.admin.getUserById(caller.userId);
  const email = authUser?.user?.email;
  if (userError || !email) {
    return json({ error: 'We could not find an email address for this account.' }, 400);
  }

  // One code at a time: a just-sent code refuses an immediate resend.
  const { data: latest } = await admin
    .from('email_verification_codes')
    .select('created_at')
    .eq('user_id', caller.userId)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) {
    const waited = (Date.now() - new Date(latest.created_at).getTime()) / 1000;
    if (waited < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.max(1, Math.ceil(RESEND_COOLDOWN_SECONDS - waited));
      return json({ error: `Please wait ${wait} second${wait === 1 ? '' : 's'} before requesting another code.` }, 429);
    }
  }

  const code = sixDigitCode();
  const { data: inserted, error: insertError } = await admin
    .from('email_verification_codes')
    .insert({
      user_id: caller.userId,
      email,
      code_hash: await hashValue(code, 'verify'),
      expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    console.error('Could not store verification code', insertError);
    return json({ error: 'We could not create a verification code. Please try again.' }, 500);
  }

  const html = emailLayout({
    heading: 'Verify your email address',
    body: `<p style="margin:0 0 12px 0;">Enter this code in SmartBooks to verify your account:</p>
      ${codeBlock(code)}
      <p style="margin:0 0 12px 0;">The code expires in ${CODE_TTL_MINUTES} minutes and can be used once.</p>
      <p style="margin:0;color:#6B6B72;font-size:13px;">If you didn't create a SmartBooks account, you can ignore this email.</p>`,
  });

  try {
    await sendEmail({
      to: email,
      subject: `Your SmartBooks verification code: ${code}`,
      html,
    });
  } catch (err) {
    // Never leave a code behind that the user never received.
    await admin.from('email_verification_codes').delete().eq('id', inserted.id);
    console.error('Verification email failed', err);
    return json(
      { error: err instanceof EmailError ? err.message : 'We could not send the verification email. Please try again.' },
      502,
    );
  }

  // Older unused codes are void as soon as a new one is in flight.
  await admin
    .from('email_verification_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('user_id', caller.userId)
    .is('consumed_at', null)
    .neq('id', inserted.id);

  return json({ sent: true, expires_in_minutes: CODE_TTL_MINUTES });
});
