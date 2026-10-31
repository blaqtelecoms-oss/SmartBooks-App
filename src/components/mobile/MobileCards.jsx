import React from "react";

/**
 * Phone-only record cards. Every ledger-style page renders one of these lists
 * below `md` and keeps its table for wider screens, so nothing has to be
 * scrolled sideways to be read.
 */
export function MobileList({ children }) {
  return <ul className="flex flex-col gap-3 md:hidden">{children}</ul>;
}

export function MobileCard({ children }) {
  return (
    <li className="sb-card w-full" style={{ padding: 14 }}>
      {children}
    </li>
  );
}

/** Label/value line that wraps instead of widening the card. */
export function MobileField({ label, value, tone }) {
  if (value == null || value === "") return null;
  return (
    <div className="mt-1.5 flex items-start justify-between gap-3">
      <span className="shrink-0 text-[11.5px]" style={{ color: "var(--sb-muted)" }}>{label}</span>
      <span
        className="min-w-0 flex-1 text-right text-[12.5px] font-semibold"
        style={{ color: tone || "var(--sb-ink)", overflowWrap: "anywhere" }}
      >
        {value}
      </span>
    </div>
  );
}

/** Two-column metric grid for aging buckets and paired figures. */
export function MobileMetricGrid({ children }) {
  return <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">{children}</div>;
}

export function MobileMetric({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--sb-muted)" }}>{label}</p>
      <p className="sb-money mt-0.5 text-[12.5px] font-semibold" style={{ color: tone || "var(--sb-ink)", overflowWrap: "anywhere" }}>
        {value}
      </p>
    </div>
  );
}

/** Action row pinned to the bottom of a card — 44px targets, wrapping safely. */
export function MobileActions({ children }) {
  return <div className="mt-3 flex flex-wrap items-center justify-end gap-2">{children}</div>;
}

export const mobileActionClass =
  "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-semibold";
