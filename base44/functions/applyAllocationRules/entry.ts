import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id } = await req.json();
    if (!company_id) return Response.json({ error: 'company_id required' }, { status: 400 });

    // Fetch active rules and unallocated transactions
    const [rules, txs] = await Promise.all([
      base44.asServiceRole.entities.AllocationRule.filter({ company_id, is_active: true }),
      base44.asServiceRole.entities.Transaction.filter({ company_id, status: "unallocated" }, '-date', 200)
    ]);

    if (rules.length === 0) {
      return Response.json({ allocated: 0, total: txs.length, message: 'No active allocation rules found. Learn rules first or allocate transactions manually.' });
    }

    if (txs.length === 0) {
      return Response.json({ allocated: 0, total: 0, message: 'No unallocated transactions to process.' });
    }

    const updates = [];
    const ruleIncrementMap = {};

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
          case 'range':
            const amount = Math.abs(tx.amount || 0);
            const parts = (rule.match_value || '').split('-').map(parseFloat);
            isMatch = amount >= parts[0] && amount <= (parts[1] || Infinity);
            break;
        }

        if (isMatch) { matchedRule = rule; break; }
      }

      if (matchedRule) {
        updates.push({
          id: tx.id,
          account_id: matchedRule.account_id,
          account_name: matchedRule.account_name,
          status: "allocated",
          ai_confidence: 85,
          ai_reasoning: `Auto-allocated via ${matchedRule.source} rule: ${matchedRule.match_field} ${matchedRule.match_type} "${matchedRule.match_value}"`
        });
        ruleIncrementMap[matchedRule.id] = (ruleIncrementMap[matchedRule.id] || 0) + 1;
      }
    }

    if (updates.length > 0) {
      await base44.asServiceRole.entities.Transaction.bulkUpdate(updates);
    }

    // Increment times_applied for matched rules
    for (const [ruleId, count] of Object.entries(ruleIncrementMap)) {
      const rule = rules.find(r => r.id === ruleId);
      await base44.asServiceRole.entities.AllocationRule.update(ruleId, {
        times_applied: (rule?.times_applied || 0) + count
      });
    }

    return Response.json({
      allocated: updates.length,
      total: txs.length,
      rules_used: Object.keys(ruleIncrementMap).length,
      message: `${updates.length} of ${txs.length} transactions auto-allocated using ${Object.keys(ruleIncrementMap).length} rules`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});