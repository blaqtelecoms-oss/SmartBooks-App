/**
 * South African money format: "R 12 702,00" — space thousands, comma decimals,
 * minus sign "−" for negatives.
 */
export const formatRand = (value) => {
  const n = Number(value) || 0;
  const abs = Math.abs(n).toFixed(2);
  const [int, dec] = abs.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${n < 0 ? "−" : ""}R ${grouped},${dec}`;
};

export const formatPct = (value, digits = 1) => {
  const n = Number(value) || 0;
  return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(digits)}%`;
};
