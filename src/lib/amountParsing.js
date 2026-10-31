/**
 * Shared money and date parsing helpers for the client-side document
 * extraction (bank statements and receipts/invoices).
 *
 * The helpers are deliberately strict: a token only counts as money when it
 * looks like an amount, so reference/account numbers, dates and quantities are
 * never mistaken for transactions.
 */

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/** Collapse whitespace and drop separator characters left over from PDF line joins. */
export const tidyText = (value) =>
  String(value || "")
    .replace(/[|¦]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-–—:;,.]+/, "")
    .replace(/[\s\-–—:;,.]+$/, "")
    .trim();

const DATE_TOKEN_RES = [
  /\b\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2}\b/g,
  /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/g,
  /\b\d{1,2}[\s\-][A-Za-z]{3,9}\.?[\s\-,'’]*\d{2,4}\b/g,
];

/** Remove every date-looking token, so its digits can't be read as money. */
export const stripDateTokens = (value) =>
  DATE_TOKEN_RES.reduce((acc, pattern) => acc.replace(pattern, " "), String(value || ""));

const LEADING_DATE_PATTERNS = [
  /^(\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2})\b/,
  /^(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})\b/,
  /^(\d{1,2}[\s\-][A-Za-z]{3,9}\.?[\s\-,'’]*\d{2,4})\b/,
  /^([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{2,4})\b/,
];

/**
 * Split a leading date off a text line (the first column of a statement row).
 * @returns {{ date: string, rest: string } | null}
 */
export function takeLeadingDate(line) {
  const text = String(line || "").trim();
  for (const pattern of LEADING_DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return { date: match[1], rest: text.slice(match[0].length).trim() };
  }
  return null;
}

function fullYear(value) {
  const digits = String(value);
  if (digits.length === 4) return digits;
  const number = Number(digits);
  return String(number >= 70 ? 1900 + number : 2000 + number);
}

function buildDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
  if (m < 1 || m > 12 || d < 1 || d > 31) return "";
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Normalise a date as it appears on a South African document to YYYY-MM-DD.
 * Returns "" when the value is not a recognised date.
 */
export function normalizeDate(input) {
  if (input == null) return "";
  const text = String(input).trim();
  if (!text) return "";

  let match = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (match) return buildDate(match[1], match[2], match[3]);

  match = text.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
  if (match) return buildDate(match[1], match[2], match[3]);

  match = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (match) return buildDate(fullYear(match[3]), match[2], match[1]);

  match = text.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,9})\.?[\s\-,'’]*(\d{2,4})$/);
  if (match) {
    const month = MONTHS[match[2].toLowerCase().slice(0, 3)];
    if (month) return buildDate(fullYear(match[3]), month, match[1]);
  }

  match = text.match(/^([A-Za-z]{3,9})\.?[\s\-]+(\d{1,2}),?[\s\-]+(\d{2,4})$/);
  if (match) {
    const month = MONTHS[match[1].toLowerCase().slice(0, 3)];
    if (month) return buildDate(fullYear(match[3]), month, match[2]);
  }

  return "";
}

/**
 * True for "03/09", "03.09.2026", "2026-09-03": tokens whose parts are valid
 * day/month/year numbers. "1,250.00" and "500.00" are money, not dates.
 */
function looksLikeDateFragment(token) {
  const match = token.match(/^(\d{1,4})[\/.\-:](\d{1,2})(?:[\/.\-:](\d{1,4}))?$/);
  if (!match) return false;
  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = match[3] == null ? null : Number(match[3]);
  if (first >= 1900 && first <= 2100 && second >= 1 && second <= 12) return true;
  if (third != null && third >= 1900 && third <= 2100) return true;
  return first >= 1 && first <= 31 && second >= 1 && second <= 12;
}

/**
 * Parse one whitespace-delimited token as a money amount.
 *
 * @param {string} token
 * @param {object} [options]
 * @param {boolean} [options.allowWhole] accept plain integers ("450") as money,
 *   not only values written with decimals or thousands separators. Column-based
 *   files use it; free text does not, so reference numbers stay out of the books.
 * @returns {{ value: number, negative: boolean, suffix: string } | null}
 */
export function parseMoneyToken(token, { allowWhole = true } = {}) {
  if (token == null) return null;
  const raw = String(token).trim();
  if (!raw || !/\d/.test(raw)) return null;

  // Dates, times and long reference/account numbers are never amounts.
  if (looksLikeDateFragment(raw)) return null;
  if (/^\d{8,}$/.test(raw)) return null;

  const explicit = /[.,]/.test(raw) || /^R/i.test(raw) || /^\(/.test(raw) || /[-+]$/.test(raw) || /(CR|DR)$/i.test(raw);
  if (!explicit && !allowWhole) return null;

  let text = raw;
  let negative = false;

  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }

  let suffix = "";
  const suffixMatch = text.match(/(CR|DR)$/i);
  if (suffixMatch) {
    suffix = suffixMatch[1].toUpperCase();
    text = text.slice(0, suffixMatch.index);
  }

  text = text.replace(/^R(?=[\d\s(])/i, "").replace(/[\s'’]/g, "");

  if (text.endsWith("-")) {
    negative = true;
    text = text.slice(0, -1);
  }
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1);
  }
  if (text.startsWith("+")) text = text.slice(1);

  let value = null;
  if (/^\d+(,\d{3})*(\.\d{1,2})?$/.test(text)) {
    value = Number(text.replace(/,/g, ""));
  } else if (/^\d+(\.\d{3})*,\d{1,2}$/.test(text)) {
    // Decimal comma ("1.250,00" / "1250,00")
    value = Number(text.replace(/\./g, "").replace(",", "."));
  }
  if (value == null || !Number.isFinite(value)) return null;

  return { value: round2(value), negative: negative || suffix === "DR", suffix };
}

/** Positive value of a parsed token, respecting brackets and a DR suffix. */
export const signedAmount = (token) =>
  token == null ? null : token.negative ? -token.value : token.value;
