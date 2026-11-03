import React from "react";
import { formatRand } from "@/lib/money";
import { MobileList, MobileCard, MobileMetricGrid, MobileMetric } from "./MobileCards";

/** Phone view of the trial balance: one card per account, totals pinned underneath. */
export default function TrialBalanceCards({ rows, totals }) {
  return (
    <>
      <MobileList>
        {rows.map((row) => (
          <MobileCard key={row.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold leading-snug" style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
                  {row.name}
                </p>
                <p className="mt-1 text-[11.5px] capitalize" style={{ color: "var(--sb-muted)" }}>
                  {row.code} · {row.type}
                </p>
              </div>
            </div>

            <MobileMetricGrid>
              <MobileMetric label="Debit" value={row.debit ? formatRand(row.debit) : "—"} />
              <MobileMetric label="Credit" value={row.credit ? formatRand(row.credit) : "—"} />
            </MobileMetricGrid>
          </MobileCard>
        ))}
      </MobileList>

      <div className="sb-card mt-3 md:hidden" style={{ padding: 14, background: "var(--sb-soft)" }}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--sb-muted)" }}>
            Total debit
          </span>
          <span className="sb-money text-[13.5px] font-bold" style={{ color: "var(--sb-ink)" }}>
            {formatRand(totals.debit)}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--sb-muted)" }}>
            Total credit
          </span>
          <span className="sb-money text-[13.5px] font-bold" style={{ color: "var(--sb-ink)" }}>
            {formatRand(totals.credit)}
          </span>
        </div>
      </div>
    </>
  );
}
