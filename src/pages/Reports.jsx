import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import moment from "moment";

export default function Reports() {
  const { currentCompany } = useOutletContext();
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

  // Compute balances by account type
  const getBalanceByType = (type) => {
    return transactions
      .filter(t => t.status !== "unallocated")
      .reduce((sum, t) => {
        const acct = accounts.find(a => a.id === t.account_id);
        if (acct?.type === type) {
          return sum + (t.type === "debit" ? t.amount : -t.amount);
        }
        return sum;
      }, 0);
  };

  const totalIncome = transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const totalAssets = accounts.filter(a => a.type === "asset").reduce((s, a) => s + (a.balance || 0), 0) + (totalIncome - totalExpenses);
  const totalLiabilities = accounts.filter(a => a.type === "liability" || a.type === "vat" || a.type === "paye").reduce((s, a) => s + (a.balance || 0), 0);
  const totalEquity = totalAssets - totalLiabilities;

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
        <Tabs defaultValue="trial_balance" className="space-y-4">
          <TabsList className="flex h-9 w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-lg border border-[#E5E5E8] bg-[#F7F7FA] p-1">
            <TabsTrigger value="trial_balance" className="shrink-0 rounded-md px-2 text-[12px] data-[state=active]:bg-white data-[state=active]:shadow-sm sm:px-3">Trial Balance</TabsTrigger>
            <TabsTrigger value="income_statement" className="shrink-0 rounded-md px-2 text-[12px] data-[state=active]:bg-white data-[state=active]:shadow-sm sm:px-3">Income Statement</TabsTrigger>
            <TabsTrigger value="balance_sheet" className="shrink-0 rounded-md px-2 text-[12px] data-[state=active]:bg-white data-[state=active]:shadow-sm sm:px-3">Balance Sheet</TabsTrigger>
            <TabsTrigger value="general_ledger" className="shrink-0 rounded-md px-2 text-[12px] data-[state=active]:bg-white data-[state=active]:shadow-sm sm:px-3">General Ledger</TabsTrigger>
          </TabsList>

          {/* Trial Balance */}
          <TabsContent value="trial_balance">
            <ReportCard title="Trial Balance" date={moment().format("DD MMMM YYYY")}>
              <table className="w-full min-w-[360px] text-[13px]">
                <thead>
                  <tr className="border-b border-[#E5E5E8]">
                    <th className="text-left py-2 px-3 text-[11px] text-[#6B6B72] uppercase tracking-wider">Account</th>
                    <th className="text-right py-2 px-3 text-[11px] text-[#6B6B72] uppercase tracking-wider">Debit</th>
                    <th className="text-right py-2 px-3 text-[11px] text-[#6B6B72] uppercase tracking-wider">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.sort((a, b) => a.code.localeCompare(b.code)).map(acct => {
                    const debits = transactions.filter(t => t.account_id === acct.id && t.type === "debit").reduce((s, t) => s + t.amount, 0);
                    const credits = transactions.filter(t => t.account_id === acct.id && t.type === "credit").reduce((s, t) => s + t.amount, 0);
                    if (debits === 0 && credits === 0 && (acct.balance || 0) === 0) return null;
                    const bal = acct.balance || 0;
                    return (
                      <tr key={acct.id} className="border-b border-[#F7F7FA] hover:bg-[#F7F7FA]">
                        <td className="py-2 px-3"><span className="text-[#6B6B72] mr-2">{acct.code}</span>{acct.name}</td>
                        <td className="py-2 px-3 text-right font-mono">{acct.normal_side === "debit" ? formatR(debits + bal) : debits > 0 ? formatR(debits) : "—"}</td>
                        <td className="py-2 px-3 text-right font-mono">{acct.normal_side === "credit" ? formatR(credits + bal) : credits > 0 ? formatR(credits) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#0F0F0F] font-semibold">
                    <td className="py-2 px-3">Total</td>
                    <td className="py-2 px-3 text-right font-mono">{formatR(transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0))}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatR(transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </ReportCard>
          </TabsContent>

          {/* Income Statement */}
          <TabsContent value="income_statement">
            <ReportCard title="Income Statement" date={moment().format("DD MMMM YYYY")}>
              <div className="space-y-4 text-[13px]">
                <div>
                  <h4 className="text-[12px] text-[#6B6B72] uppercase tracking-wider mb-2">Revenue</h4>
                  {accounts.filter(a => a.type === "income").map(a => (
                    <div key={a.id} className="flex justify-between py-1.5 px-3 hover:bg-[#F7F7FA] rounded">
                      <span>{a.name}</span>
                      <span className="font-mono">{formatR(transactions.filter(t => t.account_id === a.id).reduce((s, t) => s + t.amount, 0))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 px-3 font-semibold border-t border-[#E5E5E8] mt-1">
                    <span>Total Revenue</span><span className="font-mono">{formatR(totalIncome)}</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-[12px] text-[#6B6B72] uppercase tracking-wider mb-2">Expenses</h4>
                  {accounts.filter(a => a.type === "expense").map(a => (
                    <div key={a.id} className="flex justify-between py-1.5 px-3 hover:bg-[#F7F7FA] rounded">
                      <span>{a.name}</span>
                      <span className="font-mono">{formatR(transactions.filter(t => t.account_id === a.id).reduce((s, t) => s + t.amount, 0))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 px-3 font-semibold border-t border-[#E5E5E8] mt-1">
                    <span>Total Expenses</span><span className="font-mono">{formatR(totalExpenses)}</span>
                  </div>
                </div>
                <div className="flex justify-between py-3 px-3 font-semibold text-[16px] border-t-2 border-[#0F0F0F]">
                  <span>Net {netProfit >= 0 ? "Profit" : "Loss"}</span>
                  <span className={`font-mono ${netProfit >= 0 ? "text-[#22C55E]" : "text-red-500"}`}>{formatR(netProfit)}</span>
                </div>
              </div>
            </ReportCard>
          </TabsContent>

          {/* Balance Sheet */}
          <TabsContent value="balance_sheet">
            <ReportCard title="Balance Sheet" date={moment().format("DD MMMM YYYY")}>
              <div className="space-y-4 text-[13px]">
                <div>
                  <h4 className="text-[12px] text-[#6B6B72] uppercase tracking-wider mb-2">Assets</h4>
                  {accounts.filter(a => a.type === "asset").map(a => (
                    <div key={a.id} className="flex justify-between py-1.5 px-3 hover:bg-[#F7F7FA] rounded">
                      <span>{a.name}</span><span className="font-mono">{formatR(a.balance || 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 px-3 font-semibold border-t border-[#E5E5E8] mt-1">
                    <span>Total Assets</span><span className="font-mono">{formatR(totalAssets)}</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-[12px] text-[#6B6B72] uppercase tracking-wider mb-2">Liabilities</h4>
                  {accounts.filter(a => ["liability", "vat", "paye"].includes(a.type)).map(a => (
                    <div key={a.id} className="flex justify-between py-1.5 px-3 hover:bg-[#F7F7FA] rounded">
                      <span>{a.name}</span><span className="font-mono">{formatR(a.balance || 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 px-3 font-semibold border-t border-[#E5E5E8] mt-1">
                    <span>Total Liabilities</span><span className="font-mono">{formatR(totalLiabilities)}</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-[12px] text-[#6B6B72] uppercase tracking-wider mb-2">Equity</h4>
                  {accounts.filter(a => a.type === "equity").map(a => (
                    <div key={a.id} className="flex justify-between py-1.5 px-3 hover:bg-[#F7F7FA] rounded">
                      <span>{a.name}</span><span className="font-mono">{formatR(a.balance || 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 px-3 font-semibold border-t border-[#E5E5E8] mt-1">
                    <span>Total Equity</span><span className="font-mono">{formatR(totalEquity)}</span>
                  </div>
                </div>
              </div>
            </ReportCard>
          </TabsContent>

          {/* General Ledger */}
          <TabsContent value="general_ledger">
            <ReportCard title="General Ledger" date={moment().format("DD MMMM YYYY")}>
              {accounts.filter(a => transactions.some(t => t.account_id === a.id)).map(acct => (
                <div key={acct.id} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-2 px-3">
                    <span className="text-[12px] font-mono text-[#6B6B72]">{acct.code}</span>
                    <span className="text-[13px] font-medium text-[#0F0F0F]">{acct.name}</span>
                  </div>
                  <table className="w-full min-w-[440px] text-[12px]">
                    <thead>
                      <tr className="border-b border-[#E5E5E8]">
                        <th className="text-left py-1.5 px-3 text-[#6B6B72]">Date</th>
                        <th className="text-left py-1.5 px-3 text-[#6B6B72]">Description</th>
                        <th className="text-right py-1.5 px-3 text-[#6B6B72]">Debit</th>
                        <th className="text-right py-1.5 px-3 text-[#6B6B72]">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.filter(t => t.account_id === acct.id).sort((a, b) => new Date(a.date) - new Date(b.date)).map(t => (
                        <tr key={t.id} className="border-b border-[#F7F7FA]">
                          <td className="py-1.5 px-3 text-[#6B6B72]">{moment(t.date).format("DD/MM/YY")}</td>
                          <td className="py-1.5 px-3">{t.description}</td>
                          <td className="py-1.5 px-3 text-right font-mono">{t.type === "debit" ? formatR(t.amount) : "—"}</td>
                          <td className="py-1.5 px-3 text-right font-mono">{t.type === "credit" ? formatR(t.amount) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {transactions.filter(t => t.status !== "unallocated").length === 0 && (
                <p className="text-center text-[13px] text-[#6B6B72] py-8">No allocated transactions to display</p>
              )}
            </ReportCard>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ReportCard({ title, date, children }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E5E8] flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-medium text-[#0F0F0F]">{title}</h3>
          <p className="text-[11px] text-[#6B6B72] mt-0.5">As at {date}</p>
        </div>
      </div>
      <div className="overflow-x-auto p-4">{children}</div>
    </div>
  );
}