// Standard South African chart of accounts.
// Shared by the chart-of-accounts page and the onboarding wizard so a new
// business starts with the same ledger structure.
export const defaultAccounts = [
  { code: "1000", name: "Bank Account", type: "asset", sub_type: "current_asset", normal_side: "debit" },
  { code: "1100", name: "Accounts Receivable", type: "asset", sub_type: "current_asset", normal_side: "debit" },
  { code: "1200", name: "Inventory", type: "asset", sub_type: "current_asset", normal_side: "debit" },
  { code: "1500", name: "Equipment", type: "asset", sub_type: "fixed_asset", normal_side: "debit" },
  { code: "2000", name: "Accounts Payable", type: "liability", sub_type: "current_liability", normal_side: "credit" },
  { code: "2100", name: "VAT Payable", type: "vat", sub_type: "vat_output", normal_side: "credit" },
  { code: "2110", name: "VAT Receivable", type: "vat", sub_type: "vat_input", normal_side: "debit" },
  { code: "2200", name: "PAYE Payable", type: "paye", sub_type: "paye", normal_side: "credit" },
  { code: "2210", name: "UIF Payable", type: "paye", sub_type: "uif", normal_side: "credit" },
  { code: "2220", name: "SDL Payable", type: "paye", sub_type: "sdl", normal_side: "credit" },
  { code: "3000", name: "Owner's Equity", type: "equity", sub_type: "capital", normal_side: "credit" },
  { code: "3100", name: "Retained Earnings", type: "equity", sub_type: "retained_earnings", normal_side: "credit" },
  { code: "4000", name: "Sales Revenue", type: "income", sub_type: "revenue", normal_side: "credit" },
  { code: "4100", name: "Other Income", type: "income", sub_type: "other_income", normal_side: "credit" },
  { code: "5000", name: "Cost of Sales", type: "expense", sub_type: "cost_of_sales", normal_side: "debit" },
  { code: "6000", name: "Salaries & Wages", type: "expense", sub_type: "operating", normal_side: "debit" },
  { code: "6100", name: "Rent", type: "expense", sub_type: "operating", normal_side: "debit" },
  { code: "6200", name: "Utilities", type: "expense", sub_type: "operating", normal_side: "debit" },
  { code: "6300", name: "Bank Charges", type: "expense", sub_type: "operating", normal_side: "debit" },
  { code: "6400", name: "Insurance", type: "expense", sub_type: "operating", normal_side: "debit" },
  { code: "6500", name: "Motor Vehicle Expenses", type: "expense", sub_type: "operating", normal_side: "debit" },
  { code: "6600", name: "Office Supplies", type: "expense", sub_type: "operating", normal_side: "debit" },
  { code: "6700", name: "Professional Fees", type: "expense", sub_type: "operating", normal_side: "debit" },
  { code: "6800", name: "Telephone & Internet", type: "expense", sub_type: "operating", normal_side: "debit" },
  { code: "6900", name: "Depreciation", type: "expense", sub_type: "operating", normal_side: "debit" }
];

// Stock-only accounts that a pure service business never uses.
const STOCK_ACCOUNTS = ["1200", "5000"];

export const defaultAccountsFor = (offeringType) =>
  offeringType === "services"
    ? defaultAccounts.filter((account) => !STOCK_ACCOUNTS.includes(account.code))
    : defaultAccounts;
