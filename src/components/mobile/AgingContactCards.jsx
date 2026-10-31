import React from "react";
import { Mail, Loader2 } from "lucide-react";
import { MobileList, MobileCard, MobileMetricGrid, MobileMetric, MobileActions, mobileActionClass } from "./MobileCards";

/** Phone view of the aging report: one card per contact with its bucket figures. */
export default function AgingContactCards({ rows, sending, onSend, formatR }) {
  return (
    <MobileList>
      {rows.map((row) => (
        <MobileCard key={row.contact.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold leading-snug" style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
                {row.contact.name}
              </p>
              {row.contact.email && (
                <p className="mt-1 text-[11.5px]" style={{ color: "var(--sb-muted)", overflowWrap: "anywhere" }}>
                  {row.contact.email}
                </p>
              )}
            </div>
            <span className="sb-money shrink-0 text-[15px] font-bold" style={{ color: "var(--sb-ink)" }}>
              {formatR(row.total)}
            </span>
          </div>

          <MobileMetricGrid>
            <MobileMetric label="Current" value={formatR(row.buckets.current)} />
            <MobileMetric label="1–30 days" value={formatR(row.buckets.days30)} tone="#B26A00" />
            <MobileMetric label="31–60 days" value={formatR(row.buckets.days60)} tone="#A15B00" />
            <MobileMetric label="90+ days" value={formatR(row.buckets.days90)} tone="#B3261E" />
          </MobileMetricGrid>

          <MobileActions>
            <button
              type="button"
              onClick={() => onSend(row)}
              disabled={sending === row.contact.id}
              className={mobileActionClass}
              style={{ background: "var(--sb-ink)", color: "#FFFFFF", opacity: sending === row.contact.id ? 0.6 : 1 }}
            >
              {sending === row.contact.id
                ? <Loader2 size={12} className="animate-spin" />
                : <Mail size={12} />}
              Send statement
            </button>
          </MobileActions>
        </MobileCard>
      ))}
    </MobileList>
  );
}
