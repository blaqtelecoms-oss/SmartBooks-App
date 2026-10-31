// Shared Resend sender. Every app email goes through here so the sender address,
// branding and error handling stay in one place.
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export const FROM_EMAIL =
  Deno.env.get('RESEND_FROM_EMAIL') || 'SmartBooks SA <noreply@smartbooks-app.co.za>';

export class EmailError extends Error {}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Wraps message content in the app's branded card.
export function emailLayout({ heading, body }) {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px 12px;background:#F7F7FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E4EBE5;border-radius:12px;">
      <tr>
        <td style="padding:24px 28px 8px 28px;">
          <span style="font-size:15px;font-weight:600;letter-spacing:0.02em;color:#1A2E22;">SmartBooks SA</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 28px 0 28px;">
          <h1 style="margin:0;font-size:20px;line-height:1.3;font-weight:600;color:#0F0F0F;">${escapeHtml(heading)}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 28px 28px 28px;font-size:14px;line-height:1.6;color:#3F3F46;">
          ${body}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px 24px 28px;border-top:1px solid #E4EBE5;font-size:12px;line-height:1.5;color:#6B6B72;">
          This is an automated message from SmartBooks SA. Please do not reply to this email.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function codeBlock(code: string) {
  return `<div style="margin:20px 0;padding:16px;background:#F7F7FA;border:1px solid #E4EBE5;border-radius:10px;text-align:center;">
      <span style="font-size:30px;font-weight:600;letter-spacing:0.35em;color:#0F0F0F;">${escapeHtml(code)}</span>
    </div>`;
}

export function button(href: string, label: string) {
  return `<div style="margin:22px 0;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;background:#1A2E22;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
    </div>`;
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    throw new EmailError('Email is not configured yet. Add the RESEND_API_KEY secret.');
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    console.error('Resend rejected the email', res.status, payload);
    throw new EmailError(payload?.message || `Email provider rejected the message (${res.status})`);
  }

  return { id: payload?.id ?? null };
}
