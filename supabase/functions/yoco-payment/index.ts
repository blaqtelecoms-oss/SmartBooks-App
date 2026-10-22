// Yoco payment integration — creates payment links and handles webhooks.
// Deploy: supabase functions deploy yoco-payment
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  const url = new URL(req.url);

  // --- Webhook: Yoco payment confirmation ---
  if (url.pathname.includes("webhook")) {
    const body = await req.json();
    // Yoco sends: { data: { id, status, sourceReference, amount } }
    const payment = body?.data || body;
    const status = payment?.status;
    const sourceRef = payment?.sourceReference || payment?.metadata?.invoice_id;

    if (status === "paid" && sourceRef) {
      // Find invoice by payment_reference
      const { data: invoice } = await supabase
        .from("invoices")
        .select("*")
        .eq("payment_reference", sourceRef)
        .single();

      if (invoice && invoice.status !== "paid") {
        // Mark invoice as paid
        await supabase.from("invoices").update({ status: "paid" }).eq("id", invoice.id);

        // Post cash-received transaction
        await supabase.from("transactions").insert({
          company_id: invoice.company_id,
          date: new Date().toISOString().split("T")[0],
          description: `Yoco payment — ${invoice.invoice_number}`,
          amount: invoice.total_amount,
          type: "credit",
          source: "invoice",
          status: "allocated",
          reference: invoice.invoice_number,
        });

        // Log audit
        await supabase.from("audit_logs").insert({
          company_id: invoice.company_id,
          action: "payment_received",
          entity_type: "invoice",
          entity_id: invoice.id,
          details: `Yoco payment of R${invoice.total_amount} for ${invoice.invoice_number}`,
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  }

  // --- Create payment link ---
  const body = await req.json();
  if (body.action !== "create_link") {
    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { invoice_id, invoice_number, amount, company_id } = body;

  // Fetch Yoco API key
  const { data: gateway } = await supabase
    .from("payment_gateway_settings")
    .select("api_key")
    .eq("company_id", company_id)
    .eq("provider", "yoco")
    .single();

  if (!gateway?.api_key) {
    return new Response(JSON.stringify({ error: "Yoco not configured" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Create Yoco checkout link
  const yocoRes = await fetch("https://api.yoco.com/v1/charges/", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${gateway.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // cents
      currency: "ZAR",
      reference: invoice_number,
      metadata: { invoice_id },
    }),
  });

  const yocoData = await yocoRes.json();

  if (!yocoRes.ok) {
    return new Response(JSON.stringify({ error: yocoData?.error?.message || "Yoco API error" }), {
      status: yocoRes.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Save payment reference
  await supabase.from("invoices").update({
    payment_reference: yocoData?.id || invoice_id,
    payment_provider: "yoco",
  }).eq("id", invoice_id);

  const link = yocoData?.redirect_url || yocoData?.checkout_url || `https://payments.yoco.com/pay/${yocoData?.id}`;

  return new Response(JSON.stringify({ link, id: yocoData?.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
