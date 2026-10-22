/**
 * Client-side South African tax return calculations.
 * Replaces the previous AI-based (Together AI / InvokeLLM) approach.
 */

const VAT_RATE = 0.15;
const COMPANY_TAX_RATE = 0.27;

// SARS individual tax brackets (2025/2026)
const ITR12_BRACKETS = [
  { min: 0,       max: 237100,   rate: 0.18, base: 0 },
  { min: 237100,  max: 370500,   rate: 0.26, base: 42678 },
  { min: 370500,  max: 512800,   rate: 0.31, base: 77362 },
  { min: 512800,  max: 673000,   rate: 0.36, base: 121475 },
  { min: 673000,  max: 857900,   rate: 0.39, base: 179147 },
  { min: 857900,  max: 1817000,  rate: 0.41, base: 251258 },
  { min: 1817000, max: Infinity, rate: 0.45, base: 481685 },
];

/**
 * Calculate ITR12 (personal income tax) for a given taxable income.
 */
function calculateITR12(taxableIncome) {
  const bracket = ITR12_BRACKETS.find(b => taxableIncome > b.min && taxableIncome <= b.max)
    || ITR12_BRACKETS[ITR12_BRACKETS.length - 1];
  const tax = bracket.base + (taxableIncome - bracket.min) * bracket.rate;
  // Primary rebate (2025/2026): R17,235
  const rebate = 17235;
  return Math.max(0, tax - rebate);
}

/**
 * Generate a VAT201 return from transactions in the period.
 */
function generateVAT201(txs, company, periodStart, periodEnd) {
  const credits = txs.filter(t => t.type === "credit");
  const debits = txs.filter(t => t.type === "debit");

  const totalSales = credits.reduce((s, t) => s + (t.amount || 0), 0);
  const totalPurchases = debits.reduce((s, t) => s + (t.amount || 0), 0);

  const outputVAT = credits.reduce((s, t) => s + (t.vat_amount || (t.amount || 0) * VAT_RATE / (1 + VAT_RATE)), 0);
  const inputVAT = debits.reduce((s, t) => s + (t.vat_amount || (t.amount || 0) * VAT_RATE / (1 + VAT_RATE)), 0);

  // Motor vehicle input VAT is limited to 50% (s17(2))
  const mvExpenses = debits.filter(t =>
    t.category?.toLowerCase().includes("motor") ||
    t.category?.toLowerCase().includes("vehicle") ||
    t.description?.toLowerCase().includes("motor") ||
    t.description?.toLowerCase().includes("vehicle fuel")
  );
  const mvInputVAT = mvExpenses.reduce((s, t) => s + (t.vat_amount || (t.amount || 0) * VAT_RATE / (1 + VAT_RATE)), 0);
  const mvRestriction = mvInputVAT * 0.50;

  const otherInputVAT = inputVAT - mvInputVAT;
  const totalInputVAT = otherInputVAT + (mvInputVAT - mvRestriction);
  const nonVATable = txs.filter(t => !t.vat_amount && t.amount).reduce((s, t) => s + t.amount, 0);
  const netVAT = outputVAT - totalInputVAT;

  return {
    return_type: "VAT201",
    total_amount: netVAT,
    summary: `VAT201 for period ${periodStart} to ${periodEnd}. Output VAT: R${outputVAT.toFixed(2)}, Input VAT: R${totalInputVAT.toFixed(2)}, Net VAT ${netVAT >= 0 ? "Payable" : "Refundable"}: R${Math.abs(netVAT).toFixed(2)}`,
    line_items: [
      { label: "Output VAT (Field 4A - Standard Rated Supplies)", amount: outputVAT, description: "15% VAT on sales" },
      { label: "Input VAT - Motor Vehicle Expenses (Field 15 - General Input Tax)", amount: mvInputVAT, description: "Input VAT on motor vehicle expenses" },
      { label: "Input VAT - Other Expenses (Field 15 - General Input Tax)", amount: otherInputVAT, description: "Input VAT on other purchases" },
      { label: "Input VAT - Miscellaneous Expenses", amount: 0, description: "No miscellaneous input VAT" },
      { label: "Total Input VAT (Field 15 - Total Input Tax)", amount: totalInputVAT, description: "Total input VAT after restrictions" },
      { label: "Input VAT Restriction - Motor Vehicle 50% Rule (s17(2) VAT Act)", amount: -mvRestriction, description: "50% restriction on motor vehicle input VAT" },
      { label: "Non-VATable Items Excluded", amount: nonVATable, description: "Items with no VAT component" },
      { label: "Net VAT Payable to SARS (Field 19)", amount: netVAT, description: netVAT >= 0 ? "VAT payable to SARS" : "VAT refundable from SARS" },
    ],
    compliance_notes: `1. VAT REGISTRATION: Ensure ${company.name} is registered for VAT if turnover exceeds R1 million per annum (voluntary registration threshold R50,000). 2. TAX INVOICES: All input VAT claims require valid tax invoices per s20 of the VAT Act. Ensure all invoices meet SARS requirements. 3. FILING: VAT201 returns must be submitted by the 25th of the month following the tax period end.`,
    due_date: addDays(periodEnd, 25),
  };
}

/**
 * Generate ITR14 (company income tax) return.
 */
function generateITR14(txs, company, periodStart, periodEnd) {
  const totalIncome = txs.filter(t => t.type === "credit").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = txs.filter(t => t.type === "debit").reduce((s, t) => s + (t.amount || 0), 0);
  const taxableIncome = totalIncome - totalExpenses;
  const taxPayable = taxableIncome > 0 ? taxableIncome * COMPANY_TAX_RATE : 0;

  return {
    return_type: "ITR14",
    total_amount: taxPayable,
    summary: `ITR14 for period ${periodStart} to ${periodEnd}. Taxable income: R${taxableIncome.toFixed(2)}, Tax at 27%: R${taxPayable.toFixed(2)}`,
    line_items: [
      { label: "Total Income (Turnover)", amount: totalIncome, description: "All credit transactions" },
      { label: "Total Deductible Expenses", amount: totalExpenses, description: "All debit transactions" },
      { label: "Taxable Income", amount: taxableIncome, description: "Income minus expenses" },
      { label: "Company Tax @ 27%", amount: taxPayable, description: "Corporate tax rate" },
      { label: "Net Tax Payable", amount: taxPayable, description: "Tax due to SARS" },
    ],
    compliance_notes: `1. Ensure all expenses are deductible per SARS guidelines. 2. Company tax rate is 27% for years of assessment ending on or after 31 March 2023. 3. Provisional tax (IRP6) returns may be required twice a year.`,
    due_date: addDays(periodEnd, 365),
  };
}

/**
 * Generate ITR12 (personal income tax) return.
 */
function generateITR12(txs, company, periodStart, periodEnd) {
  const totalIncome = txs.filter(t => t.type === "credit").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = txs.filter(t => t.type === "debit").reduce((s, t) => s + (t.amount || 0), 0);
  const taxableIncome = Math.max(0, totalIncome - totalExpenses);
  const taxPayable = calculateITR12(taxableIncome);

  return {
    return_type: "ITR12",
    total_amount: taxPayable,
    summary: `ITR12 for period ${periodStart} to ${periodEnd}. Taxable income: R${taxableIncome.toFixed(2)}, Tax after rebate: R${taxPayable.toFixed(2)}`,
    line_items: [
      { label: "Total Income", amount: totalIncome, description: "All income sources" },
      { label: "Deductible Expenses", amount: totalExpenses, description: "Allowable deductions" },
      { label: "Taxable Income", amount: taxableIncome, description: "Income after deductions" },
      { label: "Tax per SARS Brackets", amount: taxPayable, description: "Calculated using 2025/2026 tax tables with primary rebate" },
      { label: "Net Tax Payable", amount: taxPayable, description: "Final tax liability" },
    ],
    compliance_notes: `1. Personal income tax is calculated using SARS 2025/2026 brackets with primary rebate of R17,235. 2. Ensure all income sources are declared. 3. Medical aid credits and retirement fund deductions may further reduce liability.`,
    due_date: addDays(periodEnd, 365),
  };
}

/**
 * Generate EMP201 (PAYE/UIF/SDL) return.
 */
function generateEMP201(txs, company, periodStart, periodEnd) {
  const payrollTxs = txs.filter(t =>
    t.category?.toLowerCase().includes("salary") ||
    t.category?.toLowerCase().includes("payroll") ||
    t.category?.toLowerCase().includes("wage") ||
    t.description?.toLowerCase().includes("salary") ||
    t.description?.toLowerCase().includes("payroll")
  );
  const totalPayroll = payrollTxs.reduce((s, t) => s + (t.amount || 0), 0);

  // PAYE is estimated at ~20% of payroll (simplified)
  const paye = totalPayroll * 0.20;
  // UIF: 1% employer + 1% employee = 2%
  const uif = totalPayroll * 0.02;
  // SDL: 1% of payroll
  const sdl = totalPayroll * 0.01;
  const total = paye + uif + sdl;

  return {
    return_type: "EMP201",
    total_amount: total,
    summary: `EMP201 for period ${periodStart} to ${periodEnd}. PAYE: R${paye.toFixed(2)}, UIF: R${uif.toFixed(2)}, SDL: R${sdl.toFixed(2)}`,
    line_items: [
      { label: "Total Payroll", amount: totalPayroll, description: "Total remuneration paid" },
      { label: "PAYE (~20% estimated)", amount: paye, description: "Pay As You Earn tax deducted" },
      { label: "UIF (2% - 1% employer + 1% employee)", amount: uif, description: "Unemployment Insurance Fund" },
      { label: "SDL (1% of payroll)", amount: sdl, description: "Skills Development Levy" },
      { label: "Total Payment to SARS", amount: total, description: "PAYE + UIF + SDL" },
    ],
    compliance_notes: `1. EMP201 must be submitted by the 7th of each month. 2. PAYE is estimated at 20% — actual amounts depend on individual employee tax brackets. 3. UIF is capped at R177.12 per month (on salary up to R17,712). 4. SDL applies if payroll exceeds R500,000 per annum.`,
    due_date: addDays(periodEnd, 7),
  };
}

/**
 * Generate IRP5 (employee tax certificate) return.
 */
function generateIRP5(txs, company, periodStart, periodEnd) {
  const payrollTxs = txs.filter(t =>
    t.category?.toLowerCase().includes("salary") ||
    t.category?.toLowerCase().includes("payroll") ||
    t.category?.toLowerCase().includes("wage") ||
    t.description?.toLowerCase().includes("salary") ||
    t.description?.toLowerCase().includes("payroll")
  );
  const grossIncome = payrollTxs.reduce((s, t) => s + (t.amount || 0), 0);
  const paye = grossIncome * 0.20;
  const uif = grossIncome * 0.02;
  const netPay = grossIncome - paye - uif;

  return {
    return_type: "IRP5",
    total_amount: grossIncome,
    summary: `IRP5 for period ${periodStart} to ${periodEnd}. Gross income: R${grossIncome.toFixed(2)}, PAYE: R${paye.toFixed(2)}, Net pay: R${netPay.toFixed(2)}`,
    line_items: [
      { label: "Gross Remuneration (3601)", amount: grossIncome, description: "Total taxable income" },
      { label: "PAYE Deducted (4102)", amount: paye, description: "Tax deducted at source" },
      { label: "UIF Contributions (4142)", amount: uif, description: "UIF employee + employer" },
      { label: "Net Pay", amount: netPay, description: "Amount paid to employee" },
    ],
    compliance_notes: `1. IRP5 certificates must be issued to employees by 31 May following the tax year. 2. PAYE is estimated at 20% — actual amounts depend on individual brackets. 3. Ensure all fringe benefits are included in gross income.`,
    due_date: addDays(periodEnd, 150),
  };
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Main entry: calculate a tax return locally from transaction data.
 * @returns {object} with return_type, total_amount, summary, line_items, compliance_notes, due_date
 */
export function calculateTaxReturn(type, transactions, company, periodStart, periodEnd) {
  const periodTxs = transactions.filter(t =>
    t.date >= periodStart && t.date <= periodEnd
  );

  switch (type) {
    case "VAT201":  return generateVAT201(periodTxs, company, periodStart, periodEnd);
    case "ITR14":  return generateITR14(periodTxs, company, periodStart, periodEnd);
    case "ITR12":  return generateITR12(periodTxs, company, periodStart, periodEnd);
    case "EMP201": return generateEMP201(periodTxs, company, periodStart, periodEnd);
    case "IRP5":   return generateIRP5(periodTxs, company, periodStart, periodEnd);
    default:
      return {
        return_type: type,
        total_amount: 0,
        summary: `Unknown return type: ${type}`,
        line_items: [],
        compliance_notes: "",
        due_date: "",
      };
  }
}
