import React from "react";
import moment from "moment";
import { MobileList, MobileCard } from "./MobileCards";

/** Phone view of the general ledger: one card per account with its entries underneath. */
export default function GeneralLedgerCards({ groups, formatR }) {
  return (
    <MobileList>
      {groups.map(({ account, entries }) => (
        <MobileCard key={account.id}>
          <div className="flex items-baseline justify-between gap-2">
            <p
              className="min-w-0 text-[14px] font-semibold leading-snug"
              style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}
            >
              {account.name}
            </p>
            <span className="shrink-0 sb-money text-[11.5px]" style={{ color: "var(--sb-muted)" }}>
              {account.code}
            </span>
          </div>

          <ul className="mt-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-3 border-b py-2 last:border-b-0"
                style={{ borderColor: "var(--sb-border)" }}
              >
                <div className="min-w-0">
                  <p className="text-[12.5px] leading-snug" style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
                    {entry.description}
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: "var(--sb-muted)" }}>
                    {moment(entry.date).format("DD/MM/YY")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="sb-money text-[12.5px] font-semibold" style={{ color: "var(--sb-ink)" }}>
                    {formatR(entry.amount)}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--sb-muted)" }}>
                    {entry.type === "debit" ? "Debit" : "Credit"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </MobileCard>
      ))}
    </MobileList>
  );
}
