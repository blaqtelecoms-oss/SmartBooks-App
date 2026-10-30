/**
 * Client-side document extraction without AI.
 * - Images: Tesseract.js OCR
 * - PDFs: pdfjs-dist text extraction
 * - Parses extracted text with regex for common SA receipt/invoice fields
 * - Categorizes documents based on keyword detection
 */

const AMOUNT_RE = /R?\s*([\d][\d,]*\.?\d{0,2})/;

/** Extraction error codes for documents that need a password to be opened. */
export const PASSWORD_REQUIRED = "PASSWORD_REQUIRED";
export const PASSWORD_INVALID = "PASSWORD_INVALID";

/** True when the error means "give me the document password" or "that one was wrong". */
export const isPasswordError = (error) =>
  error?.code === PASSWORD_REQUIRED || error?.code === PASSWORD_INVALID;

const parseAmount = (str) => {
  if (!str) return null;
  const cleaned = str.replace(/[R\s]/g, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
};

/**
 * Extract raw text from a file.
 * @param {File} file
 * @param {object} [options]
 * @param {string} [options.password] — password of a password-protected PDF
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(file, { password } = {}) {
  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "pdf") {
    return extractTextFromPdf(file, password);
  }
  if (["jpg", "jpeg", "png", "webp", "bmp", "gif", "tiff"].includes(ext)) {
    return extractTextFromImage(file);
  }
  if (["txt", "csv"].includes(ext)) {
    return file.text();
  }
  // Fallback: try as image
  return extractTextFromImage(file);
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
    // Reconstruct lines using hasEOL (pdfjs v4+) or Y-position grouping
    let pageText = "";
    for (const item of textContent.items) {
      if (item.str !== undefined) {
        pageText += item.str;
        if (item.hasEOL) pageText += "\n";
        else pageText += " ";
      }
    }
    fullText += pageText + "\n";
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

/**
 * Parse structured data from extracted text.
 * @param {string} text - raw text from OCR or PDF extraction
 * @param {string} type - "receipt" | "invoice" | fallback hint
 * @returns {object} { supplier_name, vat_number, date, document_number, line_items, subtotal, vat_amount, total, category }
 */
export function parseDocumentData(text, type) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  // --- Supplier name: first meaningful line (not a date/number-only line)
  let supplier_name = null;
  for (const line of lines.slice(0, 10)) {
    if (/^[\d\sR.,-]+$/.test(line)) continue;
    if (/^(mon|tue|wed|thu|fri|sat|sun)/i.test(line)) continue;
    if (line.length < 3) continue;
    supplier_name = line;
    break;
  }

  // --- VAT number (10 digits, SA format)
  let vat_number = null;
  const vatMatch = text.match(/VAT\s*(?:No\.?|Number|#)?[:\s]*(\d{10})/i);
  if (vatMatch) vat_number = vatMatch[1];

  // --- Date (try multiple SA formats)
  let date = null;
  const datePatterns = [
    /(\d{1,2}[\s\/-]\d{1,2}[\s\/-]\d{2,4})/,
    /(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i,
    /(\d{4}-\d{2}-\d{2})/,
  ];
  for (const p of datePatterns) {
    const m = text.match(p);
    if (m) { date = m[1]; break; }
  }

  // --- Document number
  let document_number = null;
  const docNoMatch = text.match(/(?:Invoice|Receipt|Doc|Tax)\s*(?:No\.?|Number|#)?[:\s]*([A-Z0-9-]{3,20})/i);
  if (docNoMatch) document_number = docNoMatch[1];

  // --- Total
  let total = null;
  const totalMatch = text.match(/Total[:\s]*R?\s*([\d,\s]+\.?\d{0,2})/i);
  if (totalMatch) total = parseAmount(totalMatch[1]);

  // --- Subtotal
  let subtotal = null;
  const subMatch = text.match(/Sub\s*-?\s*Total[:\s]*R?\s*([\d,\s]+\.?\d{0,2})/i);
  if (subMatch) subtotal = parseAmount(subMatch[1]);

  // --- VAT amount
  let vat_amount = null;
  const vatAmtMatch = text.match(/VAT(?:\s*Amount)?(?:\s*\(?\s*15\s*%\s*\)?)?[:\s]*R?\s*([\d,\s]+\.?\d{0,2})/i);
  if (vatAmtMatch) vat_amount = parseAmount(vatAmtMatch[1]);

  // --- Derive missing values
  if (subtotal != null && vat_amount != null && total == null) {
    total = +(subtotal + vat_amount).toFixed(2);
  }
  if (total != null && vat_amount == null && subtotal != null) {
    vat_amount = +(total - subtotal).toFixed(2);
  }
  if (total != null && subtotal == null && vat_amount != null) {
    subtotal = +(total - vat_amount).toFixed(2);
  }
  // If we only have total, estimate VAT (15%)
  if (total != null && vat_amount == null && subtotal == null) {
    subtotal = +(total / 1.15).toFixed(2);
    vat_amount = +(total - subtotal).toFixed(2);
  }

  // --- Line items: lines with a description followed by an amount
  const line_items = [];
  for (const line of lines) {
    const m = line.match(/^(.+?)\s+R?\s*([\d,]+\.\d{2})$/);
    if (m && !/total|subtotal|vat|balance|change|cash/i.test(m[1]) && m[1].length > 2) {
      const amount = parseAmount(m[2]);
      if (amount != null && amount > 0) {
        line_items.push({ description: m[1].trim(), amount });
      }
    }
  }

  // --- Categorize
  const category = categorizeDocument(text, type);

  return {
    supplier_name,
    vat_number,
    date,
    document_number,
    line_items,
    subtotal,
    vat_amount,
    total,
    category,
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
