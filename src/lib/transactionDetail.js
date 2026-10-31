import { db } from "@/api/supabaseClient";

// Statements import "Uncategorized" when no keyword matches; that value must never
// mask the account the user actually picked for the transaction.
export const isPlaceholderCategory = (category) =>
  !category || category.trim().toLowerCase() === "uncategorized";

export const categoryLabel = (tx) =>
  tx.account_name || (isPlaceholderCategory(tx.category) ? null : tx.category);

/**
 * Allocates a transaction to an account and learns a rule from the manual
 * choice, so future imports land in the same place. Shared by the transactions
 * table and the mobile transaction page so both behave identically.
 */
export async function allocateTransaction({ tx, account, companyId }) {
  const isEdit = tx.status === "allocated" || tx.status === "reviewed";

  const updated = await db.entities.Transaction.update(tx.id, {
    account_id: account.id,
    account_name: account.name,
    status: "allocated",
  });

  if (!isEdit && tx.description) {
    const keyword = tx.description.split(" ").slice(0, 3).join(" ").trim();
    if (keyword.length > 2) {
      try {
        await db.entities.AllocationRule.create({
          company_id: companyId,
          match_field: "description",
          match_type: "contains",
          match_value: keyword,
          account_id: account.id,
          account_name: account.name,
          vat_applicable: account.type === "expense" || account.type === "income",
          is_active: true,
          source: "manual",
        });
      } catch (e) {
        /* duplicate rule — that's fine */
      }
    }
  }

  return { updated, isEdit };
}

/** Asks the AI to explain why a transaction was categorised the way it was. */
export function explainTransaction(tx) {
  return db.integrations.Core.InvokeLLM({
    prompt: `You are a South African chartered accountant. Explain why this transaction was categorized as "${tx.category}" and allocated to "${tx.account_name || "unallocated"}".

Transaction details:
- Date: ${tx.date}
- Description: ${tx.description}
- Amount: R ${tx.amount}
- Type: ${tx.type}
- Reference: ${tx.reference || "N/A"}
- AI Confidence: ${tx.ai_confidence}%

Previous AI reasoning: ${tx.ai_reasoning || "None"}

Provide a clear, professional explanation. Include:
1. Why this category is appropriate under SA GAAP/IFRS
2. The double-entry effect (which accounts are debited/credited)
3. VAT implications at 15%
4. Any compliance considerations`,
  });
}
