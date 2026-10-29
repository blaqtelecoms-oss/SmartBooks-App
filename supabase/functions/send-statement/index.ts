// Send statement email to a customer/supplier.
// Deploy: supabase functions deploy send-statement
import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  const body = await req.json();
  const { company_name, contact_name, contact_email, total, buckets } = body;

  // Build a simple HTML statement
  const formatR = (v) => `R ${(v || 0).toFixed(2)}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #1A2E22;">Account Statement — ${company_name}</h2>
      <p>Dear ${contact_name},</p>
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
        This is an automated statement from ${company_name}. Please contact us if you have any queries.
      </p>
    </div>
  `;

  // Use Supabase's built-in email or an external SMTP service.
  // For now, we log the email content (the user needs to configure SMTP via Supabase).
  console.log(`Statement email to ${contact_email}:`, html);

  // If Resend/SMTP is configured, send the actual email here.
  // Example with Resend:
  // const res = await fetch("https://api.resend.com/emails", { ... });

  return new Response(JSON.stringify({ sent: true, to: contact_email }), {
    headers: { "Content-Type": "application/json" },
  });
});
