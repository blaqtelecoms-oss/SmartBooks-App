import React from "react";
import { useCompanyLedger } from "@/hooks/useCompanyLedger";
import { profitAndLoss } from "@/lib/ledger";
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

export default function ProfitLoss() {
  const { company, rows, loading } = useCompanyLedger();

  if (!company) return <NoCompany />;

  const income = rows.filter((r) => r.type === "income" && Math.abs(r.signed) > 0.004);
  const expenses = rows.filter((r) => r.type === "expense" && Math.abs(r.signed) > 0.004);
  const summary = profitAndLoss(rows);
  const margin = summary.income > 0 ? (summary.net / summary.income) * 100 : 0;

  return (
    <ReportShell
      title="Profit and Loss"
      subtitle={`Income and expenses for ${company.name}`}
      actions={
        <span className={`sb-chip ${summary.net >= 0 ? "sb-chip-green" : "sb-chip-red"}`}>
          {summary.net >= 0 ? "Profit" : "Loss"} · {margin.toFixed(1)}% margin
        </span>
      }
    >
      {loading ? (
        <ReportLoading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ReportCard title="Income" footer={<TotalLine label="Total income" value={summary.income} />}>
            {income.length === 0 ? (
              <ReportEmpty>No income allocated yet.</ReportEmpty>
            ) : (
              income.map((row) => <Line key={row.id} code={row.code} label={row.name} value={-row.signed} />)
            )}
          </ReportCard>

          <ReportCard title="Expenses" footer={<TotalLine label="Total expenses" value={summary.expenses} />}>
            {expenses.length === 0 ? (
              <ReportEmpty>No expenses allocated yet.</ReportEmpty>
            ) : (
              expenses.map((row) => <Line key={row.id} code={row.code} label={row.name} value={row.signed} />)
            )}
          </ReportCard>

          <div className="sb-card lg:col-span-2" style={{ padding: 20 }}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="sb-label">{summary.net >= 0 ? "Net profit" : "Net loss"}</p>
                <p
                  className="sb-display sb-money mt-2"
                  style={{ fontSize: 38, lineHeight: 1.05, color: summary.net >= 0 ? "var(--sb-ink)" : "var(--sb-red-ink)" }}
                >
                  {formatRand(summary.net)}
                </p>
              </div>
              <div className="flex gap-8">
                <div>
                  <p className="sb-label">Income</p>
                  <p className="sb-money mt-1 text-[13px] font-bold" style={{ color: "var(--sb-ink)" }}>
                    {formatRand(summary.income)}
                  </p>
                </div>
                <div>
                  <p className="sb-label">Expenses</p>
                  <p className="sb-money mt-1 text-[13px] font-bold" style={{ color: "var(--sb-ink)" }}>
                    {formatRand(summary.expenses)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  );
}
