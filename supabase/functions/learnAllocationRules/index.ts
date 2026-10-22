import { corsHeaders, json, userClient } from '../_shared/auth.ts';

// LLM provider: Together AI (OpenAI-compatible). Set the secret TOGETHER_API_KEY on the project;
// optionally TOGETHER_MODEL to override the default model.
const TOGETHER_URL = 'https://api.together.xyz/v1/chat/completions';
const DEFAULT_MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const session = await userClient(req);
    if (!session) return json({ error: 'Unauthorized' }, 401);
    const { db } = session;

    const { company_id } = await req.json();
    if (!company_id) return json({ error: 'company_id required' }, 400);

    const apiKey = Deno.env.get('TOGETHER_API_KEY');
    if (!apiKey) {
      return json({ error: 'AI is not configured yet. Add the TOGETHER_API_KEY secret to enable rule learning.' }, 503);
    }

    const txRes = await db.from('transactions').select('*').eq('company_id', company_id)
      .in('status', ['allocated', 'reviewed']).order('date', { ascending: false }).limit(200);
    if (txRes.error) throw txRes.error;
    const allocatedTxs = txRes.data ?? [];

    if (allocatedTxs.length < 3) {
      return json({ rules_created: 0, message: 'Need at least 3 allocated transactions to learn from' });
    }

    const [rulesRes, accountsRes] = await Promise.all([
      db.from('allocation_rules').select('*').eq('company_id', company_id),
      db.from('accounts').select('*').eq('company_id', company_id).eq('is_active', true),
    ]);
    if (rulesRes.error) throw rulesRes.error;
    if (accountsRes.error) throw accountsRes.error;
    const existingRules = rulesRes.data ?? [];
    const accounts = accountsRes.data ?? [];

    const prompt = `You are a bookkeeping AI for a South African company. Analyze these allocated transactions and identify recurring patterns that can be turned into allocation rules.

Transactions (with their allocated accounts):
${JSON.stringify(allocatedTxs.map((t) => ({
  description: t.description, reference: t.reference, amount: t.amount, type: t.type,
  category: t.category, account_name: t.account_name, supplier_name: t.supplier_name,
})))}

Available accounts (use these IDs):
${JSON.stringify(accounts.map((a) => ({ id: a.id, code: a.code, name: a.name, type: a.type })))}

Existing rules (avoid creating duplicates):
${JSON.stringify(existingRules.map((r) => ({ match_field: r.match_field, match_value: r.match_value, account_name: r.account_name })))}

Identify patterns where a specific keyword or phrase in the description, reference, or supplier_name consistently maps to the same account. Only create rules for patterns that appear at least 2 times.

For each rule provide:
- match_field: "description", "reference", or "supplier_name"
- match_type: "contains"
- match_value: a short keyword/phrase to match on (not the full description)
- account_id: must be from the accounts list above
- account_name: the account name
- vat_applicable: true if VAT at 15% typically applies (purchases of goods/services), false if exempt (salaries, bank charges, VAT itself, drawings)
- reasoning: brief explanation

Return up to 20 rules. Respond with ONLY a JSON object of the form {"rules":[...]}.`;

    const llmRes = await fetch(TOGETHER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('TOGETHER_MODEL') || DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });
    if (!llmRes.ok) throw new Error(`AI request failed (${llmRes.status})`);
    const llmJson = await llmRes.json();
    let result: { rules?: Record<string, unknown>[] } = {};
    try { result = JSON.parse(llmJson.choices?.[0]?.message?.content ?? '{}'); } catch { /* treat as no rules */ }

    const validAccountIds = new Set(accounts.map((a) => a.id));
    let rulesCreated = 0;

    for (const rule of result.rules ?? []) {
      if (!validAccountIds.has(rule.account_id as string)) continue;
      const isDupe = existingRules.some((r) =>
        r.match_field === rule.match_field &&
        r.match_value?.toLowerCase() === (rule.match_value as string | undefined)?.toLowerCase() &&
        r.account_id === rule.account_id);
      if (isDupe) continue;

      const { error } = await db.from('allocation_rules').insert({
        company_id,
        match_field: rule.match_field,
        match_type: rule.match_type || 'contains',
        match_value: rule.match_value,
        account_id: rule.account_id,
        account_name: rule.account_name,
        vat_applicable: rule.vat_applicable || false,
        is_active: true,
        source: 'ai_learned',
      });
      if (error) continue;
      rulesCreated++;
    }

    return json({
      rules_created: rulesCreated,
      analyzed: allocatedTxs.length,
      message: `${rulesCreated} rules learned from ${allocatedTxs.length} allocated transactions`,
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
