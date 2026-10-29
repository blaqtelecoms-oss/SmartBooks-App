import React, { useState, useRef } from "react";
import { formatRand, formatPct } from "@/lib/money";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const tickLabel = (v) => {
  if (v >= 1000) {
    const k = v / 1000;
    return `R${k.toLocaleString("en-ZA", { maximumFractionDigits: 1 })}k`;
  }
  return `R${Math.round(v)}`;
};

export default function CashFlowChart({ data, total, max, pct = 0, loading }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  const W = 760, H = 300, L = 52, B = 34, T = 16;
  const ph = H - B - T;
  const ymax = Math.max(max, 1000);
  const niceMax = Math.ceil(ymax / 1000) * 1000;
  const step = (W - L) / 12;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((r) => niceMax * r);

  const now = new Date();
  const currentMonth = now.getMonth();
  const peakValue = Math.max(...data.map((d) => d.income), 0);
  const peakIndex = data.findIndex((d) => d.income === peakValue && peakValue > 0);

  const handleMove = (e, i) => {
    const container = containerRef.current;
    if (!container) return;
    const r = container.getBoundingClientRect();
    setTooltip({
      i,
      x: Math.min(Math.max(e.clientX - r.left - 70, 8), r.width - 150),
      y: Math.max(e.clientY - r.top - 78, 8),
    });
  };

  if (loading) {
    return (
      <div className="sb-card">
        <div className="h-[300px] animate-pulse rounded-[18px]" style={{ background: "var(--sb-soft)" }} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="sb-card relative">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="sb-label">Cash flow · last 12 months</p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="sb-display sb-money" style={{ fontSize: 40, lineHeight: 1, color: "var(--sb-ink)" }}>
              {formatRand(total)}
            </span>
            <span className="sb-chip sb-chip-green">{formatPct(pct)}</span>
          </div>
        </div>
        <div className="relative">
          <select
            defaultValue="this-year"
            aria-label="Cash flow period"
            className="appearance-none rounded-full px-4 py-2 pr-9 text-[12px] font-semibold outline-none"
            style={{ background: "var(--sb-card)", border: "1px solid var(--sb-border)", color: "var(--sb-ink)" }}
          >
            <option value="this-year">This Year</option>
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: "var(--sb-muted)" }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex justify-end gap-4 text-[12px]" style={{ color: "var(--sb-muted)" }}>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--sb-brand)" }} />
          Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-sm" style={{ background: "#D5E0D8" }} />
          Expense
        </span>
      </div>

      {/* SVG chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block w-full" onMouseLeave={() => setTooltip(null)}>
        {ticks.map((v, i) => {
          const y = T + ph - (v / niceMax) * ph;
          return (
            <g key={i}>
              <line x1={L} y1={y} x2={W} y2={y} stroke="#E3E9E4" strokeWidth="1" strokeDasharray="4 5" />
              <text x="0" y={y + 4} fontSize="11" fill="#5B6B64">{tickLabel(v)}</text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x = L + i * step + step / 2;
          const w = 20;
          const hExpense = (d.expense / niceMax) * ph;
          const hIncome = (d.income / niceMax) * ph;
          const isPeak = i === peakIndex;
          const isCurrent = i === currentMonth;
          const incomeFill = isPeak ? "#0F5132" : isCurrent ? "#C8F169" : "#D5E0D8";
          return (
            <g key={i} onMouseMove={(e) => handleMove(e, i)} style={{ cursor: "default" }}>
              <rect x={x - step / 2} y={T} width={step} height={ph} fill="transparent" />
              {/* expense stub */}
              <rect x={x - w / 2} y={T + ph - hExpense} width={w} height={Math.max(hExpense, 2)} rx="6" fill="#EDF1ED" />
              {/* income bar */}
              <rect x={x - w / 2} y={T + ph - hIncome} width={w} height={Math.max(hIncome, 2)} rx="6" fill={incomeFill} />
              <text x={x} y={H - 10} fontSize="11" fill="#5B6B64" textAnchor="middle">{MONTHS[i]}</text>
            </g>
          );
        })}

        {/* peak callout */}
        {peakIndex >= 0 && (
          <g>
            <rect
              x={L + peakIndex * step + step / 2 - 26}
              y={T + ph - (peakValue / niceMax) * ph - 30}
              width="52"
              height="20"
              rx="10"
              fill="#0B1F1A"
            />
            <text
              x={L + peakIndex * step + step / 2}
              y={T + ph - (peakValue / niceMax) * ph - 16}
              fontSize="10"
              fill="#FFFFFF"
              textAnchor="middle"
              fontWeight="700"
            >
              {MONTHS[peakIndex]}
            </text>
          </g>
        )}
      </svg>

      {tooltip && data[tooltip.i] && (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-[12px] px-3 py-2 text-[12px]"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            background: "var(--sb-card)",
            border: "1px solid var(--sb-border)",
            boxShadow: "0 8px 24px -12px rgba(11,31,26,0.25)",
            color: "var(--sb-ink)",
          }}
        >
          <b className="mb-1 block text-[13px]">{MONTHS[tooltip.i]} {now.getFullYear()}</b>
          <span style={{ color: "var(--sb-muted)" }} className="mr-2">Income</span>{formatRand(data[tooltip.i].income)}
          <br />
          <span style={{ color: "var(--sb-muted)" }} className="mr-2">Expense</span>{formatRand(data[tooltip.i].expense)}
        </div>
      )}
    </div>
  );
}
