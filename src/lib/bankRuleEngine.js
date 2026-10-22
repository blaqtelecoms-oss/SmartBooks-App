/**
 * Bank Rule Engine — auto-allocates transactions based on keyword matching rules.
 * No AI dependency; deterministic keyword matching with priority ordering.
 */

/**
 * Apply bank rules to a single transaction.
 * @param {object} tx - transaction with description, reference, supplier_name
 * @param {array} rules - sorted by priority desc
 * @returns {object|null} match result { account_id, account_name, vat_code, rule_id } or null
 */
export function matchTransaction(tx, rules) {
  const haystack = `${tx.description || ""} ${tx.reference || ""} ${tx.supplier_name || ""}`.toLowerCase();

  for (const rule of rules) {
    if (!rule.is_active) continue;
    const keyword = (rule.keyword || "").toLowerCase().trim();
    if (!keyword) continue;
    if (haystack.includes(keyword)) {
      return {
        account_id: rule.target_ledger_account_id,
        account_name: rule.target_account_name,
        vat_code: rule.vat_code,
        rule_id: rule.id,
      };
    }
  }
  return null;
}

/**
 * Apply bank rules to an array of transactions (pre-save).
 * @param {array} txs - raw extracted transactions
 * @param {array} rules - bank rules for the company
 * @returns {array} transactions with allocation fields populated where matched
 */
export function autoAllocate(txs, rules) {
  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return txs.map(tx => {
    const match = matchTransaction(tx, sortedRules);
    if (match) {
      return {
        ...tx,
        account_id: match.account_id,
        account_name: match.account_name,
        vat_classification: match.vat_code === 'none' ? 'exempt' : match.vat_code,
        status: "allocated",
        ai_reasoning: `Auto-matched by rule: "${sortedRules.find(r => r.id === match.rule_id)?.keyword}"`,
      };
    }
    return tx;
  });
}

/**
 * Test a keyword against a sample description (for the rule tester UI).
 */
export function testRule(keyword, sampleText) {
  if (!keyword || !sampleText) return false;
  return sampleText.toLowerCase().includes(keyword.toLowerCase().trim());
}
