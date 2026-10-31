/**
 * Client-side document extraction without AI.
 * - Images: Tesseract.js OCR
 * - PDFs: pdfjs-dist text extraction (layout aware), OCR fallback for scans
 * - Parses extracted text with regex for common SA receipt/invoice fields
 * - Categorizes documents based on keyword detection
 */

import { normalizeDate, parseMoneyToken, round2, stripDateTokens, tidyText } from "./amountParsing";

/** Extraction error codes for documents that need a password to be opened. */
export const PASSWORD_REQUIRED = "PASSWORD_REQUIRED";
export const PASSWORD_INVALID = "PASSWORD_INVALID";
/** Extraction error code for a document no text could be read from. */
export const UNREADABLE_DOCUMENT = "UNREADABLE_DOCUMENT";

/** True when the error means "give me the document password" or "that one was wrong". */
export const isPasswordError = (error) =>
  error?.code === PASSWORD_REQUIRED || error?.code === PASSWORD_INVALID;

const UNREADABLE_MESSAGE =
  "We couldn't read any text from this document. Try a sharper photo, the original PDF, or a different file.";

function ensureReadable(text) {
  const value = String(text || "").trim();
  if (value.replace(/\s/g, "").length === 0) {
    const error = new Error(UNREADABLE_MESSAGE);
    error.code = UNREADABLE_DOCUMENT;
    throw error;
  }
  return value;
}

/**
 * Extract raw text from a file.
 * @param {File} file
 * @param {object} [options]
 * @param {string} [options.password] — password of a password-protected PDF
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(file, { password } = {}) {
  const ext = file.name.split(".").pop().toLowerCase();
  let text;

  if (ext === "pdf") {
    text = await extractTextFromPdf(file, password);
  } else if (["jpg", "jpeg", "png", "webp", "bmp", "gif", "tiff"].includes(ext)) {
    text = await extractTextFromImage(file);
  } else if (["txt", "csv"].includes(ext)) {
    text = await file.text();
  } else {
    // Fallback: try as image
    text = await extractTextFromImage(file);
  }

  return ensureReadable(text);
}

/**
 * Rebuild text lines from pdfjs items by grouping them on their vertical
 * position and ordering each line left to right. Statements print each column
 * as its own item, so a naive item-by-item join mixes columns together.
 */
function textContentToLines(textContent, tolerance = 2.5) {
  const items = (textContent?.items || [])
    .filter((item) => typeof item?.str === "string" && item.str.trim() && item.transform)
    .map((item) => ({ text: item.str, x: item.transform[4], y: item.transform[5] }));

  const lines = [];
  for (const item of items) {
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) =>
      line.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}

async function extractTextFromPdf(file, password) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;

  const pdf = await openPdf(pdfjsLib, arrayBuffer, password);
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContentToLines(textContent) + "\n";
  }

  // If very little text was found, the PDF is likely scanned — fall back to OCR
  if (fullText.trim().length < 20) {
    fullText = await ocrPdf(file, pdfjsLib, password);
  }

  return fullText.trim();
}

/**
 * Open a PDF, translating pdfjs password failures into actionable errors.
 * @returns {Promise<object>} the loaded pdf document
 */
async function openPdf(pdfjsLib, data, password) {
  try {
    return await pdfjsLib.getDocument({ data, password: password || undefined }).promise;
  } catch (error) {
    if (error?.name !== "PasswordException") throw error;

    // pdfjs uses code 1 for "no password given" and 2 for "incorrect password".
    const invalid = error.code === 2 || /incorrect/i.test(error.message || "");
    const message = invalid
      ? "That password did not unlock this document. Please check it and try again."
      : "This document is password protected. Enter its password to continue.";
    const err = new Error(message);
    err.code = invalid ? PASSWORD_INVALID : PASSWORD_REQUIRED;
    throw err;
  }
}

async function ocrPdf(file, pdfjsLib, password) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await openPdf(pdfjsLib, arrayBuffer, password);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  let fullText = "";
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      const { data: { text } } = await worker.recognize(canvas);
      fullText += text + "\n";
    }
  } finally {
    await worker.terminate();
  }
  return fullText.trim();
}

async function extractTextFromImage(file) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const { data: { text } } = await worker.recognize(file);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

// ─── Receipt / invoice field parsing ───

/** Lines that describe the document summary rather than a sold item. */
const NON_ITEM_RE =
  /^(?:sub\s*-?\s*total|subtotal|total|totals|grand\s+total|amount\s+due|balance(?:\s+due)?|change|cash|tendered?|rounding|round\s+off|discount|deposit|payment|vat|tax|invoice|receipt|date|time|cashier|server|till|slip|thanks?|thank\s+you|welcome|tel|phone|fax|email|address|registration|reg|customer|table|order|qty|quantity|price|unit|description|item)\b/i;

/** Words that mark a line as a summary/payment line wherever they appear. */
const NON_ITEM_CONTAINS_RE =
  /\b(vat|tax\s+invoice|sub\s*-?\s*total|subtotal|total|amount\s+due|balance|change|tendered|cash|card|rounding|discount|savings|points)\b/i;

/** A token counts as money only when it was written as money (decimals, R, CR/DR). */
const isAmountToken = (token) => {
  if (!parseMoneyToken(token)) return false;
  return /[.,]|^R|^\(|[-+]$|(CR|DR)$/i.test(token);
};

/** The right-most money value on a line, or null. */
function lastAmount(line, { allowWhole = true } = {}) {
  const tokens = stripDateTokens(line).split(" ").filter(Boolean);
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const money = parseMoneyToken(tokens[i], { allowWhole });
    if (money) return money;
  }
  return null;
}

function findSupplierName(lines) {
  for (const line of lines.slice(0, 10)) {
    if (/^[\d\sR.,\-/]+$/.test(line)) continue;
    if (/^(mon|tue|wed|thu|fri|sat|sun)/i.test(line)) continue;
    if (/^(tax\s+invoice|invoice|receipt|tax|vat|statement|quotation|credit\s+note|slip|pro\s+forma)\b/i.test(line)) continue;
    if (line.length < 3) continue;
    return line;
  }
  return null;
}

function findVatNumber(text) {
  const match = String(text).match(/\bVAT\s*(?:reg(?:istration)?\s*(?:no\.?|number|#)?|no\.?|number|#)?\s*[:#]?\s*(\d{10})\b/i);
  return match ? match[1] : null;
}

function findDocumentDate(text) {
  const patterns = [
    /(\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2})/,
    /(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/,
    /(\d{1,2}[\s\-][A-Za-z]{3,9}\.?[\s\-,'’]*\d{2,4})/,
    /([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{2,4})/,
  ];
  for (const pattern of patterns) {
    const match = String(text).match(pattern);
    if (match) return normalizeDate(match[1]) || tidyText(match[1]);
  }
  return null;
}

function findDocumentNumber(lines) {
  const labeled =
    /(?:tax\s+invoice|invoice|receipt|document|doc|slip|order|tax)\s*(?:no\.?|number|#|nr\.?|num)?\s*[:#]?\s*([A-Z0-9][A-Z0-9/\-]{1,24})/gi;
  for (const line of lines) {
    for (const match of line.matchAll(labeled)) {
      const value = match[1].replace(/[.\s]+$/, "");
      if (/\d/.test(value)) return value;
    }
  }
  return null;
}

/** Subtotal, VAT and total, taken from the labelled summary lines of the document. */
function findTotals(lines) {
  let total = null;
  let subtotal = null;
  let vat_amount = null;

  for (const line of lines) {
    const label = tidyText(line.toLowerCase());
    const money = lastAmount(line);
    if (!money) continue;

    if (/sub\s*-?\s*total|total\s*(?:excl|excluding)|excl(?:uding)?\s*vat|net\s*total|amount\s*excl/.test(label)) {
      subtotal = money.value;
      continue;
    }
    // "VAT No 4123456789" is not an amount — lastAmount already ignores the number.
    const isVatLine = /^vat\b/.test(label) && !/^vat\s*(?:no|number|nr|reg|registration)\b/.test(label);
    if (isVatLine || /\bvat\s*(?:amount|amt)\b/.test(label)) {
      vat_amount = money.value;
      continue;
    }
    if (/grand\s*total|total\s*due|amount\s*due|total\s*payable|balance\s*due|total\s*(?:incl|including)|^total\b/.test(label)) {
      total = money.value;
    }
  }

  if (total == null && subtotal != null && vat_amount != null) total = round2(subtotal + vat_amount);
  if (vat_amount == null && total != null && subtotal != null) vat_amount = round2(total - subtotal);
  if (subtotal == null && total != null && vat_amount != null) subtotal = round2(total - vat_amount);
  if (vat_amount != null && vat_amount <= 0) vat_amount = null;

  return { subtotal, vat_amount, total };
}

/** Every priced line on the document, in source order. */
function findLineItems(lines) {
  const items = [];
  const seen = new Set();

  for (const line of lines) {
    const money = lastAmount(line, { allowWhole: false });
    if (!money || money.value <= 0) continue;

    const description = tidyText(
      stripDateTokens(line)
        .split(" ")
        .filter((token) => token && !isAmountToken(token))
        .join(" ")
    );

    if (!/[A-Za-z]{2}/.test(description)) continue;
    if (NON_ITEM_RE.test(description) || NON_ITEM_CONTAINS_RE.test(description)) continue;

    const key = `${description.toLowerCase()}|${money.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ description, amount: money.value });
  }

  return items;
}

/**
 * Parse structured data from extracted text.
 * @param {string} text - raw text from OCR or PDF extraction
 * @param {string} type - "receipt" | "invoice" | fallback hint
 * @returns {object} { supplier_name, vat_number, date, document_number, line_items, subtotal, vat_amount, total, category }
 */
export function parseDocumentData(text, type) {
  const source = String(text || "");
  const lines = source
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const totals = findTotals(lines);

  return {
    supplier_name: findSupplierName(lines),
    vat_number: findVatNumber(source),
    date: findDocumentDate(source),
    document_number: findDocumentNumber(lines),
    line_items: findLineItems(lines),
    subtotal: totals.subtotal,
    vat_amount: totals.vat_amount,
    total: totals.total,
    category: categorizeDocument(source, type),
  };
}

/**
 * Categorize a document based on keywords in its text.
 * @param {string} text
 * @param {string} fallbackType
 * @returns {string} "receipt" | "invoice" | "bank_statement" | "tax_document" | fallback
 */
export function categorizeDocument(text, fallbackType) {
  const lower = text.toLowerCase();
  if (/\binvoice\b/.test(lower)) return "invoice";
  if (/\breceipt\b|\bslip\b/.test(lower)) return "receipt";
  if (/\bbank\s*statement\b|\baccount\s*statement\b|\bstatement\b/.test(lower)) return "bank_statement";
  if (/\btax\b|\bvat\s*return\b|\birs\b/.test(lower)) return "tax_document";
  return fallbackType || "document";
}
