import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id } = await req.json();
    if (!company_id) return Response.json({ error: 'company_id required' }, { status: 400 });

    // Fetch all allocated/reviewed transactions to learn from
    const allocatedTxs = await base44.asServiceRole.entities.Transaction.filter({
      company_id,
      status: { $in: ["allocated", "reviewed"] }
    }, '-date', 200);

    if (allocatedTxs.length < 3) {
      return Response.json({
        rules_created: 0,
        message: 'Need at least 3 allocated transactions to learn from'
      });
    }

    // Fetch existing rules and accounts
    const [existingRules, accounts] = await Promise.all([
      base44.asServiceRole.entities.AllocationRule.filter({ company_id }),
      base44.asServiceRole.entities.Account.filter({ company_id, is_active: true })
    ]);

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a bookkeeping AI for a South African company. Analyze these allocated transactions and identify recurring patterns that can be turned into allocation rules.

Transactions (with their allocated accounts):
${JSON.stringify(allocatedTxs.map(t => ({
  description: t.description,
  reference: t.reference,
  amount: t.amount,
  type: t.type,
  category: t.category,
  account_name: t.account_name,
  supplier_name: t.supplier_name
})))}

Available accounts (use these IDs):
${JSON.stringify(accounts.map(a => ({ id: a.id, code: a.code, name: a.name, type: a.type })))}

Existing rules (avoid creating duplicates):
${JSON.stringify(existingRules.map(r => ({ match_field: r.match_field, match_value: r.match_value, account_name: r.account_name })))}

Identify patterns where a specific keyword or phrase in the description, reference, or supplier_name consistently maps to the same account. Only create rules for patterns that appear at least 2 times.

For each rule provide:
- match_field: "description", "reference", or "supplier_name"
- match_type: "contains"
- match_value: a short keyword/phrase to match on (not the full description)
- account_id: must be from the accounts list above
- account_name: the account name
- vat_applicable: true if VAT at 15% typically applies (purchases of goods/services), false if exempt (salaries, bank charges, VAT itself, drawings)
- reasoning: brief explanation

Return up to 20 rules. Focus on the most reliable, frequently-occurring patterns.`,
      response_json_schema: {
        type: "object",
        properties: {
          rules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                match_field: { type: "string" },
                match_type: { type: "string" },
                match_value: { type: "string" },
                account_id: { type: "string" },
                account_name: { type: "string" },
                vat_applicable: { type: "boolean" },
                reasoning: { type: "string" }
              }
            }
          }
        }
      },
      model: "claude_sonnet_4_6"
    });

    const validAccountIds = new Set(accounts.map(a => a.id));
    let rulesCreated = 0;

    for (const rule of (result?.rules || [])) {
      if (!validAccountIds.has(rule.account_id)) continue;

      // Skip duplicates
      const isDupe = existingRules.some(r =>
        r.match_field === rule.match_field &&
        r.match_value?.toLowerCase() === rule.match_value?.toLowerCase() &&
        r.account_id === rule.account_id
      );
      if (isDupe) continue;

      await base44.asServiceRole.entities.AllocationRule.create({
        company_id,
        match_field: rule.match_field,
        match_type: rule.match_type || "contains",
        match_value: rule.match_value,
        account_id: rule.account_id,
        account_name: rule.account_name,
        vat_applicable: rule.vat_applicable || false,
        is_active: true,
        source: "ai_learned"
      });
      rulesCreated++;
    }

    return Response.json({
      rules_created: rulesCreated,
      analyzed: allocatedTxs.length,
      message: `${rulesCreated} rules learned from ${allocatedTxs.length} allocated transactions`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});