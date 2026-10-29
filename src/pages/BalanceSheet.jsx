import React from "react";
import { useCompanyLedger } from "@/hooks/useCompanyLedger";
import { balanceSheet } from "@/lib/ledger";
import { formatRand } from "@/lib/money";
import {
  ReportShell,
  ReportCard,
  Line,
  TotalLine,
  ReportEmpty,
  ReportLoading,
  NoCompany,
} from "@/components/accounting/ReportShell";

export default function BalanceSheet() {
  const { company, rows, loading } = useCompanyLedger();

  if (!company) return <NoCompany />;

  const assets = rows.filter((r) => r.type === "asset" && Math.abs(r.signed) > 0.004);
  const liabilities = rows.filter((r) => ["liability", "vat", "paye"].includes(r.type) && Math.abs(r.signed) > 0.004);
  const equityRows = rows.filter((r) => r.type === "equity" && Math.abs(r.signed) > 0.004);
  const summary = balanceSheet(rows);
  const balanced = Math.abs(summary.assets - summary.netWorth) < 0.01;

  return (
    <ReportShell
      title="Balance Sheet"
      subtitle={`What ${company.name} owns and owes, as at today`}
      actions={
        <span className={`sb-chip ${balanced ? "sb-chip-green" : "sb-chip-amber"}`}>
          {balanced ? "In balance" : "Review balances"}
        </span>
      }
    >
      {loading ? (
        <ReportLoading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <ReportCard
              title="Assets"
              footer={<TotalLine label="Total assets" value={summary.assets} tone="brand" />}
            >
              {assets.length === 0 ? (
                <ReportEmpty>No asset balances yet.</ReportEmpty>
              ) : (
                assets.map((row) => (
                  <Line key={row.id} code={row.code} label={row.name} value={row.signed} />
                ))
              )}
            </ReportCard>
          </div>

          <div className="flex flex-col gap-4">
            <ReportCard
              title="Liabilities"
              footer={<TotalLine label="Total liabilities" value={summary.liabilities} />}
            >
              {liabilities.length === 0 ? (
                <ReportEmpty>No liabilities recorded.</ReportEmpty>
              ) : (
                liabilities.map((row) => (
                  <Line key={row.id} code={row.code} label={row.name} value={-row.signed} />
                ))
              )}
            </ReportCard>

            <ReportCard
              title="Equity"
              footer={<TotalLine label="Total equity" value={summary.equity} tone="brand" />}
            >
              {equityRows.map((row) => (
                <Line key={row.id} code={row.code} label={row.name} value={-row.signed} />
              ))}
              <Line label="Retained earnings (current period)" value={summary.retainedEarnings} sub />
            </ReportCard>
          </div>

          <div className="sb-card lg:col-span-2" style={{ padding: 20 }}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="sb-label">Net worth</p>
                <p className="sb-display sb-money mt-2" style={{ fontSize: 34, lineHeight: 1.05, color: "var(--sb-ink)" }}>
                  {formatRand(summary.netWorth)}
                </p>
              </div>
              <p className="text-[12px]" style={{ color: "var(--sb-muted)" }}>
                Assets {formatRand(summary.assets)} · Liabilities + equity {formatRand(summary.netWorth)}
              </p>
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  );
}
