import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import moment from "moment";
import TrialBalanceCards from "@/components/mobile/TrialBalanceCards";
import GeneralLedgerCards from "@/components/mobile/GeneralLedgerCards";

const REPORTS = [
  { value: "trial_balance", label: "Trial Balance" },
  { value: "income_statement", label: "Income Statement" },
  { value: "balance_sheet", label: "Balance Sheet" },
  { value: "general_ledger", label: "General Ledger" },
];

export default function Reports() {
  const { currentCompany } = useOutletContext();
  const [report, setReport] = useState("trial_balance");
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, accts] = await Promise.all([
        db.entities.Transaction.filter({ company_id: currentCompany.id }, "-date", 50),
        db.entities.Account.filter({ company_id: currentCompany.id })
      ]);
      setTransactions(txs);
      setAccounts(accts);
    } catch (e) {}
    setLoading(false);
  };

  const formatR = (v) => `R ${(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  const totalIncome = transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const totalAssets = accounts.filter(a => a.type === "asset").reduce((s, a) => s + (a.balance || 0), 0) + (totalIncome - totalExpenses);
  const totalLiabilities = accounts.filter(a => a.type === "liability" || a.type === "vat" || a.type === "paye").reduce((s, a) => s + (a.balance || 0), 0);
  const totalEquity = totalAssets - totalLiabilities;

  // Trial balance lines, shared by the phone cards and the desktop table
  const trialRows = useMemo(() => accounts
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((acct) => {
      const debits = transactions.filter(t => t.account_id === acct.id && t.type === "debit").reduce((s, t) => s + t.amount, 0);
      const credits = transactions.filter(t => t.account_id === acct.id && t.type === "credit").reduce((s, t) => s + t.amount, 0);
      const bal = acct.balance || 0;
      return {
        id: acct.id,
        code: acct.code,
        name: acct.name,
        type: acct.type,
        debit: acct.normal_side === "debit" ? debits + bal : debits,
        credit: acct.normal_side === "credit" ? credits + bal : credits,
        signed: (acct.normal_side === "debit" ? debits + bal : debits) - (acct.normal_side === "credit" ? credits + bal : credits),
      };
    })
    .filter((row) => row.debit !== 0 || row.credit !== 0), [accounts, transactions]);

  const trialTotals = useMemo(() => ({
    debit: transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0),
    credit: transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0),
  }), [transactions]);

  const ledgerGroups = useMemo(() => accounts
    .filter(a => transactions.some(t => t.account_id === a.id))
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((acct) => ({
      account: acct,
      entries: transactions
        .filter(t => t.account_id === acct.id)
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    })), [accounts, transactions]);

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Reports</h1>
        <p className="text-[13px] text-[#6B6B72] mt-1">Financial reports for {currentCompany.name}</p>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-[#6B6B72] mx-auto" /></div>
      ) : (
        <>
          {/* Report picker */}
          <Select value={report} onValueChange={setReport}>
            <SelectTrigger className="w-full sm:w-[260px]" aria-label="Choose a report">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORTS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Trial Balance */}
          {report === "trial_balance" && (
            <ReportCard title="Trial Balance" date={moment().format("DD MMMM YYYY")}>
              {trialRows.length === 0 ? (
                <p className="text-center text-[13px] text-[#6B6B72] py-8">No account balances yet</p>
              ) : (
                <>
                  {/* Phones: one card per account, never a sideways scroll */}
                  <TrialBalanceCards rows={trialRows} totals={trialTotals} />

                  <table className="hidden w-full text-[13px] md:table">
                    <thead>
                      <tr className="border-b border-[#E5E5E8]">
                        <th className="text-left py-2 px-3 text-[11px] text-[#6B6B72] uppercase tracking-wider">Account</th>
                        <th className="text-right py-2 px-3 text-[11px] text-[#6B6B72] uppercase tracking-wider">Debit</th>
                        <th className="text-right py-2 px-3 text-[11px] text-[#6B6B72] uppercase tracking-wider">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialRows.map((row) => (
                        <tr key={row.id} className="border-b border-[#F7F7FA] hover:bg-[#F7F7FA]">
                          <td className="py-2 px-3"><span className="text-[#6B6B72] mr-2">{row.code}</span>{row.name}</td>
                          <td className="py-2 px-3 text-right font-mono">{row.debit ? formatR(row.debit) : "—"}</td>
                          <td className="py-2 px-3 text-right font-mono">{row.credit ? formatR(row.credit) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#0F0F0F] font-semibold">
                        <td className="py-2 px-3">Total</td>
                        <td className="py-2 px-3 text-right font-mono">{formatR(trialTotals.debit)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatR(trialTotals.credit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              )}
            </ReportCard>
          )}

          {/* Income Statement */}
          {report === "income_statement" && (
            <ReportCard title="Income Statement" date={moment().format("DD MMMM YYYY")}>
              <div className="space-y-4 text-[13px]">
                <div>
                  <h4 className="text-[12px] text-[#6B6B72] uppercase tracking-wider mb-2">Revenue</h4>
                  {accounts.filter(a => a.type === "income").map(a => (
                    <StatementLine
                      key={a.id}
                      label={a.name}
                      value={formatR(transactions.filter(t => t.account_id === a.id).reduce((s, t) => s + t.amount, 0))}
                    />
                  ))}
                  <div className="flex justify-between gap-3 py-1.5 px-3 font-semibold border-t border-[#E5E5E8] mt-1">
                    <span className="min-w-0">Total Revenue</span>
                    <span className="shrink-0 font-mono">{formatR(totalIncome)}</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-[12px] text-[#6B6B72] uppercase tracking-wider mb-2">Expenses</h4>
                  {accounts.filter(a => a.type === "expense").map(a => (
                    <StatementLine
                      key={a.id}
                      label={a.name}
                      value={formatR(transactions.filter(t => t.account_id === a.id).reduce((s, t) => s + t.amount, 0))}
                    />
                  ))}
                  <div className="flex justify-between gap-3 py-1.5 px-3 font-semibold border-t border-[#E5E5E8] mt-1">
                    <span className="min-w-0">Total Expenses</span>
                    <span className="shrink-0 font-mono">{formatR(totalExpenses)}</span>
                  </div>
                </div>
                <div className="flex justify-between gap-3 py-3 px-3 font-semibold text-[16px] border-t-2 border-[#0F0F0F]">
                  <span className="min-w-0">Net {netProfit >= 0 ? "Profit" : "Loss"}</span>
                  <span className={`shrink-0 font-mono ${netProfit >= 0 ? "text-[#22C55E]" : "text-red-500"}`}>{formatR(netProfit)}</span>
                </div>
              </div>
            </ReportCard>
          )}

          {/* Balance Sheet */}
          {report === "balance_sheet" && (
            <ReportCard title="Balance Sheet" date={moment().format("DD MMMM YYYY")}>
              <div className="space-y-4 text-[13px]">
                <div>
                  <h4 className="text-[12px] text-[#6B6B72] uppercase tracking-wider mb-2">Assets</h4>
                  {accounts.filter(a => a.type === "asset").map(a => (
                    <StatementLine key={a.id} label={a.name} value={formatR(a.balance || 0)} />
                  ))}
                  <div className="flex justify-between gap-3 py-1.5 px-3 font-semibold border-t border-[#E5E5E8] mt-1">
                    <span className="min-w-0">Total Assets</span>
                    <span className="shrink-0 font-mono">{formatR(totalAssets)}</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-[12px] text-[#6B6B72] uppercase tracking-wider mb-2">Liabilities</h4>
                  {accounts.filter(a => ["liability", "vat", "paye"].includes(a.type)).map(a => (
                    <StatementLine key={a.id} label={a.name} value={formatR(a.balance || 0)} />
                  ))}
                  <div className="flex justify-between gap-3 py-1.5 px-3 font-semibold border-t border-[#E5E5E8] mt-1">
                    <span className="min-w-0">Total Liabilities</span>
                    <span className="shrink-0 font-mono">{formatR(totalLiabilities)}</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-[12px] text-[#6B6B72] uppercase tracking-wider mb-2">Equity</h4>
                  {accounts.filter(a => a.type === "equity").map(a => (
                    <StatementLine key={a.id} label={a.name} value={formatR(a.balance || 0)} />
                  ))}
                  <div className="flex justify-between gap-3 py-1.5 px-3 font-semibold border-t border-[#E5E5E8] mt-1">
                    <span className="min-w-0">Total Equity</span>
                    <span className="shrink-0 font-mono">{formatR(totalEquity)}</span>
                  </div>
                </div>
              </div>
            </ReportCard>
          )}

          {/* General Ledger */}
          {report === "general_ledger" && (
            <ReportCard title="General Ledger" date={moment().format("DD MMMM YYYY")}>
              {ledgerGroups.length === 0 ? (
                <p className="text-center text-[13px] text-[#6B6B72] py-8">No allocated transactions to display</p>
              ) : (
                <>
                  {/* Phones: entries grouped in account cards */}
                  <GeneralLedgerCards groups={ledgerGroups} formatR={formatR} />

                  <div className="hidden md:block">
                    {ledgerGroups.map(({ account: acct, entries }) => (
                      <div key={acct.id} className="mb-6 last:mb-0">
                        <div className="flex items-center gap-2 mb-2 px-3">
                          <span className="text-[12px] font-mono text-[#6B6B72]">{acct.code}</span>
                          <span className="text-[13px] font-medium text-[#0F0F0F]">{acct.name}</span>
                        </div>
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="border-b border-[#E5E5E8]">
                              <th className="text-left py-1.5 px-3 text-[#6B6B72]">Date</th>
                              <th className="text-left py-1.5 px-3 text-[#6B6B72]">Description</th>
                              <th className="text-right py-1.5 px-3 text-[#6B6B72]">Debit</th>
                              <th className="text-right py-1.5 px-3 text-[#6B6B72]">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map(t => (
                              <tr key={t.id} className="border-b border-[#F7F7FA]">
                                <td className="py-1.5 px-3 text-[#6B6B72] whitespace-nowrap">{moment(t.date).format("DD/MM/YY")}</td>
                                <td className="py-1.5 px-3">{t.description}</td>
                                <td className="py-1.5 px-3 text-right font-mono whitespace-nowrap">{t.type === "debit" ? formatR(t.amount) : "—"}</td>
                                <td className="py-1.5 px-3 text-right font-mono whitespace-nowrap">{t.type === "credit" ? formatR(t.amount) : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </ReportCard>
          )}
        </>
      )}
    </div>
  );
}

/** Statement line that wraps long account names instead of pushing the amount off screen. */
function StatementLine({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 px-3 hover:bg-[#F7F7FA] rounded">
      <span className="min-w-0" style={{ overflowWrap: "anywhere" }}>{label}</span>
      <span className="shrink-0 font-mono">{value}</span>
    </div>
  );
}

function ReportCard({ title, date, children }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
      <div className="px-4 py-3.5 border-b border-[#E5E5E8] flex items-center justify-between sm:px-5 sm:py-4">
        <div>
          <h3 className="text-[15px] font-medium text-[#0F0F0F]">{title}</h3>
          <p className="text-[11px] text-[#6B6B72] mt-0.5">As at {date}</p>
        </div>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}
