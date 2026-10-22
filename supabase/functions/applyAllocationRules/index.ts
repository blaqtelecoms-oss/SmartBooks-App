import { corsHeaders, json, userClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const session = await userClient(req);
    if (!session) return json({ error: 'Unauthorized' }, 401);
    const { db } = session;

    const { company_id } = await req.json();
    if (!company_id) return json({ error: 'company_id required' }, 400);

    // RLS limits these reads/writes to companies the caller belongs to.
    const [rulesRes, txsRes] = await Promise.all([
      db.from('allocation_rules').select('*').eq('company_id', company_id).eq('is_active', true),
      db.from('transactions').select('*').eq('company_id', company_id).eq('status', 'unallocated')
        .order('date', { ascending: false }).limit(200),
    ]);
    if (rulesRes.error) throw rulesRes.error;
    if (txsRes.error) throw txsRes.error;
    const rules = rulesRes.data ?? [];
    const txs = txsRes.data ?? [];

    if (rules.length === 0) {
      return json({ allocated: 0, total: txs.length, message: 'No active allocation rules found. Learn rules first or allocate transactions manually.' });
    }
    if (txs.length === 0) {
      return json({ allocated: 0, total: 0, message: 'No unallocated transactions to process.' });
    }

    const updates: Record<string, unknown>[] = [];
    const ruleIncrementMap: Record<string, number> = {};

    for (const tx of txs) {
      let matchedRule = null;
      for (const rule of rules) {
        let fieldValue = '';
        switch (rule.match_field) {
          case 'description': fieldValue = tx.description || ''; break;
          case 'reference': fieldValue = tx.reference || ''; break;
          case 'supplier_name': fieldValue = tx.supplier_name || ''; break;
          default: continue;
        }
        const fieldVal = fieldValue.toLowerCase();
        const matchVal = (rule.match_value || '').toLowerCase();
        let isMatch = false;
        switch (rule.match_type) {
          case 'contains': isMatch = fieldVal.includes(matchVal); break;
          case 'exact': isMatch = fieldVal === matchVal; break;
          case 'starts_with': isMatch = fieldVal.startsWith(matchVal); break;
          case 'range': {
            const amount = Math.abs(tx.amount || 0);
            const parts = (rule.match_value || '').split('-').map(parseFloat);
            isMatch = amount >= parts[0] && amount <= (parts[1] || Infinity);
            break;
          }
        }
        if (isMatch) { matchedRule = rule; break; }
      }

      if (matchedRule) {
        updates.push({
          id: tx.id,
          account_id: matchedRule.account_id,
          account_name: matchedRule.account_name,
          status: 'allocated',
          ai_confidence: 85,
          ai_reasoning: `Auto-allocated via ${matchedRule.source} rule: ${matchedRule.match_field} ${matchedRule.match_type} "${matchedRule.match_value}"`,
        });
        ruleIncrementMap[matchedRule.id] = (ruleIncrementMap[matchedRule.id] || 0) + 1;
      }
    }

    for (const { id, ...patch } of updates) {
      const { error } = await db.from('transactions').update(patch).eq('id', id as string);
      if (error) throw error;
    }
    for (const [ruleId, count] of Object.entries(ruleIncrementMap)) {
      const rule = rules.find((r) => r.id === ruleId);
      const { error } = await db.from('allocation_rules')
        .update({ times_applied: (rule?.times_applied || 0) + count }).eq('id', ruleId);
      if (error) throw error;
    }

    const rulesUsed = Object.keys(ruleIncrementMap).length;
    return json({
      allocated: updates.length,
      total: txs.length,
      rules_used: rulesUsed,
      message: `${updates.length} of ${txs.length} transactions auto-allocated using ${rulesUsed} rules`,
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
