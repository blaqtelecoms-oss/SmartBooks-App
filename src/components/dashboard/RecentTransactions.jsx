import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import moment from "moment";
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Eye } from "lucide-react";
import { formatRand } from "@/lib/money";
import { categoryLabel } from "@/lib/transactionDetail";
import TransactionListMobile from "@/components/transactions/TransactionListMobile";

const STATUS_CHIP = {
  allocated: "sb-chip sb-chip-green",
  reviewed: "sb-chip sb-chip-green",
  unallocated: "sb-chip sb-chip-amber",
  locked: "sb-chip sb-chip-red",
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unallocated", label: "Unallocated" },
  { value: "allocated", label: "Allocated" },
  { value: "reviewed", label: "Reviewed" },
];

/** The latest rows of the ledger, presented exactly like the transactions page. */
export default function RecentTransactions({ transactions, loading }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = statusFilter === "all"
    ? transactions
    : transactions.filter((t) => t.status === statusFilter);
  const visible = filtered.slice(0, 8);
  const unallocatedCount = transactions.filter((t) => t.status === "unallocated").length;

  return (
    <div className="sb-card" style={{ padding: 0 }}>
      <div
        className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderBottom: "1px solid var(--sb-border)" }}
      >
        <div className="min-w-0">
          <h3 className="sb-display" style={{ fontSize: 28, lineHeight: 1.1, color: "var(--sb-ink)" }}>
            Recent transactions
          </h3>
          <p className="mt-1 text-[12.5px]" style={{ color: "var(--sb-muted)" }}>
            {transactions.length} transactions · {unallocatedCount} unallocated
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="sb-seg" role="group" aria-label="Filter recent transactions by status">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className="sb-seg-item"
                data-active={statusFilter === f.value ? "true" : "false"}
                aria-pressed={statusFilter === f.value}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Link to="/transactions" className="sb-btn sb-btn-outline">
            View all <ArrowRight size={14} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-5">
          <div className="h-[220px] animate-pulse rounded-[18px]" style={{ background: "var(--sb-soft)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center">
          <p className="sb-display" style={{ fontSize: 28, color: "var(--sb-ink)" }}>Nothing to review here.</p>
          <p className="mt-1 text-[13px]" style={{ color: "var(--sb-muted)" }}>
            No transactions match this filter. Try another status or clear your search.
          </p>
        </div>
      ) : (
        <>
          {/* Phones: the same banking-style feed the transactions page uses. */}
          <TransactionListMobile
            transactions={visible}
            onOpen={(tx) => navigate(`/transactions/${tx.id}`)}
          />

          {/* Tablet and up: the dense ledger, scrolling sideways when needed. */}
          <div className="sb-table-scroll hidden md:block">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--sb-border)" }}>
                  <th className="sb-label px-5 py-3 text-left">Description</th>
                  <th className="sb-label px-5 py-3 text-left">Date</th>
                  <th className="sb-label px-5 py-3 text-right">Amount</th>
                  <th className="sb-label px-5 py-3 text-left">Category</th>
                  <th className="sb-label px-5 py-3 text-left">Status</th>
                  <th className="sb-label px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((tx) => {
                  const isIn = tx.type === "credit";
                  return (
                    <tr
                      key={tx.id}
                      className="transition-colors duration-150"
                      style={{ borderBottom: "1px solid var(--sb-border)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--sb-soft)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td className="px-5 py-3.5">
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
                            <b className="block truncate max-w-[240px]" style={{ color: "var(--sb-ink)" }}>{tx.description}</b>
                            {tx.reference && (
                              <small className="block truncate text-[11px]" style={{ color: "var(--sb-muted)" }}>{tx.reference}</small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5" style={{ color: "var(--sb-muted)" }}>
                        {moment(tx.date).format("DD MMM YYYY")}
                      </td>
                      <td className="sb-money whitespace-nowrap px-5 py-3.5 text-right font-bold" style={{ color: isIn ? "var(--sb-green-ink)" : "var(--sb-ink)" }}>
                        {isIn ? "+" : "−"}{formatRand(Math.abs(tx.amount))}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] font-semibold" style={{ color: "var(--sb-ink)" }}>
                          {categoryLabel(tx) || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={STATUS_CHIP[tx.status] || "sb-chip sb-chip-amber"}>{tx.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/transactions/${tx.id}`}
                          aria-label={`View details for ${tx.description}`}
                          className="inline-grid h-8 w-8 place-items-center rounded-full transition-opacity hover:opacity-70"
                          style={{ border: "1px solid var(--sb-border)", color: "var(--sb-muted)" }}
                        >
                          <Eye size={15} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
