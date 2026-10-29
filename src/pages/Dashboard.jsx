import React, { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import {
  Building2, Upload, ScanLine, FileText, Calculator, Plus,
} from "lucide-react";
import CashFlowChart from "@/components/dashboard/CashFlowChart";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import AllocationProgress from "@/components/dashboard/AllocationProgress";
import RecentActivity from "@/components/dashboard/RecentActivity";
import Sparkline from "@/components/dashboard/Sparkline";
import { formatRand, formatPct } from "@/lib/money";

const PERIODS = [
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
  { key: "year", label: "Year", days: 365 },
];

const greetingFor = (hour) => {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

function KpiCard({ label, value, chip, chipTone, chipNote, series, color }) {
  return (
    <div className="sb-card" style={{ padding: 20 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="sb-label">{label}</p>
          <p className="sb-display sb-money mt-2 truncate" style={{ fontSize: 34, lineHeight: 1.05, color: "var(--sb-ink)" }}>
            {value}
          </p>
        </div>
        <div className="w-[86px] flex-none pt-1">
          <Sparkline values={series} color={color} height={30} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className={`sb-chip sb-chip-${chipTone}`}>{chip}</span>
        <span className="text-[11px]" style={{ color: "var(--sb-muted)" }}>{chipNote}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { currentCompany, user } = useOutletContext();
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");

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

  // ---- Existing calculations (unchanged) ----
  const credits = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + (t.amount || 0), 0);
  const debits = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + (t.amount || 0), 0);
  const bankBalance = credits - debits;
  const profit = credits - debits;
  const expenses = debits;
  const vatDue = transactions.reduce((s, t) => s + (t.vat_amount || 0), 0);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

  const thisWeekTxs = transactions.filter((t) => new Date(t.date) >= weekAgo);
  const lastWeekTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= twoWeeksAgo && d < weekAgo;
  });

  const thisWeekNet = thisWeekTxs.reduce((s, t) => s + (t.type === "credit" ? t.amount : -t.amount), 0);
  const lastWeekNet = lastWeekTxs.reduce((s, t) => s + (t.type === "credit" ? t.amount : -t.amount), 0);

  const pctChange = (curr, prev) => {
    if (prev === 0) return curr === 0 ? 0 : 100;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };
  const bankPct = pctChange(thisWeekNet, lastWeekNet);

  // Period-scoped change chips (Week / Month / Year segmented control)
  const activePeriod = PERIODS.find((p) => p.key === period) || PERIODS[0];
  const periodStart = new Date(now.getTime() - activePeriod.days * 86400000);
  const prevStart = new Date(now.getTime() - activePeriod.days * 2 * 86400000);
  const inWindow = (t, from, to) => {
    const d = new Date(t.date);
    return d >= from && d < to;
  };
  const currentWindow = transactions.filter((t) => inWindow(t, periodStart, now));
  const previousWindow = transactions.filter((t) => inWindow(t, prevStart, periodStart));
  const sumBy = (rows, pick) => rows.reduce((s, t) => s + pick(t), 0);
  const netOf = (t) => (t.type === "credit" ? (t.amount || 0) : -(t.amount || 0));

  const profitPct = pctChange(sumBy(currentWindow, netOf), sumBy(previousWindow, netOf));
  const vatPct = pctChange(sumBy(currentWindow, (t) => t.vat_amount || 0), sumBy(previousWindow, (t) => t.vat_amount || 0));
  const expensesPct = pctChange(
    sumBy(currentWindow, (t) => (t.type === "debit" ? t.amount || 0 : 0)),
    sumBy(previousWindow, (t) => (t.type === "debit" ? t.amount || 0 : 0))
  );

  // Chart data — group by month for current year
  const currentYear = now.getFullYear();
  const monthData = Array.from({ length: 12 }, (_, i) => ({ month: i, income: 0, expense: 0, vat: 0 }));
  transactions.forEach((t) => {
    const d = new Date(t.date);
    if (d.getFullYear() === currentYear) {
      if (t.type === "credit") monthData[d.getMonth()].income += t.amount || 0;
      else monthData[d.getMonth()].expense += t.amount || 0;
      monthData[d.getMonth()].vat += t.vat_amount || 0;
    }
  });
  const chartTotal = monthData.reduce((s, m) => s + m.income, 0);
  const chartMax = Math.max(...monthData.map((m) => Math.max(m.income, m.expense)), 2000);

  const thisMonthIndex = now.getMonth();
  const prevMonthIndex = thisMonthIndex === 0 ? 11 : thisMonthIndex - 1;
  const chartPct = pctChange(monthData[thisMonthIndex].income, monthData[prevMonthIndex].income);

  // Allocation progress
  const allocatedCount = transactions.filter((t) => t.status === "allocated" || t.status === "reviewed").length;
  const totalCount = transactions.length;
  const allocationPct = totalCount > 0 ? Math.round((allocatedCount / totalCount) * 100) : 0;

  const profitSeries = monthData.map((m) => m.income - m.expense);
  const vatSeries = monthData.map((m) => m.vat);
  const expenseSeries = monthData.map((m) => m.expense);

  const firstName = user?.full_name ? user.full_name.split(" ")[0] : null;
  const greetingName = firstName || currentCompany?.name || "there";

  if (!currentCompany) {
    return (
      <div className="sb-card flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--sb-soft)" }}>
          <Building2 size={28} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--sb-brand-2)" }} />
        </div>
        <h2 className="sb-display" style={{ fontSize: 28, color: "var(--sb-ink)" }}>Welcome to SmartBooks SA</h2>
        <p className="mt-2 max-w-md text-[13px]" style={{ color: "var(--sb-muted)" }}>
          Get started by adding your first company. You can manage multiple businesses from one account.
        </p>
        <Link to="/companies" className="sb-btn sb-btn-primary mt-6">
          <Plus size={15} strokeWidth={1.8} /> Add Company
        </Link>
      </div>
    );
  }

  const quickActions = [
    { label: "Upload", icon: Upload, path: "/upload", accent: true },
    { label: "Scan", icon: ScanLine, path: "/scan-receipt" },
    { label: "Reports", icon: FileText, path: "/reports" },
    { label: "Tax", icon: Calculator, path: "/tax" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Heading row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="sb-display" style={{ fontSize: 44, lineHeight: 1.05, color: "var(--sb-ink)" }}>
            {greetingFor(now.getHours())}, {greetingName}.
          </h1>
          <p className="mt-2 text-[13px]" style={{ color: "var(--sb-muted)" }}>
            {allocatedCount} of {totalCount} transactions allocated · {allocationPct}% of the ledger reconciled.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="sb-seg" role="group" aria-label="Dashboard period">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className="sb-seg-item"
                data-active={period === p.key ? "true" : "false"}
                aria-pressed={period === p.key}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Link to="/invoices" className="sb-btn sb-btn-primary">
            <Plus size={15} strokeWidth={1.8} strokeLinecap="round" /> New invoice
          </Link>
        </div>
      </div>

      {/* Row 1 — hero balance + KPIs */}
      <div className="sb-row-2col grid gap-4" style={{ gridTemplateColumns: "1.55fr 1fr" }}>
        <section
          className="sb-card relative flex flex-col overflow-hidden"
          style={{ background: "var(--sb-brand)", borderColor: "transparent", color: "#fff", padding: 28, borderRadius: 26 }}
        >
          {/* Concentric lime rings, top-right, 50% opacity */}
          <svg
            className="pointer-events-none absolute"
            style={{ right: -70, top: -90, opacity: 0.5 }}
            width="340"
            height="340"
            viewBox="0 0 340 340"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="200" cy="140" r="70" stroke="#C8F169" strokeWidth="1" />
            <circle cx="200" cy="140" r="110" stroke="#C8F169" strokeWidth="1" />
            <circle cx="200" cy="140" r="150" stroke="#C8F169" strokeWidth="1" />
          </svg>

          <p className="sb-label relative" style={{ color: "rgba(255,255,255,0.72)" }}>
            Bank balance · {currentCompany.name}
          </p>
          <p
            className="sb-display sb-money relative mt-3"
            style={{ fontSize: 68, lineHeight: 1, color: "#fff", letterSpacing: "-0.02em" }}
          >
            {formatRand(bankBalance)}
          </p>
          <div className="relative mt-4 flex items-center gap-2 flex-wrap">
            <span className="sb-chip" style={{ background: "var(--sb-lime)", color: "#0B1F1A" }}>
              {formatPct(bankPct)}
            </span>
            <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.7)" }}>vs last week</span>
          </div>

          <div className="relative mt-auto grid grid-cols-2 gap-2 pt-8 sm:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.path}
                className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-3 text-[13px] font-semibold transition-colors"
                style={
                  action.accent
                    ? { background: "var(--sb-lime)", color: "#0B1F1A" }
                    : { background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.16)" }
                }
              >
                <action.icon size={16} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
                {action.label}
              </Link>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-4">
          {loading ? (
            <>
              <div className="sb-card h-[118px] animate-pulse" />
              <div className="sb-card h-[118px] animate-pulse" />
              <div className="sb-card h-[118px] animate-pulse" />
            </>
          ) : (
            <>
              <KpiCard
                label="Profit"
                value={formatRand(profit)}
                chip={formatPct(profitPct)}
                chipTone={profitPct >= 0 ? "green" : "red"}
                chipNote={`vs last ${period}`}
                series={profitSeries}
                color="#1B7A4D"
              />
              <KpiCard
                label="VAT due"
                value={formatRand(vatDue)}
                chip={formatPct(vatPct)}
                chipTone="amber"
                chipNote={`vs last ${period}`}
                series={vatSeries}
                color="#B7791F"
              />
              <KpiCard
                label="Expenses"
                value={formatRand(expenses)}
                chip={formatPct(expensesPct)}
                chipTone={expensesPct > 0 ? "red" : "green"}
                chipNote={`vs last ${period}`}
                series={expenseSeries}
                color="#B03A2E"
              />
            </>
          )}
        </div>
      </div>

      {/* Row 2 — cash flow + allocation / activity */}
      <div className="sb-row-2col grid gap-4" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <CashFlowChart
          data={monthData}
          total={chartTotal}
          max={chartMax}
          pct={chartPct}
          loading={loading}
        />
        <div className="flex flex-col gap-4">
          <AllocationProgress
            allocated={allocatedCount}
            total={totalCount}
            pct={allocationPct}
            loading={loading}
          />
          <RecentActivity logs={auditLogs} loading={loading} />
        </div>
      </div>

      {/* Row 3 — recent transactions */}
      <RecentTransactions transactions={transactions} loading={loading} />
    </div>
  );
}
