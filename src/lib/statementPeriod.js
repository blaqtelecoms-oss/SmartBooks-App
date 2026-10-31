/**
 * Reads the period a statement says it covers — "Statement period: 01 April
 * 2026 to 31 August 2026" — so an import only picks up the rows that belong to
 * that period. Nothing is inferred from the transaction rows themselves.
 */

import { normalizeDate } from "./amountParsing";

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

const MONTH_YEAR_SOURCE = "[A-Za-z]{3,9}\\.?\\s+\\d{4}";

// A day-qualified date as statements print it: 2026/04/01, 01/04/2026,
// 01 Apr 2026, April 1, 2026.
const DAY_DATE_SOURCE = [
  "\\d{4}[\\/.]\\d{1,2}[\\/.]\\d{1,2}",
  "\\d{1,2}[\\/.]\\d{1,2}[\\/.]\\d{2,4}",
  "\\d{1,2}[\\s\\-][A-Za-z]{3,9}\\.?[\\s\\-,'’]*\\d{2,4}",
  "[A-Za-z]{3,9}\\.?\\s+\\d{1,2},?\\s+\\d{2,4}",
].join("|");

const DATE_SOURCE = [DAY_DATE_SOURCE, MONTH_YEAR_SOURCE].join("|");

const RANGE_RE = new RegExp(
  `(${DATE_SOURCE})\\s*(?:to|until|till|through|thru|[-–—]|\\.\\.)\\s*(${DATE_SOURCE})`,
  "i"
);
const DAY_DATE_RE = new RegExp(DAY_DATE_SOURCE, "i");
// Anchored month-year with the month and the year as separate groups.
const MONTH_YEAR_RE = new RegExp(`^(${MONTH_YEAR_SOURCE})$`, "i");
const MONTH_YEAR_TOKEN_RE = new RegExp(MONTH_YEAR_SOURCE, "i");
const MONTH_NAME_RE = /^([A-Za-z]{3,9})\.?\s+(\d{4})$/;

// Lines that announce the period, strongest first. The loose set ("from … to …")
// only runs when no line labels itself as a period.
const STRICT_LABEL_RE = /\b(period|covering|for\s+the\s+(?:month|period))\b/i;
const LOOSE_LABEL_RE = /\b(from|between|to)\b/i;

const pad = (value) => String(value).padStart(2, "0");

/** One end of a period as YYYY-MM-DD; a month-only end covers that whole month. */
function boundary(raw, edge) {
  const text = String(raw || "").trim();
  const monthYear = text.match(MONTH_YEAR_RE) && text.match(MONTH_NAME_RE);
  if (monthYear) {
    const month = MONTHS[monthYear[1].toLowerCase().slice(0, 3)];
    const year = Number(monthYear[2]);
    if (!month || !year) return "";
    const day = edge === "start" ? 1 : new Date(year, month, 0).getDate();
    return `${year}-${pad(month)}-${pad(day)}`;
  }
  return normalizeDate(text);
}

function ordered(start, end) {
  if (!start || !end) return null;
  return start <= end ? { start, end } : { start: end, end: start };
}

function periodFromLine(line) {
  const range = line.match(RANGE_RE);
  if (range) {
    const period = ordered(boundary(range[1], "start"), boundary(range[2], "end"));
    if (period) return period;
  }

  // "Statement period: April 2026" — a whole month. A line that prints a day
  // ("Statement date: 05 September 2026") is not a period.
  if (DAY_DATE_RE.test(line)) return null;
  const monthYear = line.match(MONTH_YEAR_TOKEN_RE);
  if (monthYear) return ordered(boundary(monthYear[0], "start"), boundary(monthYear[0], "end"));
  return null;
}

/**
 * The period a statement prints for itself.
 * @param {string[]} lines — statement text lines, or header rows joined into lines
 * @returns {{ start: string, end: string } | null} inclusive YYYY-MM-DD bounds
 */
export function findStatementPeriod(lines = []) {
  const rows = (lines || [])
    .map((line) => String(line || "").replace(/[|¦]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const label of [STRICT_LABEL_RE, LOOSE_LABEL_RE]) {
    for (const row of rows) {
      if (!label.test(row)) continue;
      const period = periodFromLine(row);
      if (period) return period;
    }
  }
  return null;
}

/** True when a normalised YYYY-MM-DD date falls inside the statement's period. */
export const isInPeriod = (date, period) =>
  Boolean(date && period) && date >= period.start && date <= period.end;
