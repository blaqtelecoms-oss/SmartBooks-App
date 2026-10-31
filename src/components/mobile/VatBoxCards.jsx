import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MobileList, MobileCard, MobileMetricGrid, MobileMetric } from "./MobileCards";

/** Phone view of the VAT 201 boxes: one card per box, expandable for its transactions. */
export default function VatBoxCards({ boxes, expandedBox, onToggle, formatR }) {
  return (
    <MobileList>
      {boxes.map((box) => {
        const isTotal = box.box === 3 || box.box === 6 || box.box === 7;
        const isExpanded = expandedBox === box.box;
        const expandable = box.transactions.length > 0;

        return (
          <MobileCard key={box.box}>
            <button
              type="button"
              onClick={() => expandable && onToggle(isExpanded ? null : box.box)}
              className="block w-full text-left"
              aria-expanded={expandable ? isExpanded : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--sb-muted)" }}>
                    Box {box.box}
                  </p>
                  <p
                    className={`mt-1 text-[13px] leading-snug ${isTotal ? "font-bold" : "font-semibold"}`}
                    style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}
                  >
                    {box.label}
                  </p>
                </div>
                {expandable && (
                  isExpanded
                    ? <ChevronDown size={15} className="mt-0.5 flex-none" style={{ color: "var(--sb-muted)" }} aria-hidden="true" />
                    : <ChevronRight size={15} className="mt-0.5 flex-none" style={{ color: "var(--sb-muted)" }} aria-hidden="true" />
                )}
              </div>

              <MobileMetricGrid>
                <MobileMetric label="Value" value={formatR(box.value)} />
                <MobileMetric label="VAT" value={formatR(box.tax)} />
              </MobileMetricGrid>
            </button>

            {isExpanded && expandable && (
              <div className="mt-3 space-y-1.5" style={{ borderTop: "1px solid var(--sb-border)", paddingTop: 10 }}>
                {box.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-start justify-between gap-3 text-[12px]">
                    <span className="min-w-0 flex-1" style={{ color: "var(--sb-muted)", overflowWrap: "anywhere" }}>
                      {tx.date} — {tx.description}
                    </span>
                    <span className="sb-money shrink-0 font-semibold" style={{ color: "var(--sb-ink)" }}>
                      {formatR(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </MobileCard>
        );
      })}
    </MobileList>
  );
}
