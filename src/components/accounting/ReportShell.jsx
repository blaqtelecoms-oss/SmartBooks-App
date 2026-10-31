import React from "react";
import { Loader2 } from "lucide-react";
import { formatRand } from "@/lib/money";

/** Page heading shared by the accounting statements. */
export function ReportShell({ title, subtitle, actions, children }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="sb-display" style={{ fontSize: 40, lineHeight: 1.05, color: "var(--sb-ink)" }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[13px]" style={{ color: "var(--sb-muted)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function ReportCard({ title, meta, children, footer }) {
  return (
    <section className="sb-card" style={{ padding: 0, overflow: "hidden" }}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5" style={{ borderColor: "var(--sb-border)" }}>
          <p className="sb-label">{title}</p>
          {meta}
        </div>
      )}
      {/* Wide report tables scroll inside the card instead of being clipped */}
      <div className="sb-table-scroll px-5 py-3">{children}</div>
      {footer && (
        <div className="border-t px-5 py-3.5" style={{ borderColor: "var(--sb-border)", background: "var(--sb-soft)" }}>
          {footer}
        </div>
      )}
    </section>
  );
}

/** One statement line: optional code, label and a right-aligned amount. */
export function Line({ code, label, value, strong = false, sub = false }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      {code && (
        <span className="w-11 flex-none text-[11px] sb-money" style={{ color: "var(--sb-muted)" }}>
          {code}
        </span>
      )}
      <span
        className={`min-w-0 flex-1 truncate ${strong ? "text-[13.5px] font-bold" : "text-[13px]"}`}
        style={{ color: strong ? "var(--sb-ink)" : sub ? "var(--sb-muted)" : "#243A34", paddingLeft: sub ? 12 : 0 }}
      >
        {label}
      </span>
      <span
        className={`flex-none sb-money ${strong ? "text-[13.5px] font-bold" : "text-[13px]"}`}
        style={{ color: value < 0 ? "var(--sb-red-ink)" : "var(--sb-ink)" }}
      >
        {formatRand(value)}
      </span>
    </div>
  );
}

export function TotalLine({ label, value, tone = "default" }) {
  const color = tone === "brand" ? "var(--sb-brand)" : "var(--sb-ink)";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--sb-muted)" }}>
        {label}
      </span>
      <span className="sb-money text-[15px] font-bold" style={{ color }}>
        {formatRand(value)}
      </span>
    </div>
  );
}

export function ReportEmpty({ children }) {
  return (
    <p className="py-8 text-center text-[13px]" style={{ color: "var(--sb-muted)" }}>
      {children}
    </p>
  );
}

export function ReportLoading() {
  return (
    <div className="sb-card flex items-center justify-center py-16">
      <Loader2 size={22} className="animate-spin" style={{ color: "var(--sb-muted)" }} />
    </div>
  );
}

export function NoCompany() {
  return (
    <div className="sb-card py-16 text-center text-[13px]" style={{ color: "var(--sb-muted)" }}>
      Select a company first
    </div>
  );
}
