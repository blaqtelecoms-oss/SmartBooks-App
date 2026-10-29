import React from "react";
import { CheckCircle2 } from "lucide-react";

export default function AllocationProgress({ allocated, total, pct, loading }) {
  if (loading) {
    return <div className="sb-card h-[200px] animate-pulse" />;
  }

  const toReview = Math.max(total - allocated, 0);
  const size = 132;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(Math.max(pct, 0), 100) / 100) * circumference;

  return (
    <div className="sb-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="sb-display" style={{ fontSize: 28, lineHeight: 1.1, color: "var(--sb-ink)" }}>
          Allocation progress
        </h3>
        <span className="sb-chip sb-chip-green">
          <CheckCircle2 size={12} strokeWidth={2} /> On track
        </span>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-none" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sb-border)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--sb-brand-2)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          <text
            x="50%"
            y="50%"
            dominantBaseline="central"
            textAnchor="middle"
            className="sb-display sb-money"
            style={{ fontSize: 30, fill: "var(--sb-ink)" }}
          >
            {pct}%
          </text>
        </svg>

        <ul className="min-w-0 space-y-2 text-[13px]">
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 flex-none rounded-full" style={{ background: "var(--sb-brand-2)" }} />
            <span style={{ color: "var(--sb-ink)" }}><b>{allocated}</b> allocated</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 flex-none rounded-full" style={{ background: "var(--sb-border)" }} />
            <span style={{ color: "var(--sb-muted)" }}><b style={{ color: "var(--sb-ink)" }}>{toReview}</b> to review</span>
          </li>
          <li className="pl-4 text-[12px]" style={{ color: "var(--sb-muted)" }}>of {total} transactions</li>
        </ul>
      </div>
    </div>
  );
}
