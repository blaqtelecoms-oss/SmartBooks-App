/**
 * Client-side bank statement extraction and categorization without AI.
 * - CSV/TSV: delimiter-aware parsing with a header-based column map
 * - Excel (xlsx/xls): SheetJS, same column map
 * - PDF: layout-aware text extraction (pdfjs-dist), then row parsing
 *
 * Every transaction row in the file is kept, in source order. Rows that are not
 * transactions (opening/closing balances, totals, headers, footers) are
 * dropped, and a row is only accepted when the document supports it.
 */

import { extractTextFromFile } from "./documentExtraction";
import {
  normalizeDate,
  parseMoneyToken,
  round2,
  signedAmount,
  stripDateTokens,
  takeLeadingDate,
  tidyText,
} from "./amountParsing";

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

// ─── Rows that are not transactions ───
const BALANCE_MARKER_RE =
  /^(opening balance|closing balance|balance brought forward|balance carried forward|balance forward|brought forward|carried forward|opening|closing)\b/i;
const SUMMARY_ROW_RE =
  /^(total|totals|sub\s*total|statement summary|summary|end of statement)(\s+(debits?|credits?|transactions?|amount|amounts|balance|for the period))?$/i;

// A line that wraps the row above, but only descriptive text — not a reference or footer.
const CONTINUATION_STOP_RE =
  /^(ref|reference|cheque|chq|card|txn|transaction|auth|approval|vat|tax|total|page|statement|account|date|time)\b/i;

// ─── Statement columns (Fees / Credits / Debits / Running balance) ───

// Column headings a statement prints above its money columns.
const COLUMN_HEADINGS = [
  { key: "fees", re: /\bfees?\b/i },
  { key: "credits", re: /\bcredits?\b|\bdeposits?\b|\bmoney\s+in\b|\bpaid\s+in\b/i },
  { key: "debits", re: /\bdebits?\b|\bwithdrawals?\b|\bmoney\s+out\b|\bpaid\s+out\b/i },
  { key: "amount", re: /\bamount\b/i },
  { key: "balance", re: /\b(?:running\s+|closing\s+)?balance\b/i },
];

// A dash is an empty cell ("-", "–"), never an amount.
const DASH_CELL_RE = /^[-–—−]+$/;

const OPENING_BALANCE_RE = /open|brought\s+forward|b\/f|begin(ning)?|previous\s+balance/i;
const CLOSING_BALANCE_RE = /clos|carried\s+forward|c\/f|end(ing)?\s+balance/i;

// The statement's own Summary block: "Total Credit", "Total Debit", "Total Fees*".
const SUMMARY_TOTAL_RE = /^totals?\s+(credits?|debits?|deposits?|withdrawals?|fees?)\b/i;

/** Reads one of the statement's printed Summary totals. */
function readSummaryTotal(description, value) {
  if (value == null) return null;
  const match = description.match(SUMMARY_TOTAL_RE);
  if (!match) return null;
  const kind = match[1].toLowerCase();
  if (kind.startsWith("fee")) return { key: "total_fees", value: Math.abs(value) };
  if (kind.startsWith("credit") || kind.startsWith("deposit")) return { key: "total_credit", value: Math.abs(value) };
  return { key: "total_debit", value: Math.abs(value) };
}

/**
 * Reads the money columns of a statement ("Fees(-) Credits(+) Debits(-) Running
 * Balance") so each row's trailing figures are read by column instead of guessed
 * from the right edge.
 * @returns {string[] | null} column keys in reading order, balance last
 */
function layoutFrom(text) {
  const ordered = COLUMN_HEADINGS.map(({ key, re }) => {
    const match = text.match(re);
    return match ? { key, index: match.index } : null;
  })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.key);
  const found = ordered.filter((key, index) => ordered.indexOf(key) === index);
  if (found.filter((key) => key !== "balance").length < 2) return null;
  // The running balance always sits at the right edge of the row.
  return found.includes("balance") ? found : [...found, "balance"];
}

function detectColumnLayout(lines) {
  const clean = (value) => String(value || "").replace(/[|¦]/g, " ").replace(/\s+/g, " ").trim();
  const limit = Math.min(lines.length, 40);
  let best = null;
  for (let i = 0; i < limit; i += 1) {
    const text = clean(lines[i]);
    if (!text || takeLeadingDate(text)) continue;
    // A wide heading can wrap onto the next line ("… Debits(-) Running" / "Balance").
    const next = clean(lines[i + 1]);
    const candidates = [layoutFrom(text)];
    if (next && !takeLeadingDate(next)) candidates.push(layoutFrom(`${text} ${next}`));
    for (const layout of candidates) {
      if (layout && (!best || layout.length > best.length)) best = layout;
    }
  }
  return best;
}

/**
 * Reads a row's trailing column cells from the right edge. Dash placeholders are
 * kept as empty cells, so "… - - 98 0.50" reads as fees empty, credits empty,
 * debits 98, balance 0.50.
 */
function scanTrailingColumns(body, maxColumns) {
  const tokens = body.split(" ").filter(Boolean);
  const cells = [];
  let index = tokens.length - 1;
  while (index >= 0 && cells.length < maxColumns) {
    const token = tokens[index];
    if (DASH_CELL_RE.test(token)) {
      cells.unshift({ value: null, dash: true });
      index -= 1;
      continue;
    }
    const money = parseMoneyToken(token, { allowWhole: true });
    if (!money) break;
    cells.unshift({ value: signedAmount(money), money });
    index -= 1;
    // "R 98.00" prints the currency and the figure as two tokens.
    if (index >= 0 && /^(r|zar)$/i.test(tokens[index])) index -= 1;
  }
  return { cells, words: tokens.slice(0, index + 1) };
}

/** Signed movement of a row, read from its Fees / Credits / Debits / Amount cells. */
function movementFromColumns(layout, values) {
  if (layout.includes("amount") && !layout.includes("credits") && !layout.includes("debits")) {
    return round2(values.amount || 0);
  }
  const fees = Math.abs(values.fees || 0);
  const credits = Math.abs(values.credits || 0);
  const debits = Math.abs(values.debits || 0);
  return round2(credits - debits - fees);
}

/** Description text wrapped under the row above belongs to that row, not to page furniture. */
function absorbDescription(description, { leading, pendingDescription, previousTransaction }) {
  const isText = /([A-Za-z]{2}\s+){1,}/.test(description) && !CONTINUATION_STOP_RE.test(description);
  if (!isText) return pendingDescription;
  if (pendingDescription) return tidyText(`${pendingDescription} ${description}`);
  if (previousTransaction) {
    previousTransaction.description = tidyText(
      `${previousTransaction.description} ${description}`
    );
    return pendingDescription;
  }
  return leading ? description : pendingDescription;
}

// ─── Free-text (PDF / OCR) statement rows ───

// Money as statements actually print it: "1 250,00", "1,250.00", "500.00", "1,250".
// Reading it as one token keeps spaces used as thousand separators out of the
// description ("R 1 250,00" is one amount, not 1 and 250,00).
const MONEY_TOKEN_SOURCE =
  "(?:" +
  "\\d{1,3}(?:[ \\u00A0]\\d{3})+[.,]\\d{1,2}" +
  "|\\d{1,3}(?:[.,]\\d{3})+[.,]\\d{1,2}" +
  "|\\d+(?:[.,]\\d{1,2})" +
  "|\\d{1,3}(?:[.,]\\d{3})+" +
  ")" +
  "(?:\\s?(?:CR|DR))?";

const newMoneyTokenRe = () => new RegExp(MONEY_TOKEN_SOURCE, "g");

function scanStatementTokens(body) {
  const amounts = [];
  for (const match of body.match(newMoneyTokenRe()) || []) {
    const money = parseMoneyToken(match, { allowWhole: false });
    if (money) amounts.push(money);
  }
  const words = body
    .replace(newMoneyTokenRe(), " ")
    .split(" ")
    .filter((word) => word && !/^(r|zar)$/i.test(word));
  return { amounts, words };
}

/**
 * Fallback for rows printed without decimals: only the values at the very end
 * of the line are considered, so a reference number mid-row is never money.
 */
function scanTrailingAmounts(body) {
  const tokens = body.split(" ").filter(Boolean);
  const amounts = [];
  let index = tokens.length - 1;
  while (index >= 0 && amounts.length < 2) {
    const money = parseMoneyToken(tokens[index], { allowWhole: true });
    if (!money) break;
    amounts.unshift(money);
    index -= 1;
  }
  return { amounts, words: tokens.slice(0, index + 1) };
}

/**
 * Parse statement text (PDF text layer or OCR output) into transaction rows.
 * @param {string} text
 * @returns {Array<{ date: string, description: string, amount: number, reference: string, balance: number|null }>}
 */
export function parseStatementText(text) {
  return parseStatementDocument(text).transactions;
}

/**
 * Same rows as parseStatementText, plus the statement's own opening and closing
 * balances when it prints them.
 * @returns {{ transactions: Array<object>, opening_balance: number|null, closing_balance: number|null }}
 */
export function parseStatementDocument(text) {
  const lines = String(text || "").split(/\r?\n/);
  const layout = detectColumnLayout(lines);
  const transactions = [];
  let lastDate = "";
  let pendingDescription = "";
  let previousBalance = null;
  let openingBalance = null;
  let closingBalance = null;
  let previousTransaction = null;
  const printedTotals = {};

  for (const rawLine of lines) {
    const line = rawLine.replace(/[|¦]/g, " ").replace(/\s+/g, " ").trim();
    if (!line) continue;

    const leading = takeLeadingDate(line);
    if (leading) {
      const parsed = normalizeDate(leading.date);
      if (parsed) lastDate = parsed;
    }
    const body = stripDateTokens(leading ? leading.rest : line);
    const context = { leading, pendingDescription, previousTransaction };

    // Separate Fees / Credits / Debits / Balance columns: a dash means "nothing in
    // this column", never an amount.
    if (layout) {
      const { cells, words } = scanTrailingColumns(body, layout.length);
      const description = tidyText(words.join(" "));

      if (BALANCE_MARKER_RE.test(description) || SUMMARY_ROW_RE.test(description) || SUMMARY_TOTAL_RE.test(description)) {
        const value = cells.length > 0 ? cells[cells.length - 1].value : null;
        const total = readSummaryTotal(description, value);
        if (total) printedTotals[total.key] = total.value;
        if (value != null && BALANCE_MARKER_RE.test(description)) {
          if (CLOSING_BALANCE_RE.test(description)) closingBalance = value;
          else if (OPENING_BALANCE_RE.test(description)) openingBalance = value;
          previousBalance = value;
        }
        continue;
      }

      if (cells.length === 0) {
        pendingDescription = absorbDescription(description, context);
        continue;
      }

      const values = {};
      const offset = layout.length - cells.length;
      cells.forEach((cell, index) => {
        const key = layout[offset + index];
        if (key && cell.value != null) values[key] = cell.value;
      });

      let amount = movementFromColumns(layout, values);
      const balance = values.balance ?? null;

      // Dashes dropped by the PDF text layer shift a column; the running balance
      // confirms the real movement and its direction.
      if (balance != null && previousBalance != null && Math.abs(round2(previousBalance + amount) - balance) > 0.02) {
        const delta = round2(balance - previousBalance);
        if (Math.abs(round2(previousBalance - amount) - balance) <= 0.02) {
          amount = round2(-amount);
        } else {
          const moved = [values.fees, values.credits, values.debits, values.amount]
            .filter((value) => value != null)
            .some((value) => Math.abs(Math.abs(delta) - Math.abs(value)) <= 0.02);
          if (Math.abs(delta) >= 0.01 && moved) amount = delta;
        }
      }

      if (amount === 0) continue;
      // A row without its own date is only trusted when the running balance moved by
      // exactly its amount — never an address, phone number or footer row.
      const reconciled = balance != null && previousBalance != null &&
        Math.abs(round2(previousBalance + amount) - balance) <= 0.02;
      if (!leading && !reconciled) continue;

      const transaction = {
        date: leading ? normalizeDate(leading.date) || lastDate : lastDate,
        description: tidyText(`${pendingDescription} ${description}`) || "Transaction",
        amount,
        fee: Math.abs(values.fees || 0),
        reference: "",
        balance,
      };

      pendingDescription = "";
      transactions.push(transaction);
      previousTransaction = transaction;
      if (balance != null) previousBalance = balance;
      continue;
    }

    const primary = scanStatementTokens(body);
    let amounts = primary.amounts;
    let words = primary.words;
    let usedFallback = false;
    if (amounts.length === 0) {
      const fallback = scanTrailingAmounts(body);
      if (fallback.amounts.length > 0) {
        amounts = fallback.amounts;
        words = fallback.words;
        usedFallback = true;
      }
    }

    const description = tidyText(words.join(" "));

    // Opening/closing balance rows seed the running balance; totals are not transactions.
    if (BALANCE_MARKER_RE.test(description) || SUMMARY_ROW_RE.test(description) || SUMMARY_TOTAL_RE.test(description)) {
      if (SUMMARY_TOTAL_RE.test(description)) {
        const tail = scanTrailingColumns(body, 2);
        const total = readSummaryTotal(
          description,
          tail.cells.length > 0
            ? tail.cells[tail.cells.length - 1].value
            : amounts.length > 0 ? signedAmount(amounts[amounts.length - 1]) : null
        );
        if (total) printedTotals[total.key] = total.value;
      }
      if (BALANCE_MARKER_RE.test(description)) {
        // Whole figures ("Opening balance 0") are only read here, never as transactions.
        const tail = scanTrailingColumns(body, 2);
        const value = tail.cells.length > 0
          ? tail.cells[tail.cells.length - 1].value
          : amounts.length > 0 ? signedAmount(amounts[amounts.length - 1]) : null;
        if (value != null) {
          if (CLOSING_BALANCE_RE.test(description)) closingBalance = value;
          else if (OPENING_BALANCE_RE.test(description)) openingBalance = value;
          previousBalance = value;
        }
      }
      continue;
    }

    if (amounts.length === 0) {
      // A description that wraps onto the next line belongs to its row, not to page furniture.
      pendingDescription = absorbDescription(description, context);
      continue;
    }

    const hasBalanceColumn = amounts.length >= 2;
    const balanceToken = hasBalanceColumn ? amounts[amounts.length - 1] : null;
    const candidates = hasBalanceColumn ? amounts.slice(0, -1) : amounts;

    let amountToken = candidates[candidates.length - 1];
    let direction = null;
    const balance = balanceToken ? signedAmount(balanceToken) : null;

    // A running balance settles both which figure is the amount and which way it moves.
    if (balance != null && previousBalance != null) {
      const delta = round2(balance - previousBalance);
      if (Math.abs(delta) >= 0.01) {
        const match = candidates.find((c) => Math.abs(Math.abs(delta) - c.value) <= 0.02);
        if (match) {
          amountToken = match;
          direction = delta < 0 ? -1 : 1;
        }
      }
    }

    // Without a date of its own, a row is only trusted when the balance moved by its amount.
    if (!leading && direction == null) continue;
    // Amounts printed without decimals are only trusted when the balance confirms them.
    if (usedFallback && direction == null) continue;
    if (!amountToken || amountToken.value <= 0) continue;

    const sign = direction != null ? direction : amountToken.negative ? -1 : 1;
    const marked = direction != null || amountToken.negative || Boolean(amountToken.suffix);

    const transaction = {
      date: leading ? normalizeDate(leading.date) || lastDate : lastDate,
      description: tidyText(`${pendingDescription} ${description}`) || "Transaction",
      amount: round2(amountToken.value * sign),
      fee: 0,
      reference: "",
      balance,
      $signal: direction != null ? "balance" : marked ? "marked" : "none",
      $creditMarker: amountToken.suffix === "CR",
    };

    pendingDescription = "";
    transactions.push(transaction);
    previousTransaction = transaction;
    if (balance != null) previousBalance = balance;
  }

  // A statement that marks credits with "CR" leaves every unmarked amount a debit.
  if (transactions.some((transaction) => transaction.$creditMarker)) {
    for (const transaction of transactions) {
      if (transaction.$signal === "none") transaction.amount = -Math.abs(transaction.amount);
    }
  }

  return {
    transactions: transactions.map(({ $signal, $creditMarker, ...transaction }) => transaction),
    opening_balance: openingBalance,
    closing_balance: closingBalance,
    ...printedTotals,
  };
}

// ─── Tabular (CSV / Excel) parsing ───

/**
 * @param {string[][]} rows
 * @returns {Array<object>} transactions
 */
export function parseTableRows(rows) {
  return parseTableDocument(rows).transactions;
}

/** Tabular rows plus the statement's own opening and closing balances. */
function parseTableDocument(rows) {
  const header = findHeaderRow(rows);
  if (!header) return { transactions: [], opening_balance: null, closing_balance: null };

  const { index, mapping } = header;
  const transactions = [];
  let openingBalance = null;
  let closingBalance = null;

  for (let i = index + 1; i < rows.length; i += 1) {
    const cells = rows[i] || [];
    if (!cells.some((cell) => String(cell ?? "").trim() !== "")) continue;

    const cellText = (key) =>
      mapping[key] >= 0 ? String(cells[mapping[key]] ?? "").trim() : "";
    const description = cellText("description");

    // Repeated header rows and summary rows are not transactions.
    if (/^date$/i.test(cellText("date")) || /^description$/i.test(description)) continue;
    if (BALANCE_MARKER_RE.test(description) || SUMMARY_ROW_RE.test(description)) {
      const valueToken = parseMoneyToken(cellText("balance")) || parseMoneyToken(cellText("amount"));
      if (valueToken) {
        const value = signedAmount(valueToken);
        if (CLOSING_BALANCE_RE.test(description)) closingBalance = value;
        else if (OPENING_BALANCE_RE.test(description)) openingBalance = value;
      }
      continue;
    }

    const date = normalizeDate(cellText("date"));
    if (!date) continue;

    const feeToken = parseMoneyToken(cellText("fee"));
    const fee = feeToken ? round2(Math.abs(signedAmount(feeToken))) : 0;
    const debit = parseMoneyToken(cellText("debit"));
    const credit = parseMoneyToken(cellText("credit"));

    let amount = null;
    if (debit || credit || fee) {
      amount = round2(
        (credit ? Math.abs(signedAmount(credit)) : 0) -
        (debit ? Math.abs(signedAmount(debit)) : 0) -
        fee
      );
    } else {
      const token = parseMoneyToken(cellText("amount"));
      if (token) amount = round2(signedAmount(token));
    }
    if (amount == null || amount === 0) continue;

    const balanceToken = parseMoneyToken(cellText("balance"));

    transactions.push({
      date,
      description: description || "Transaction",
      amount,
      fee,
      reference: cellText("reference"),
      balance: balanceToken ? signedAmount(balanceToken) : null,
    });
  }

  return { transactions, opening_balance: openingBalance, closing_balance: closingBalance };
}

/** Headerless tables: each row that starts with a date is read like a text row. */
function parseLooseRows(rows) {
  const transactions = [];
  for (const cells of rows) {
    const line = (cells || [])
      .map((cell) => String(cell ?? "").trim())
      .filter(Boolean)
      .join(" ");
    if (!line) continue;
    transactions.push(...parseStatementText(line));
  }
  return transactions;
}

const COLUMN_PATTERNS = {
  balance: [/^(running\s+)?balance$/, /balance/, /balans/],
  date: [/^(transaction|posting|value|entry|effective|txn)\s*date$/, /date/, /datum/],
  fee: [/^fees?\b/, /^bank\s+charges?/, /^charges?/],
  debit: [/debit|withdraw|money out|paid out|^dr$/, /debet/],
  credit: [/credit|deposit|money in|paid in|^cr$/, /krediet|deposito/],
  amount: [/^(transaction\s*)?amount$/, /^amount\b/, /^value$/, /^bedrag$/],
  description: [
    /^(description|narrative|details|particulars?|memo|payee)$/,
    /desc|narrative|details|particular|memo|payee|beskrywing/,
  ],
  reference: [/^(reference|ref|cheque)/, /reference|^ref$/],
};

function mapColumns(cells) {
  const normalized = (cells || []).map((cell) =>
    String(cell ?? "").toLowerCase().replace(/\s+/g, " ").trim()
  );
  const taken = new Set();
  const pick = (patterns) => {
    for (const pattern of patterns) {
      const index = normalized.findIndex(
        (cell, i) => cell && !taken.has(i) && pattern.test(cell)
      );
      if (index >= 0) {
        taken.add(index);
        return index;
      }
    }
    return -1;
  };

  return {
    balance: pick(COLUMN_PATTERNS.balance),
    date: pick(COLUMN_PATTERNS.date),
    fee: pick(COLUMN_PATTERNS.fee),
    debit: pick(COLUMN_PATTERNS.debit),
    credit: pick(COLUMN_PATTERNS.credit),
    amount: pick(COLUMN_PATTERNS.amount),
    description: pick(COLUMN_PATTERNS.description),
    reference: pick(COLUMN_PATTERNS.reference),
  };
}

function findHeaderRow(rows) {
  const limit = Math.min(rows.length, 25);
  for (let i = 0; i < limit; i += 1) {
    const mapping = mapColumns(rows[i]);
    const hasAmount = mapping.debit >= 0 || mapping.credit >= 0 || mapping.amount >= 0;
    if (mapping.date >= 0 && hasAmount) return { index: i, mapping };
  }
  return null;
}

// ─── CSV file handling ───

function detectDelimiter(text) {
  const sample = String(text || "").split(/\r?\n/).slice(0, 20).join("\n");
  const counts = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;
  for (const character of sample) {
    if (character === '"') inQuotes = !inQuotes;
    else if (!inQuotes && character in counts) counts[character] += 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCsvRows(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (inQuotes) {
      if (character === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"') {
      inQuotes = true;
    } else if (character === delimiter) {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (character !== "\r") {
      cell += character;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function parseCsvText(text, fileName) {
  const rows = parseCsvRows(text);
  let parsed = parseTableDocument(rows);
  if (parsed.transactions.length === 0) {
    parsed = { transactions: parseLooseRows(rows), opening_balance: null, closing_balance: null };
  }
  return {
    ...parsed,
    bank_name: detectBankName(fileName),
    account_number: detectAccountNumber(text),
  };
}

// ─── Excel file handling ───

async function parseExcel(file) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const result = {
    transactions: [],
    opening_balance: null,
    closing_balance: null,
    bank_name: detectBankName(file.name),
    account_number: "",
  };

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      blankrows: false,
      defval: "",
    });
    if (!rows.length) continue;

    let parsed = parseTableDocument(rows);
    if (parsed.transactions.length === 0) {
      parsed = { transactions: parseLooseRows(rows), opening_balance: null, closing_balance: null };
    }
    // Statements live on one sheet; keep the one that actually holds transactions.
    if (parsed.transactions.length > result.transactions.length) {
      result.transactions = parsed.transactions;
      result.opening_balance = parsed.opening_balance;
      result.closing_balance = parsed.closing_balance;
    }
  }

  return result;
}

/**
 * Statement totals for the summary card. Figures the statement prints win; the
 * rest is calculated from the imported rows.
 * @param {Array<object>} transactions
 * @param {object} [overrides] opening_balance, closing_balance, total_credit,
 *   total_debit, total_fees taken from the statement or a previous import
 */
export function buildStatementSummary(transactions = [], overrides = {}) {
  const rows = transactions || [];
  const totalCredit = overrides.total_credit ??
    round2(rows.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0));
  const totalFees = overrides.total_fees ??
    round2(rows.reduce((sum, t) => sum + (t.fee || 0), 0));
  const totalDebit = overrides.total_debit ??
    round2(rows.filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount) - (t.fee || 0), 0));

  const net = round2(totalCredit - totalDebit - totalFees);
  const firstBalance = rows.find((t) => t.balance != null);
  const lastBalance = [...rows].reverse().find((t) => t.balance != null);

  const closing = overrides.closing_balance ??
    (lastBalance ? lastBalance.balance : round2((overrides.opening_balance ?? 0) + net));
  const opening = overrides.opening_balance ??
    (firstBalance ? round2(firstBalance.balance - firstBalance.amount) : round2(closing - net));

  return {
    transaction_count: rows.length,
    opening_balance: opening,
    closing_balance: closing,
    total_credit: totalCredit,
    total_debit: totalDebit,
    total_fees: totalFees,
  };
}

// ─── Public API ───

/**
 * Extract transactions from a bank statement file.
 * @param {File} file
 * @param {object} [options]
 * @param {string} [options.password] — password of a password-protected statement
 * @returns {Promise<{ transactions: array, summary: object, bank_name: string, account_number: string }>}
 */
export async function extractBankTransactions(file, { password } = {}) {
  const extension = (file.name.split(".").pop() || "").toLowerCase();

  if (extension === "csv" || extension === "tsv" || extension === "txt") {
    return withSummary(parseCsvText(await file.text(), file.name));
  }

  if (extension === "xlsx" || extension === "xls") {
    return withSummary(await parseExcel(file));
  }

  const text = await extractTextFromFile(file, { password });
  if (text.replace(/\s/g, "").length < 10) {
    const error = new Error(
      "We couldn't read any text from this document. Try the original PDF, a CSV or Excel export, or a sharper scan."
    );
    error.code = "UNREADABLE_DOCUMENT";
    throw error;
  }

  return withSummary({
    ...parseStatementDocument(text),
    bank_name: detectBankName(file.name),
    account_number: detectAccountNumber(text),
  });
}

/** Attaches the statement summary the transactions page shows. */
function withSummary(parsed) {
  return {
    ...parsed,
    summary: buildStatementSummary(parsed.transactions, {
      opening_balance: parsed.opening_balance,
      closing_balance: parsed.closing_balance,
      total_credit: parsed.total_credit,
      total_debit: parsed.total_debit,
      total_fees: parsed.total_fees,
    }),
  };
}

// ─── Helpers ───

function detectBankName(filename) {
  const lower = String(filename || "").toLowerCase();
  if (lower.includes("fnb") || lower.includes("first national")) return "FNB";
  if (lower.includes("absa")) return "ABSA";
  if (lower.includes("nedbank")) return "Nedbank";
  if (lower.includes("standard") || lower.includes("stdbank")) return "Standard Bank";
  if (lower.includes("capitec")) return "Capitec";
  if (lower.includes("discovery")) return "Discovery Bank";
  if (lower.includes("investec")) return "Investec";
  if (lower.includes("gotyme") || lower.includes("go tyme")) return "GoTyme Bank";
  if (lower.includes("tymebank") || lower.includes("tyme")) return "TymeBank";
  if (lower.includes("african bank")) return "African Bank";
  return "";
}

function detectAccountNumber(text) {
  const match = String(text || "").match(/account\s*(?:no\.?|number|#)?[:\s]*(\d{6,20})/i);
  return match ? match[1] : "";
}
