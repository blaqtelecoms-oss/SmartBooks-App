import React from "react";

/**
 * Small smooth sparkline built from real series values.
 */
const buildPath = (values, w = 100, h = 28) => {
  const vals = values.length ? values : [0, 0];
  const max = Math.max(...vals);
  const min = Math.min(...vals, 0);
  const span = max - min || 1;
  const pts = vals.map((v, i) => [
    vals.length === 1 ? w / 2 : (i / (vals.length - 1)) * w,
    h - ((v - min) / span) * (h - 2) - 1,
  ]);

  if (pts.length === 1) return `M ${pts[0][0]},${pts[0][1]}`;

  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
};

export default function Sparkline({ values = [], color = "#1B7A4D", height = 34 }) {
  const path = buildPath(values);
  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
      aria-hidden="true"
    >
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
