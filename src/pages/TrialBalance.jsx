import React from "react";
import { Link } from "react-router-dom";
import { useCompanyLedger } from "@/hooks/useCompanyLedger";
import { trialBalanceTotals } from "@/lib/ledger";
import { formatRand } from "@/lib/money";
import {
  ReportShell,
  ReportCard,
  ReportEmpty,
  ReportLoading,
  NoCompany,
} from "@/components/accounting/ReportShell";
import { MobileList, MobileCard, MobileField } from "@/components/mobile/MobileCards";

export default function TrialBalance() {
  const { company, rows, loading } = useCompanyLedger();

  if (!company) return <NoCompany />;

  const withBalance = rows.filter((row) => Math.abs(row.signed) > 0.004);
  const totals = trialBalanceTotals(withBalance);
  const balanced = Math.abs(totals.difference) < 0.01;

  return (
    <ReportShell
      title="Trial Balance"
      subtitle={`Every account's debit and credit total for ${company.name}`}
      actions={
        <Link to="/accounts" className="sb-btn sb-btn-outline">
          Chart of accounts
        </Link>
      }
    >
      {loading ? (
        <ReportLoading />
      ) : (
        <ReportCard
          title="Accounts"
          meta={
            <span className={`sb-chip ${balanced ? "sb-chip-green" : "sb-chip-amber"}`}>
              {balanced ? "Balanced" : `Out by ${formatRand(totals.difference)}`}
            </span>
          }
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <span className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--sb-muted)" }}>
                Totals
              </span>
              <div className="flex gap-6 sb-money text-[15px] font-bold sm:gap-10" style={{ color: "var(--sb-ink)" }}>
                <span>{formatRand(totals.debit)}</span>
                <span>{formatRand(totals.credit)}</span>
              </div>
            </div>
          }
        >
          {withBalance.length === 0 ? (
            <ReportEmpty>No account balances yet — allocate some transactions first.</ReportEmpty>
          ) : (
            <>
              <MobileList>
                {withBalance.map((row) => (
                  <MobileCard key={row.id}>
                    <p className="text-[13.5px] font-semibold leading-snug" style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
                      <span className="sb-money mr-1.5 text-[11px]" style={{ color: "var(--sb-muted)" }}>{row.code}</span>
                      {row.name}
                    </p>
                    <p className="mt-1 text-[11.5px] capitalize" style={{ color: "var(--sb-muted)" }}>{row.type}</p>
                    <MobileField label="Debit" value={row.debit ? formatRand(row.debit) : "—"} />
                    <MobileField label="Credit" value={row.credit ? formatRand(row.credit) : "—"} />
                  </MobileCard>
                ))}
              </MobileList>
              <div className="sb-table-scroll hidden md:block">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ color: "var(--sb-muted)" }}>
                    <th className="sb-label w-14 py-2 text-left">Code</th>
                    <th className="sb-label py-2 text-left">Account</th>
                    <th className="sb-label py-2 text-left">Type</th>
                    <th className="sb-label py-2 text-right">Debit</th>
                    <th className="sb-label py-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {withBalance.map((row) => (
                    <tr key={row.id} style={{ borderTop: "1px solid var(--sb-border)" }}>
                      <td className="py-2.5 pr-3 sb-money text-[11.5px]" style={{ color: "var(--sb-muted)" }}>
                        {row.code}
                      </td>
                      <td className="py-2.5 pr-3 truncate" style={{ color: "var(--sb-ink)", maxWidth: 260 }}>
                        {row.name}
                      </td>
                      <td className="py-2.5 pr-3 text-[11.5px] capitalize" style={{ color: "var(--sb-muted)" }}>
                        {row.type}
                      </td>
                      <td className="py-2.5 sb-money text-right" style={{ color: "var(--sb-ink)" }}>
                        {row.debit ? formatRand(row.debit) : "—"}
                      </td>
                      <td className="py-2.5 sb-money text-right" style={{ color: "var(--sb-ink)" }}>
                        {row.credit ? formatRand(row.credit) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </ReportCard>
      )}
    </ReportShell>
  );
}
