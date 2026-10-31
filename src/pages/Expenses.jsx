import React from "react";
import { useCompanyLedger } from "@/hooks/useCompanyLedger";
import { expenseBreakdown } from "@/lib/ledger";
import { formatRand } from "@/lib/money";
import {
  ReportShell,
  ReportCard,
  ReportEmpty,
  ReportLoading,
  NoCompany,
} from "@/components/accounting/ReportShell";
import { MobileList, MobileCard, MobileField } from "@/components/mobile/MobileCards";

export default function Expenses() {
  const { company, rows, transactions, loading } = useCompanyLedger();

  if (!company) return <NoCompany />;

  const { lines, entries, total } = expenseBreakdown(rows, transactions);

  return (
    <ReportShell title="Expenses" subtitle={`Where ${company.name} spends money`}>
      {loading ? (
        <ReportLoading />
      ) : (
        <>
          <div className="sb-card" style={{ padding: 20 }}>
            <p className="sb-label">Total expenses</p>
            <p className="sb-display sb-money mt-2" style={{ fontSize: 38, lineHeight: 1.05, color: "var(--sb-ink)" }}>
              {formatRand(total)}
            </p>
            <p className="mt-2 text-[12px]" style={{ color: "var(--sb-muted)" }}>
              {entries.length} allocated expense {entries.length === 1 ? "entry" : "entries"} across {lines.length}{" "}
              {lines.length === 1 ? "account" : "accounts"}.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ReportCard title="By account">
              {lines.length === 0 ? (
                <ReportEmpty>No expenses allocated yet.</ReportEmpty>
              ) : (
                lines.map((line) => {
                  const share = total > 0 ? (line.signed / total) * 100 : 0;
                  return (
                    <div key={line.id} className="py-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: "var(--sb-ink)" }}>
                          {line.name}
                        </span>
                        <span className="flex-none sb-money text-[13px]" style={{ color: "var(--sb-ink)" }}>
                          {formatRand(line.signed)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--sb-soft)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(100, share)}%`, background: "var(--sb-brand-2)" }}
                          />
                        </div>
                        <span className="w-10 flex-none text-right text-[11px] sb-money" style={{ color: "var(--sb-muted)" }}>
                          {share.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </ReportCard>

            <ReportCard title="Recent expense entries">
              {entries.length === 0 ? (
                <ReportEmpty>Nothing allocated to expense accounts yet.</ReportEmpty>
              ) : (
                <>
                <MobileList>
                  {entries.slice(0, 25).map((entry) => {
                    const account = rows.find((r) => r.id === entry.account_id);
                    return (
                      <MobileCard key={entry.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-semibold leading-snug" style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
                              {entry.description}
                            </p>
                            {entry.supplier_name && (
                              <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--sb-muted)", overflowWrap: "anywhere" }}>
                                {entry.supplier_name}
                              </p>
                            )}
                          </div>
                          <span className="sb-money shrink-0 text-[13px] font-semibold" style={{ color: "var(--sb-ink)" }}>
                            {formatRand(entry.amount)}
                          </span>
                        </div>
                        <MobileField label="Date" value={entry.date} />
                        <MobileField label="Account" value={account?.name || entry.account_name || "—"} />
                      </MobileCard>
                    );
                  })}
                </MobileList>
                <div className="sb-table-scroll hidden md:block">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr style={{ color: "var(--sb-muted)" }}>
                        <th className="sb-label py-2 text-left">Date</th>
                        <th className="sb-label py-2 text-left">Description</th>
                        <th className="sb-label py-2 text-left">Account</th>
                        <th className="sb-label py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.slice(0, 25).map((entry) => {
                        const account = rows.find((r) => r.id === entry.account_id);
                        return (
                          <tr key={entry.id} style={{ borderTop: "1px solid var(--sb-border)" }}>
                            <td className="py-2.5 pr-3 sb-money text-[11.5px] whitespace-nowrap" style={{ color: "var(--sb-muted)" }}>
                              {entry.date}
                            </td>
                            <td className="py-2.5 pr-3" style={{ maxWidth: 200 }}>
                              <span className="block truncate" style={{ color: "var(--sb-ink)" }}>
                                {entry.description}
                              </span>
                              {entry.supplier_name && (
                                <span className="block truncate text-[11px]" style={{ color: "var(--sb-muted)" }}>
                                  {entry.supplier_name}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 pr-3 truncate text-[12px]" style={{ color: "var(--sb-muted)", maxWidth: 150 }}>
                              {account?.name || entry.account_name || "—"}
                            </td>
                            <td className="py-2.5 sb-money text-right" style={{ color: "var(--sb-ink)" }}>
                              {formatRand(entry.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </ReportCard>
          </div>
        </>
      )}
    </ReportShell>
  );
}
