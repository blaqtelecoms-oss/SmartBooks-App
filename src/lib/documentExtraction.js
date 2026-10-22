/**
 * Client-side document extraction without AI.
 * - Images: Tesseract.js OCR
 * - PDFs: pdfjs-dist text extraction
 * - Parses extracted text with regex for common SA receipt/invoice fields
 * - Categorizes documents based on keyword detection
 */

const AMOUNT_RE = /R?\s*([\d][\d,]*\.?\d{0,2})/;

const parseAmount = (str) => {
  if (!str) return null;
  const cleaned = str.replace(/[R\s]/g, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
};

/**
 * Extract raw text from a file.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "pdf") {
    return extractTextFromPdf(file);
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

async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist");
  // Use the bundled worker via Vite's ?url import
  pdfjsLib.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
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
