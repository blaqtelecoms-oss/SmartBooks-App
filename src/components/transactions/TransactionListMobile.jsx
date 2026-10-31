import React from "react";
import moment from "moment";
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { formatRand } from "@/lib/money";

/**
 * Phone-first transaction feed. Each row carries the essentials a banking app
 * shows at a glance — direction, description, date, amount and allocation
 * state — and opens the full record (with allocation controls) on tap.
 */
export default function TransactionListMobile({ transactions, onOpen }) {
  return (
    <ul className="md:hidden" style={{ borderTop: "1px solid var(--sb-border)" }}>
      {transactions.map((tx) => {
        const isIn = tx.type === "credit";
        const amount = Math.abs(tx.amount || 0);

        return (
          <li key={tx.id} style={{ borderBottom: "1px solid var(--sb-border)" }}>
            <button
              type="button"
              onClick={() => onOpen(tx)}
              className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-[var(--sb-soft)]"
            >
              <span
                className="mt-0.5 grid h-11 w-11 flex-none place-items-center rounded-full"
                style={{
                  background: isIn ? "var(--sb-green-bg)" : "var(--sb-soft)",
                  color: isIn ? "var(--sb-green-ink)" : "var(--sb-muted)",
                }}
                aria-hidden="true"
              >
                {isIn
                  ? <ArrowDownLeft size={18} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
                  : <ArrowUpRight size={18} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className="block text-[13.5px] font-semibold leading-snug"
                  style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}
                >
                  {tx.description}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px]" style={{ color: "var(--sb-muted)" }}>
                  <span>{moment(tx.date).format("DD MMM YYYY")}</span>
                  {tx.reference ? <><span aria-hidden="true">·</span><span className="min-w-0 truncate">{tx.reference}</span></> : null}
                </span>
                <span className="mt-1.5 flex items-center gap-1.5">
                  <span className={isIn ? "sb-chip sb-chip-green" : "sb-chip sb-chip-amber"}>
                    {isIn ? "Money in" : "Money out"}
                  </span>
                  <span
                    className="text-[10.5px] font-semibold"
                    style={{ color: tx.status === "unallocated" ? "var(--sb-amber-ink)" : "var(--sb-muted)" }}
                  >
                    {tx.account_name || (tx.status === "unallocated" ? "Unallocated" : tx.status)}
                  </span>
                </span>
              </span>

              <span className="flex flex-none flex-col items-end gap-1">
                <span
                  className="sb-money whitespace-nowrap text-[13.5px] font-bold"
                  style={{ color: isIn ? "var(--sb-green-ink)" : "var(--sb-ink)" }}
                >
                  {isIn ? "+" : "−"}{formatRand(amount)}
                </span>
                <ChevronRight size={15} style={{ color: "var(--sb-muted)" }} aria-hidden="true" />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
