import React, { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Building2, Wallet, TrendingUp, Calculator, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/dashboard/StatCard";
import CashFlowChart from "@/components/dashboard/CashFlowChart";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import CompanyCard from "@/components/dashboard/CompanyCard";
import AllocationProgress from "@/components/dashboard/AllocationProgress";
import RecentActivity from "@/components/dashboard/RecentActivity";

export default function Dashboard() {
  const { currentCompany, portal, scale } = useOutletContext();
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, logs] = await Promise.all([
        db.entities.Transaction.filter(
          { company_id: currentCompany.id },
          { sort: "-date", limit: 200 }
        ),
        db.entities.AuditLog.filter(
          { company_id: currentCompany.id },
          { sort: "-created_date", limit: 5 }
        ),
      ]);
      setTransactions(txs.items || txs);
      setAuditLogs(logs.items || logs);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Calculations
  const credits = transactions.filter(t => t.type === "credit").reduce((s, t) => s + (t.amount || 0), 0);
  const debits = transactions.filter(t => t.type === "debit").reduce((s, t) => s + (t.amount || 0), 0);
  const bankBalance = credits - debits;
  const profit = credits - debits;
  const expenses = debits;
  const vatDue = transactions.reduce((s, t) => s + (t.vat_amount || 0), 0);

  // Weekly comparison
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

  const thisWeekTxs = transactions.filter(t => new Date(t.date) >= weekAgo);
  const lastWeekTxs = transactions.filter(t => {
    const d = new Date(t.date);
    return d >= twoWeeksAgo && d < weekAgo;
  });

  const thisWeekNet = thisWeekTxs.reduce((s, t) => s + (t.type === "credit" ? t.amount : -t.amount), 0);
  const lastWeekNet = lastWeekTxs.reduce((s, t) => s + (t.type === "credit" ? t.amount : -t.amount), 0);
  const thisWeekExpenses = thisWeekTxs.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const lastWeekExpenses = lastWeekTxs.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const thisWeekVat = thisWeekTxs.reduce((s, t) => s + (t.vat_amount || 0), 0);
  const lastWeekVat = lastWeekTxs.reduce((s, t) => s + (t.vat_amount || 0), 0);

  const pctChange = (curr, prev) => {
    if (prev === 0) return curr === 0 ? 0 : 100;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const bankPct = pctChange(thisWeekNet, lastWeekNet);
  const profitPct = pctChange(thisWeekNet, lastWeekNet);
  const vatPct = pctChange(thisWeekVat, lastWeekVat);
  const expensesPct = pctChange(thisWeekExpenses, lastWeekExpenses);

  const formatR = (v) => `R ${Math.abs(v).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  // Chart data — group by month for current year
  const currentYear = now.getFullYear();
  const monthData = Array.from({ length: 12 }, (_, i) => ({ month: i, income: 0, expense: 0 }));
  transactions.forEach(t => {
    const d = new Date(t.date);
    if (d.getFullYear() === currentYear) {
      if (t.type === "credit") monthData[d.getMonth()].income += t.amount || 0;
      else monthData[d.getMonth()].expense += t.amount || 0;
    }
  });
  const chartTotal = monthData.reduce((s, m) => s + m.income, 0);
  const chartMax = Math.max(...monthData.map(m => Math.max(m.income, m.expense)), 2000);

  // Allocation progress
  const allocatedCount = transactions.filter(t => t.status === "allocated" || t.status === "reviewed").length;
  const totalCount = transactions.length;
  const allocationPct = totalCount > 0 ? Math.round((allocatedCount / totalCount) * 100) : 0;

  if (!currentCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-[#e9f3ea] border border-[#e4ebe5] flex items-center justify-center mb-4">
          <Building2 size={28} className="text-[#4A7C5E]" strokeWidth={1.5} />
        </div>
        <h2 className="text-[20px] font-semibold text-[#1A2E22]">Welcome to SmartBooks SA</h2>
        <p className="text-[14px] text-[#5C7263] mt-2 max-w-md">
          Get started by adding your first company. You can manage multiple businesses from one account.
        </p>
        <Link to="/companies">
          <Button className="mt-6 bg-[#2D5A43] hover:bg-[#1F4030] text-white rounded-[9px]">
            Add Company
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
      {/* Left column */}
      <div className="flex flex-col gap-4 min-w-0">
        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-4 gap-[14px]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-[14px] border border-[#e4ebe5] p-4 animate-pulse h-[120px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-[14px]">
            <StatCard
              label="Bank Balance"
              value={formatR(bankBalance)}
              icon={Wallet}
              iconColor="#B8915A"
              iconBg="#fbf1e1"
              trend={bankPct}
              pillType={bankPct >= 0 ? "green" : "red"}
            />
            <StatCard
              label="Profit"
              value={formatR(profit)}
              icon={TrendingUp}
              iconColor="#4a7fb5"
              iconBg="#e6eff8"
              trend={profitPct}
              pillType={profitPct >= 0 ? "green" : "red"}
            />
            <StatCard
              label="VAT Due"
              value={formatR(vatDue)}
              icon={Calculator}
              iconColor="#8a6bb8"
              iconBg="#efe9f8"
              trend={vatPct}
              pillType="gold"
            />
            <StatCard
              label="Expenses"
              value={formatR(expenses)}
              icon={Receipt}
              iconColor="#C25B5B"
              iconBg="#fbe9e9"
              trend={expensesPct}
              pillType={expensesPct >= 0 ? "red" : "green"}
            />
          </div>
        )}

        {/* Chart */}
        <CashFlowChart data={monthData} total={chartTotal} max={chartMax} scale={scale} loading={loading} />

        {/* Recent Transactions */}
        <RecentTransactions transactions={transactions} loading={loading} />
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        <CompanyCard company={currentCompany} bankBalance={bankBalance} formatR={formatR} portal={portal} />
        <AllocationProgress allocated={allocatedCount} total={totalCount} pct={allocationPct} loading={loading} />
        <RecentActivity logs={auditLogs} loading={loading} />
      </div>
    </div>
  );
}