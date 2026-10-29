import React, { useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import { ArrowDownLeft, ArrowUpRight, ArrowRight } from "lucide-react";
import { formatRand } from "@/lib/money";

const STATUS_CHIP = {
  allocated: "sb-chip sb-chip-green",
  reviewed: "sb-chip sb-chip-green",
  unallocated: "sb-chip sb-chip-amber",
};

export default function RecentTransactions({ transactions, loading }) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = statusFilter === "all"
    ? transactions
    : transactions.filter((t) => t.status === statusFilter);

  if (loading) {
    return (
      <div className="sb-card">
        <div className="h-[220px] animate-pulse rounded-[18px]" style={{ background: "var(--sb-soft)" }} />
      </div>
    );
  }

  return (
    <div className="sb-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="sb-display" style={{ fontSize: 28, lineHeight: 1.1, color: "var(--sb-ink)" }}>
          Recent transactions
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold"
            style={{ border: "1px solid var(--sb-border)", color: "var(--sb-ink)" }}
          >
            This Year
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter recent transactions by status"
              className="appearance-none rounded-full px-3 py-2 pr-8 text-[12px] font-semibold outline-none"
              style={{ border: "1px solid var(--sb-border)", color: "var(--sb-ink)", background: "var(--sb-card)" }}
            >
              <option value="all">Filter</option>
              <option value="allocated">Allocated</option>
              <option value="reviewed">Reviewed</option>
              <option value="unallocated">Unallocated</option>
            </select>
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--sb-muted)" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <Link to="/transactions" className="sb-btn sb-btn-outline" style={{ padding: "9px 14px" }}>
            View all <ArrowRight size={14} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Link>
        </div>
      </div>

      <div className="sb-table-scroll mt-4">
        <table className="w-full min-w-[620px] border-collapse text-[13px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--sb-border)" }}>
              <th className="sb-label px-3 py-2 text-left">Description</th>
              <th className="sb-label px-3 py-2 text-left">Date</th>
              <th className="sb-label px-3 py-2 text-right">Amount</th>
              <th className="sb-label px-3 py-2 text-left">Account</th>
              <th className="sb-label px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-10 text-center text-[13px]" style={{ color: "var(--sb-muted)" }}>
                  No transactions yet — upload a statement to get started.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 8).map((tx) => {
                const isIn = tx.type === "credit";
                return (
                  <tr
                    key={tx.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--sb-border)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--sb-soft)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[12px]"
                          style={{
                            background: isIn ? "var(--sb-green-bg)" : "var(--sb-soft)",
                            color: isIn ? "var(--sb-green-ink)" : "var(--sb-muted)",
                          }}
                        >
                          {isIn
                            ? <ArrowDownLeft size={17} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                            : <ArrowUpRight size={17} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
                        </span>
                        <div className="min-w-0">
                          <b className="block truncate max-w-[220px]" style={{ color: "var(--sb-ink)" }}>{tx.description}</b>
                          <small className="block truncate text-[11px]" style={{ color: "var(--sb-muted)" }}>
                            {tx.category || tx.supplier_name || "—"}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5" style={{ color: "var(--sb-muted)" }}>
                      {moment(tx.date).format("DD MMM YYYY")}
                    </td>
                    <td className="sb-money whitespace-nowrap px-3 py-3.5 text-right font-bold" style={{ color: isIn ? "var(--sb-green-ink)" : "var(--sb-ink)" }}>
                      {isIn ? "+" : "−"}{formatRand(Math.abs(tx.amount))}
                    </td>
                    <td className="px-3 py-3.5" style={{ color: "var(--sb-muted)" }}>
                      {tx.account_name || "—"}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={STATUS_CHIP[tx.status] || "sb-chip sb-chip-amber"}>{tx.status}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
