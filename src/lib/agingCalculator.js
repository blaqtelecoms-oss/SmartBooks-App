/**
 * Aging Calculator — debtor/creditor aging reports (30/60/90 days).
 */

/**
 * Days between two dates (positive = overdue).
 */
function daysBetween(dueDate, asOfDate) {
  const due = new Date(dueDate);
  const asOf = new Date(asOfDate);
  return Math.floor((asOf - due) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate aging buckets for a set of invoices.
 * @param {array} invoices - unpaid/partial invoices with due_date
 * @param {string} asOfDate - reference date (default today)
 * @returns {object} { contacts: [{ contact, buckets, total }], totals }
 */
export function calculateAging(invoices, contacts, asOfDate) {
  const ref = asOfDate || new Date().toISOString().split("T")[0];
  const openInvoices = invoices.filter(inv =>
    inv.status !== "paid" && inv.status !== "cancelled"
  );

  // Group invoices by contact
  const byContact = {};
  openInvoices.forEach(inv => {
    const cid = inv.contact_id;
    if (!byContact[cid]) byContact[cid] = [];
    byContact[cid].push(inv);
  });

  const results = Object.entries(byContact).map(([contactId, invs]) => {
    const contact = contacts.find(c => c.id === contactId) || { name: "Unknown", email: "" };
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0 };
    let total = 0;

    invs.forEach(inv => {
      const days = daysBetween(inv.due_date, ref);
      const amount = inv.total_amount || 0;
      total += amount;
      if (days <= 0) buckets.current += amount;
      else if (days <= 30) buckets.days30 += amount;
      else if (days <= 60) buckets.days60 += amount;
      else buckets.days90 += amount;
    });

    return { contact, buckets, total, invoiceCount: invs.length };
  });

  // Sort by total descending
  results.sort((a, b) => b.total - a.total);

  const totals = results.reduce((acc, r) => {
    acc.current += r.buckets.current;
    acc.days30 += r.buckets.days30;
    acc.days60 += r.buckets.days60;
    acc.days90 += r.buckets.days90;
    acc.grand += r.total;
    return acc;
  }, { current: 0, days30: 0, days60: 0, days90: 0, grand: 0 });

  return { contacts: results, totals };
}

/**
 * Generate CSV for aging report.
 */
export function exportAgingCSV(agingData, type) {
  const rows = [
    [`${type === "customer" ? "Debtors" : "Creditors"} Aging Report`],
    ["Generated", new Date().toISOString().split("T")[0]],
    [],
    ["Contact", "Current", "1-30 Days", "31-60 Days", "90+ Days", "Total"],
  ];
  agingData.contacts.forEach(r => {
    rows.push([
      r.contact.name,
      r.buckets.current.toFixed(2),
      r.buckets.days30.toFixed(2),
      r.buckets.days60.toFixed(2),
      r.buckets.days90.toFixed(2),
      r.total.toFixed(2),
    ]);
  });
  rows.push([]);
  rows.push([
    "TOTAL",
    agingData.totals.current.toFixed(2),
    agingData.totals.days30.toFixed(2),
    agingData.totals.days60.toFixed(2),
    agingData.totals.days90.toFixed(2),
    agingData.totals.grand.toFixed(2),
  ]);
  return rows.map(r => r.join(",")).join("\n");
}
