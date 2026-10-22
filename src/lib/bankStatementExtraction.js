/**
 * Client-side bank statement extraction and categorization without AI.
 * - CSV: direct parsing
 * - Excel (xlsx/xls): SheetJS (xlsx package)
 * - PDF: text extraction via pdfjs-dist, then line-based parsing
 * - Categorization: keyword-based rules for SA accounting categories
 */

import { extractTextFromFile } from "./documentExtraction";

// ─── Categorization rules (keyword → category) ───
const CATEGORY_RULES = [
  { keywords: ["salary", "wages", "payroll", "paye"], category: "Salaries & Wages", vatable: false },
  { keywords: ["rent", "lease"], category: "Rent", vatable: true },
  { keywords: ["electricity", "water", "rates", "municipal", "utilities"], category: "Utilities", vatable: true },
  { keywords: ["insurance"], category: "Insurance", vatable: true },
  { keywords: ["fuel", "petrol", "diesel", "vehicle", "motor"], category: "Motor Vehicle Expenses", vatable: true },
  { keywords: ["stationery", "office", "supplies", "printing"], category: "Office Supplies", vatable: true },
  { keywords: ["telephone", "internet", "data", "airtime", "vodafone", "mtn", "vodacom", "cell c"], category: "Telephone & Internet", vatable: true },
  { keywords: ["travel", "accommodation", "flight", "uber", "bolt", "taxi"], category: "Travel & Entertainment", vatable: true },
  { keywords: ["bank charge", "bank fee", "fee", "interest", "overdraft"], category: "Bank Charges", vatable: false },
  { keywords: ["sales", "deposit", "payment received", "receipt", "invoice", "eft in", "transfer in"], category: "Sales Revenue", vatable: true },
  { keywords: ["cost of sales", "purchase", "supplier", "stock", "inventory", "cogs"], category: "Cost of Sales", vatable: true },
  { keywords: ["professional", "consult", "legal", "accounting", "auditor"], category: "Professional Fees", vatable: true },
  { keywords: ["vat", "tax"], category: "VAT Input", vatable: false },
  { keywords: ["drawing", "owner"], category: "Owner Drawings", vatable: false },
  { keywords: ["loan", "finance"], category: "Loan Repayment", vatable: false },
  { keywords: ["capital"], category: "Capital", vatable: false },
  { keywords: ["subscription", "membership", "software", "adobe", "google", "microsoft"], category: "Operating Expenses", vatable: true },
];

const VAT_RATE = 0.15;

/**
 * Categorize a single transaction using keyword matching.
 * @param {string} description
 * @param {number} amount — signed (positive = credit, negative = debit)
 * @returns {{ category: string, type: string, vat_amount: number, confidence: number }}
 */
export function categorizeTransaction(description, amount) {
  const lower = (description || "").toLowerCase();
  let category = "Uncategorized";
  let vatable = false;
  let confidence = 30;

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      category = rule.category;
      vatable = rule.vatable;
      confidence = 75;
      break;
    }
  }

  const type = amount >= 0 ? "credit" : "debit";
  const vat_amount = vatable ? Math.round(Math.abs(amount) * VAT_RATE * 100) / 100 : 0;

  return { category, type, vat_amount, confidence };
}

/**
 * Extract transactions from a bank statement file.
 * @param {File} file
 * @returns {Promise<{ transactions: array, bank_name: string, account_number: string }>}
 */
export async function extractBankTransactions(file) {
  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "csv") {
    return parseCsv(file);
  }
  if (ext === "xlsx" || ext === "xls") {
    return parseExcel(file);
  }
  if (ext === "pdf") {
    return parsePdf(file);
  }
  // Fallback: try text extraction
  const text = await extractTextFromFile(file);
  return { transactions: parseTextLines(text), bank_name: "", account_number: "" };
}

// ─── CSV parsing ───
async function parseCsv(file) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { transactions: [], bank_name: "", account_number: "" };

  // Find the header row by looking for date/description/amount columns
  let headerIdx = -1;
  let dateCol = -1, descCol = -1, amountCol = -1, refCol = -1, balanceCol = -1;

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = splitCsvLine(lines[i]);
    const lowerCols = cols.map((c) => c.toLowerCase().trim());
    dateCol = lowerCols.findIndex((c) => /date|datum/.test(c));
    descCol = lowerCols.findIndex((c) => /desc|narrative|details|particular/.test(c));
    amountCol = lowerCols.findIndex((c) => /amount|value|debit|credit|trans/.test(c));
    if (dateCol >= 0) {
      headerIdx = i;
      // If no explicit amount column, look for debit/credit pair
      if (amountCol < 0) {
        const debitCol = lowerCols.findIndex((c) => c === "debit" || c === "withdrawal" || c === "payment");
        const creditCol = lowerCols.findIndex((c) => c === "credit" || c === "deposit" || c === "receipt");
        if (debitCol >= 0 || creditCol >= 0) {
          amountCol = debitCol >= 0 ? debitCol : creditCol;
        }
      }
      refCol = lowerCols.findIndex((c) => /ref|reference/.test(c));
      balanceCol = lowerCols.findIndex((c) => /balance/.test(c));
      break;
    }
  }

  if (headerIdx < 0) {
    // No header found — try to parse all lines as transactions
    return { transactions: lines.map((l) => parseCsvTransaction(l, 0, 1, 2, 3, 4)).filter(Boolean), bank_name: "", account_number: "" };
  }

  const transactions = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 2) continue;

    let amount = null;
    if (amountCol >= 0 && cols[amountCol]) {
      amount = parseFloat(cols[amountCol].replace(/[R\s]/g, "").replace(/,/g, ""));
    } else {
      // Try to find any numeric column
      for (const c of cols) {
        const n = parseFloat(c.replace(/[R\s]/g, "").replace(/,/g, ""));
        if (!isNaN(n) && c.match(/\d/)) { amount = n; break; }
      }
    }
    if (amount === null || isNaN(amount)) continue;

    // Check for separate debit/credit columns
    const lowerCols = splitCsvLine(lines[headerIdx]).map((c) => c.toLowerCase().trim());
    const debitCol = lowerCols.findIndex((c) => c === "debit" || c === "withdrawal" || c === "payment");
    const creditCol = lowerCols.findIndex((c) => c === "credit" || c === "deposit" || c === "receipt");
    if (debitCol >= 0 && creditCol >= 0) {
      const debit = parseFloat((cols[debitCol] || "0").replace(/[R\s]/g, "").replace(/,/g, "")) || 0;
      const credit = parseFloat((cols[creditCol] || "0").replace(/[R\s]/g, "").replace(/,/g, "")) || 0;
      amount = credit - debit;
    }

    transactions.push({
      date: dateCol >= 0 ? normalizeDate(cols[dateCol]) : "",
      description: descCol >= 0 ? (cols[descCol] || "").trim() : cols.find((c) => c && isNaN(parseFloat(c.replace(/[R,\s]/g, "")))) || "",
      amount,
      reference: refCol >= 0 ? (cols[refCol] || "").trim() : "",
      balance: balanceCol >= 0 ? parseFloat((cols[balanceCol] || "0").replace(/[R\s]/g, "").replace(/,/g, "")) || 0 : null,
    });
  }

  // Try to detect bank name from filename
  const bank_name = detectBankName(file.name);
  return { transactions, bank_name, account_number: "" };
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current); current = ""; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}

// ─── Excel parsing ───
async function parseExcel(file) {
  const XLSX = await import("xlsx");
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

  if (rows.length === 0) return { transactions: [], bank_name: "", account_number: "" };

  // Find header row
  let headerIdx = -1;
  let dateCol = -1, descCol = -1, amountCol = -1, refCol = -1, balanceCol = -1;

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cols = (rows[i] || []).map((c) => String(c).toLowerCase().trim());
    dateCol = cols.findIndex((c) => /date|datum/.test(c));
    descCol = cols.findIndex((c) => /desc|narrative|details|particular/.test(c));
    amountCol = cols.findIndex((c) => /amount|value|debit|credit|trans/.test(c));
    if (dateCol >= 0) {
      headerIdx = i;
      refCol = cols.findIndex((c) => /ref|reference/.test(c));
      balanceCol = cols.findIndex((c) => /balance/.test(c));
      break;
    }
  }

  if (headerIdx < 0) return { transactions: [], bank_name: "", account_number: "" };

  const headerCols = (rows[headerIdx] || []).map((c) => String(c).toLowerCase().trim());
  const debitCol = headerCols.findIndex((c) => c === "debit" || c === "withdrawal" || c === "payment");
  const creditCol = headerCols.findIndex((c) => c === "credit" || c === "deposit" || c === "receipt");

  const transactions = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cols = rows[i] || [];
    if (cols.length < 2) continue;

    let amount = null;
    if (debitCol >= 0 && creditCol >= 0) {
      const debit = parseFloat(String(cols[debitCol] || "0").replace(/[R\s]/g, "").replace(/,/g, "")) || 0;
      const credit = parseFloat(String(cols[creditCol] || "0").replace(/[R\s]/g, "").replace(/,/g, "")) || 0;
      amount = credit - debit;
    } else if (amountCol >= 0 && cols[amountCol]) {
      amount = parseFloat(String(cols[amountCol]).replace(/[R\s]/g, "").replace(/,/g, ""));
    } else {
      for (const c of cols) {
        const n = parseFloat(String(c).replace(/[R\s]/g, "").replace(/,/g, ""));
        if (!isNaN(n)) { amount = n; break; }
      }
    }
    if (amount === null || isNaN(amount)) continue;

    transactions.push({
      date: dateCol >= 0 ? normalizeDate(String(cols[dateCol] || "")) : "",
      description: descCol >= 0 ? String(cols[descCol] || "").trim() : "",
      amount,
      reference: refCol >= 0 ? String(cols[refCol] || "").trim() : "",
      balance: balanceCol >= 0 ? parseFloat(String(cols[balanceCol] || "0").replace(/[R\s]/g, "").replace(/,/g, "")) || 0 : null,
    });
  }

  return { transactions, bank_name: detectBankName(file.name), account_number: "" };
}

// ─── PDF parsing ───
async function parsePdf(file) {
  const text = await extractTextFromFile(file);
  return { transactions: parseTextLines(text), bank_name: detectBankName(file.name), account_number: detectAccountNumber(text) };
}

function parseTextLines(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const transactions = [];
  // Date at start of line followed by description and amount
  const dateAmountRe = /^(\d{1,2}[\s\/-]\d{1,2}[\s\/-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+\w{3}\s+\d{2,4})\s+(.+?)\s+R?\s*([\d,]+\.\d{2})\s*$/i;

  for (const line of lines) {
    const m = line.match(dateAmountRe);
    if (m) {
      transactions.push({
        date: normalizeDate(m[1]),
        description: m[2].trim(),
        amount: parseFloat(m[3].replace(/,/g, "")),
        reference: "",
        balance: null,
      });
    }
  }
  return transactions;
}

// ─── Helpers ───
function normalizeDate(str) {
  if (!str) return "";
  str = str.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // DD/MM/YYYY or DD-MM-YYYY
  let m = str.match(/^(\d{1,2})[\/\s-](\d{1,2})[\/\s-](\d{2,4})$/);
  if (m) {
    const [_, d, mo, y] = m;
    return `${y.length === 2 ? "20" + y : y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // DD MMM YYYY
  m = str.match(/^(\d{1,2})\s+(\w{3})\s+(\d{2,4})$/i);
  if (m) {
    const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
    const mo = months[m[2].toLowerCase()];
    if (mo) {
      const y = m[3].length === 2 ? "20" + m[3] : m[3];
      return `${y}-${mo}-${m[1].padStart(2, "0")}`;
    }
  }
  return str;
}

function detectBankName(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes("fnb")) return "FNB";
  if (lower.includes("absa")) return "ABSA";
  if (lower.includes("nedbank")) return "Nedbank";
  if (lower.includes("standard") || lower.includes("stdbank")) return "Standard Bank";
  if (lower.includes("capitec")) return "Capitec";
  if (lower.includes("discovery")) return "Discovery Bank";
  if (lower.includes("investec")) return "Investec";
  return "";
}

function detectAccountNumber(text) {
  const m = text.match(/account\s*(?:no\.?|number)[:\s]*(\d{6,20})/i);
  return m ? m[1] : "";
}
