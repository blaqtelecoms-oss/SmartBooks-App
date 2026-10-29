/**
 * SARS VAT 201 Calculator — deterministic, no AI.
 * Computes the standard SARS VAT201 boxes from transaction data.
 */

const VAT_RATE = 0.15;

/**
 * Extract the VAT portion from an amount.
 * If vat_inclusive: VAT = amount * 15/115. Otherwise VAT = amount * 15%.
 */
function extractVAT(amount, vatAmount, vatInclusive) {
  if (vatAmount && vatAmount > 0) return vatAmount;
  if (!amount) return 0;
  return vatInclusive ? amount * VAT_RATE / (1 + VAT_RATE) : amount * VAT_RATE;
}

/**
 * Calculate VAT 201 boxes for a set of transactions in a date range.
 * @returns {object} { boxes, summary, sourceTransactions }
 */
export function calculateVAT201(transactions, periodStart, periodEnd) {
  const inRange = transactions.filter(t =>
    t.date >= periodStart && t.date <= periodEnd
  );

  // Separate by type and VAT classification
  const credits = inRange.filter(t => t.type === "credit");
  const debits = inRange.filter(t => t.type === "debit");

  // Standard rate supplies (sales)
  const standardSales = credits.filter(t =>
    !t.vat_classification || t.vat_classification === "standard"
  );
  const zeroRatedSales = credits.filter(t => t.vat_classification === "zero_rated");
  const exemptSales = credits.filter(t => t.vat_classification === "exempt");

  // Input tax (purchases)
  const standardPurchases = debits.filter(t =>
    !t.vat_classification || t.vat_classification === "standard"
  );
  const capitalGoods = standardPurchases.filter(t =>
    t.category?.toLowerCase().includes("capital") ||
    t.category?.toLowerCase().includes("asset") ||
    t.category?.toLowerCase().includes("equipment") ||
    t.category?.toLowerCase().includes("vehicle") ||
    t.category?.toLowerCase().includes("machinery")
  );
  const otherGoods = standardPurchases.filter(t => !capitalGoods.includes(t));

  // Box calculations
  const box1Value = standardSales.reduce((s, t) => s + (t.amount || 0), 0);
  const box1Tax = standardSales.reduce((s, t) =>
    s + extractVAT(t.amount, t.vat_amount, t.vat_inclusive), 0
  );

  const box2Value = zeroRatedSales.reduce((s, t) => s + (t.amount || 0), 0);
  const box2Tax = 0; // Zero-rated = 0% VAT

  const box3Total = box1Tax + box2Tax; // Total output tax

  const box12Value = capitalGoods.reduce((s, t) => s + (t.amount || 0), 0);
  const box12Tax = capitalGoods.reduce((s, t) =>
    s + extractVAT(t.amount, t.vat_amount, t.vat_inclusive), 0
  );

  const box14Value = otherGoods.reduce((s, t) => s + (t.amount || 0), 0);
  const box14Tax = otherGoods.reduce((s, t) =>
    s + extractVAT(t.amount, t.vat_amount, t.vat_inclusive), 0
  );

  const box15Total = box12Tax + box14Tax; // Total input tax

  const box18VAT = box3Total - box15Total; // VAT payable / (refundable)

  return {
    boxes: [
      { box: 1, label: "Standard Rate Local Supplies", value: box1Value, tax: box1Tax, transactions: standardSales },
      { box: 2, label: "Zero-Rated Supplies", value: box2Value, tax: box2Tax, transactions: zeroRatedSales },
      { box: 3, label: "Total Output Tax", value: null, tax: box3Total, transactions: [...standardSales, ...zeroRatedSales] },
      { box: 4, label: "Capital Goods Input Tax", value: box12Value, tax: box12Tax, transactions: capitalGoods },
      { box: 5, label: "Other Goods & Services Input Tax", value: box14Value, tax: box14Tax, transactions: otherGoods },
      { box: 6, label: "Total Input Tax", value: null, tax: box15Total, transactions: [...capitalGoods, ...otherGoods] },
      { box: 7, label: "VAT Payable / (Refundable)", value: null, tax: box18VAT, transactions: [] },
    ],
    summary: {
      totalOutput: box3Total,
      totalInput: box15Total,
      netVAT: box18VAT,
      isRefund: box18VAT < 0,
    },
    periodStart,
    periodEnd,
  };
}

/**
 * Generate CSV export of the VAT 201 report.
 */
export function exportVAT201CSV(report) {
  const rows = [
    ["SARS VAT 201 RETURN"],
    ["Period", `${report.periodStart} to ${report.periodEnd}`],
    [],
    ["Box", "Description", "Value (R)", "VAT (R)"],
  ];
  report.boxes.forEach(b => {
    rows.push([
      `Box ${b.box}`,
      b.label,
      b.value !== null ? b.value.toFixed(2) : "-",
      b.tax.toFixed(2),
    ]);
  });
  rows.push([]);
  rows.push(["Net VAT Payable/(Refundable)", report.summary.netVAT.toFixed(2)]);
  return rows.map(r => r.join(",")).join("\n");
}
