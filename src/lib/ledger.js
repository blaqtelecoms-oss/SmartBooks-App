/**
 * Shared ledger maths for the accounting statements.
 * Debit is positive, credit is negative — every helper below uses that signed value
 * so trial balance, P&L and balance sheet agree with each other.
 */
const DEBIT_NATURAL = new Set(["asset", "expense"]);

export const amountOf = (t) => Number(t.amount) || 0;
export const isPosted = (t) => t.status !== "unallocated";
export const signedMovement = (t) => (t.type === "debit" ? amountOf(t) : -amountOf(t));

/** Stored account balances follow the account's natural side; sign them for maths. */
export const signedBalance = (account) =>
  (DEBIT_NATURAL.has(account.type) ? 1 : -1) * (Number(account.balance) || 0);

/** One row per account: opening balance + posted movements, split into debit/credit. */
export const buildLedger = (accounts = [], transactions = []) => {
  const posted = transactions.filter(isPosted);
  return accounts
    .map((account) => {
      const movement = posted
        .filter((t) => t.account_id === account.id)
        .reduce((sum, t) => sum + signedMovement(t), 0);
      const signed = signedBalance(account) + movement;
      return {
        ...account,
        movement,
        signed,
        debit: signed > 0 ? signed : 0,
        credit: signed < 0 ? -signed : 0,
      };
    })
    .sort((a, b) => String(a.code).localeCompare(String(b.code)));
};

const sumWhere = (rows, predicate) =>
  rows.filter(predicate).reduce((sum, row) => sum + row.signed, 0);

export const groupTotal = (rows, types) => sumWhere(rows, (r) => types.includes(r.type));

export const trialBalanceTotals = (rows) => {
  const debit = rows.reduce((s, r) => s + r.debit, 0);
  const credit = rows.reduce((s, r) => s + r.credit, 0);
  return { debit, credit, difference: debit - credit };
};

export const profitAndLoss = (rows) => {
  const income = -groupTotal(rows, ["income"]);
  const expenses = groupTotal(rows, ["expense"]);
  return { income, expenses, net: income - expenses };
};

export const balanceSheet = (rows) => {
  const assets = groupTotal(rows, ["asset"]);
  const liabilities = -groupTotal(rows, ["liability", "vat", "paye"]);
  const equityAccounts = -groupTotal(rows, ["equity"]);
  const { net: retainedEarnings } = profitAndLoss(rows);
  const equity = equityAccounts + retainedEarnings;
  return { assets, liabilities, equity, equityAccounts, retainedEarnings, netWorth: liabilities + equity };
};

/** Expense rows biggest first, plus the transactions that make them up. */
export const expenseBreakdown = (rows = [], transactions = []) => {
  const expenseIds = new Set(rows.filter((r) => r.type === "expense").map((r) => r.id));
  const lines = rows
    .filter((r) => r.type === "expense" && Math.abs(r.signed) > 0.004)
    .sort((a, b) => b.signed - a.signed);
  const entries = transactions
    .filter((t) => isPosted(t) && expenseIds.has(t.account_id))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { lines, entries, total: lines.reduce((s, r) => s + r.signed, 0) };
};

const daysOverdue = (dueDate, today) => {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return 0;
  return Math.floor((today - due) / 86400000);
};

const bucketOf = (days) => {
  if (days <= 0) return "current";
  if (days <= 30) return "days30";
  if (days <= 60) return "days60";
  return "older";
};

export const EMPTY_BUCKETS = { current: 0, days30: 0, days60: 0, older: 0, total: 0 };

/**
 * Outstanding debtor (sales) and creditor (purchase) balances from invoices,
 * aged by due date into current / 1–30 / 31–60 / 60+.
 */
export const outstandingByContact = (invoices = [], contacts = []) => {
  const today = new Date();
  const open = invoices.filter((i) => !["paid", "cancelled"].includes(i.status));
  const group = (type) => {
    const byContact = new Map();
    open
      .filter((i) => i.type === type)
      .forEach((invoice) => {
        const contact = contacts.find((c) => c.id === invoice.contact_id);
        const key = invoice.contact_id || "unknown";
        const entry = byContact.get(key) || {
          id: key,
          name: contact?.name || "Unassigned",
          buckets: { ...EMPTY_BUCKETS },
        };
        const bucket = bucketOf(daysOverdue(invoice.due_date, today));
        const amount = Number(invoice.total_amount) || 0;
        entry.buckets[bucket] += amount;
        entry.buckets.total += amount;
        byContact.set(key, entry);
      });
    const rows = [...byContact.values()].sort((a, b) => b.buckets.total - a.buckets.total);
    const totals = rows.reduce(
      (acc, row) => {
        acc.current += row.buckets.current;
        acc.days30 += row.buckets.days30;
        acc.days60 += row.buckets.days60;
        acc.older += row.buckets.older;
        acc.total += row.buckets.total;
        return acc;
      },
      { ...EMPTY_BUCKETS }
    );
    return { rows, totals };
  };
  return { debtors: group("sales"), creditors: group("purchase") };
};
