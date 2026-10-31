// Send statement email to a customer/supplier through Resend.
// Deploy: supabase functions deploy send-statement
import { corsHeaders, json, userClient } from '../_shared/auth.ts';
import { EmailError, sendEmail } from '../_shared/email.ts';

const formatR = (v: number) => `R ${(v || 0).toFixed(2)}`;

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const caller = await userClient(req);
  if (!caller) return json({ error: 'Please sign in to send statements.' }, 401);

  const body = await req.json().catch(() => ({}));
  const { company_name, contact_name, contact_email, total, buckets } = body;

  if (!contact_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contact_email))) {
    return json({ error: 'This contact has no valid email address.' }, 400);
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #1A2E22;">Account Statement — ${escapeHtml(company_name)}</h2>
      <p>Dear ${escapeHtml(contact_name)},</p>
      <p>Please find your current account summary below:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr style="border-bottom: 2px solid #e4ebe5;">
          <th style="text-align: left; padding: 8px;">Aging Period</th>
          <th style="text-align: right; padding: 8px;">Amount</th>
        </tr>
        <tr><td style="padding: 8px;">Current</td><td style="text-align: right;">${formatR(buckets?.current)}</td></tr>
        <tr><td style="padding: 8px;">1–30 Days</td><td style="text-align: right;">${formatR(buckets?.days30)}</td></tr>
        <tr><td style="padding: 8px;">31–60 Days</td><td style="text-align: right;">${formatR(buckets?.days60)}</td></tr>
        <tr><td style="padding: 8px;">90+ Days</td><td style="text-align: right;">${formatR(buckets?.days90)}</td></tr>
        <tr style="border-top: 2px solid #e4ebe5; font-weight: bold;">
          <td style="padding: 8px;">Total Outstanding</td>
          <td style="text-align: right;">${formatR(total)}</td>
        </tr>
      </table>
      <p style="margin-top: 24px; color: #6B6B72; font-size: 12px;">
        This is an automated statement from ${escapeHtml(company_name)}. Please contact us if you have any queries.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: String(contact_email),
      subject: `Account statement from ${company_name || 'SmartBooks SA'}`,
      html,
    });
  } catch (err) {
    console.error('Statement email failed', err);
    return json(
      { sent: false, error: err instanceof EmailError ? err.message : 'The email provider rejected the message.' },
      502,
    );
  }

  return json({ sent: true, to: contact_email });
});
