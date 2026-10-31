import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import PullToRefresh from "@/components/PullToRefresh";
import TransactionListMobile from "@/components/transactions/TransactionListMobile";
import TransactionDetailSheet from "@/components/transactions/TransactionDetailSheet";
import {
  Search, Sparkles, Loader2, ChevronDown, ChevronUp, Brain,
  ArrowDownLeft, ArrowUpRight, Wand2, Eye, Zap,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import { formatRand } from "@/lib/money";
import { buildStatementSummary } from "@/lib/bankStatementExtraction";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unallocated", label: "Unallocated" },
  { value: "allocated", label: "Allocated" },
  { value: "reviewed", label: "Reviewed" },
];

const STATUS_CHIP = {
  allocated: "sb-chip sb-chip-green",
  reviewed: "sb-chip sb-chip-green",
  unallocated: "sb-chip sb-chip-amber",
  locked: "sb-chip sb-chip-red",
};

// Statements import "Uncategorized" when no keyword matches; that value must never
// mask the account the user actually picked for the transaction.
const isPlaceholderCategory = (category) =>
  !category || category.trim().toLowerCase() === "uncategorized";

const suggestedCategory = (tx) => (isPlaceholderCategory(tx.category) ? null : tx.category);

const categoryLabel = (tx) =>
  tx.account_name || suggestedCategory(tx) || null;

export default function Transactions() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [statements, setStatements] = useState([]);
  const [detailTx, setDetailTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statementFilter, setStatementFilter] = useState("all");
  const [selectedTx, setSelectedTx] = useState(null);
  const [aiExplaining, setAiExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    if (!currentCompany) return undefined;
    // A statement belongs to one company, so a switch starts from all statements.
    setStatementFilter("all");
    loadData();
    // Coming back to the tab catches up with imports and edits made elsewhere.
    const refresh = () => loadData(true);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [currentCompany]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [txs, accts, docs] = await Promise.all([
        db.entities.Transaction.filter({ company_id: currentCompany.id }, "-date", 2000),
        db.entities.Account.filter({ company_id: currentCompany.id }),
        db.entities.Document.filter(
          { company_id: currentCompany.id, type: "bank_statement" },
          "-created_date"
        ),
      ]);
      setTransactions(txs);
      setAccounts(accts);
      setStatements(docs);
    } catch (e) {}
    if (!silent) setLoading(false);
  };

  const handleAllocate = async (txId, accountId) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    const previous = transactions.find((t) => t.id === txId);
    const isEdit = previous?.status === "allocated" || previous?.status === "reviewed";
    setAllocating(true);
    try {
      const updated = await db.entities.Transaction.update(txId, {
        account_id: accountId,
        account_name: account.name,
        status: "allocated",
      });

      // The row updates in place — no reload, so the list never refreshes or flickers.
      setTransactions((list) => list.map((t) => (t.id === txId ? { ...t, ...updated } : t)));
      // Keep the open detail sheet in step with the row that was just allocated.
      setDetailTx((current) => (current && current.id === txId ? { ...current, ...updated } : current));

      // Learn from this manual allocation — create a rule for future matching
      const tx = previous;
      if (!isEdit && tx?.description) {
        const keyword = tx.description.split(" ").slice(0, 3).join(" ").trim();
        if (keyword.length > 2) {
          try {
            await db.entities.AllocationRule.create({
              company_id: currentCompany.id,
              match_field: "description",
              match_type: "contains",
              match_value: keyword,
              account_id: accountId,
              account_name: account.name,
              vat_applicable: account.type === "expense" || account.type === "income",
              is_active: true,
              source: "manual",
            });
          } catch (e) { /* duplicate rule — that's fine */ }
        }
      }

      toast({
        title: isEdit ? "Allocation updated" : "Transaction allocated",
        description: isEdit ? undefined : "Rule learned for future transactions",
      });
    } catch (e) {
      toast({ title: "Error allocating", variant: "destructive" });
    }
    setAllocating(false);
  };

  const handleLearnRules = async () => {
    setAllocating(true);
    try {
      const res = await db.functions.invoke("learnAllocationRules", { company_id: currentCompany.id });
      toast({ title: res.data.message || `${res.data.rules_created} rules learned` });
      await loadData();
    } catch (e) {
      toast({ title: "Failed to learn rules", description: e.message, variant: "destructive" });
    }
    setAllocating(false);
  };

  const handleAIExplain = async (tx) => {
    setSelectedTx(tx);
    setAiExplaining(true);
    setAiExplanation("");
    try {
      const result = await db.integrations.Core.InvokeLLM({
        prompt: `You are a South African chartered accountant. Explain why this transaction was categorized as "${tx.category}" and allocated to "${tx.account_name || "unallocated"}".

Transaction details:
- Date: ${tx.date}
- Description: ${tx.description}
- Amount: R ${tx.amount}
- Type: ${tx.type}
- Reference: ${tx.reference || "N/A"}
- AI Confidence: ${tx.ai_confidence}%

Previous AI reasoning: ${tx.ai_reasoning || "None"}

Provide a clear, professional explanation. Include:
1. Why this category is appropriate under SA GAAP/IFRS
2. The double-entry effect (which accounts are debited/credited)
3. VAT implications at 15%
4. Any compliance considerations`,
      });
      setAiExplanation(result);
    } catch (e) {
      setAiExplanation("Unable to generate explanation. Please try again.");
    }
    setAiExplaining(false);
  };

  // Allocates every unallocated transaction through the company's allocation
  // rules — the same engine the Rules page uses, so "Learn Rules" feeds it.
  const handleAutoAllocate = async () => {
    const pending = transactions.filter((t) => t.status !== "allocated" && t.status !== "reviewed");
    if (pending.length === 0) {
      toast({ title: "Nothing to allocate", description: "Every transaction is already allocated." });
      return;
    }
    setAllocating(true);
    try {
      const res = await db.functions.invoke("applyAllocationRules", { company_id: currentCompany.id });
      const allocated = res.data?.allocated ?? 0;
      toast({
        title: res.data?.message || `${allocated} transactions auto-allocated`,
        variant: allocated > 0 ? undefined : "destructive",
      });
      await loadData();
    } catch (e) {
      toast({ title: "Auto allocate failed", description: e.message, variant: "destructive" });
    } finally {
      setAllocating(false);
    }
  };

  const filtered = transactions
    .filter((t) => statusFilter === "all" || t.status === statusFilter)
    .filter((t) => statementFilter === "all" || t.document_id === statementFilter)
    .filter((t) => !searchTerm || t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || t.reference?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "date") return dir * (new Date(a.date) - new Date(b.date));
      if (sortField === "amount") return dir * (a.amount - b.amount);
      return 0;
    });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  if (!currentCompany) return <p className="py-20 text-center text-[13px]" style={{ color: "var(--sb-muted)" }}>Select a company first</p>;

  const moneyIn = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + (t.amount || 0), 0);
  const moneyOut = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + (t.amount || 0), 0);
  const unallocatedCount = transactions.filter((t) => t.status === "unallocated").length;

  // One summary per uploaded statement: the balances and totals it printed, or — when
  // it printed none — the same figures calculated from its imported rows.
  const statementSummaries = statements
    .map((doc) => {
      let stored = {};
      try { stored = JSON.parse(doc.extracted_data || "{}") || {}; } catch (e) { stored = {}; }
      const rows = transactions
        .filter((t) => t.document_id === doc.id)
        .map((t) => ({
          ...t,
          amount: t.type === "credit" ? Math.abs(t.amount || 0) : -Math.abs(t.amount || 0),
        }));
      return { doc, rows, summary: buildStatementSummary(rows, stored) };
    })
    .filter((item) => item.rows.length > 0);

  // Only statements that actually imported transactions are worth filtering by.
  const statementOptions = [
    { value: "all", label: "All statements" },
    ...statementSummaries.map(({ doc, rows }) => ({
      value: doc.id,
      label: `${doc.name} (${rows.length})`,
    })),
  ];

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="flex flex-col gap-5">
        {/* Heading */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="sb-display" style={{ fontSize: 44, lineHeight: 1.05, color: "var(--sb-ink)" }}>
              Every rand, accounted for.
            </h1>
            <p className="mt-2 text-[13px]" style={{ color: "var(--sb-muted)" }}>
              {transactions.length} transactions · {unallocatedCount} unallocated
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleAutoAllocate} disabled={allocating} className="sb-btn sb-btn-primary">
              {allocating
                ? <Loader2 size={15} className="animate-spin" />
                : <Zap size={15} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />}
              Auto allocate
            </button>
            <button type="button" onClick={handleLearnRules} disabled={allocating} className="sb-btn sb-btn-outline">
              <Brain size={15} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" /> Learn Rules
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sb-card" style={{ padding: 20 }}>
            <div className="flex items-center justify-between gap-3">
              <p className="sb-label">Money in</p>
              <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "var(--sb-green-bg)", color: "var(--sb-green-ink)" }}>
                <ArrowDownLeft size={17} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </span>
            </div>
            <p className="sb-display sb-money mt-3" style={{ fontSize: 34, lineHeight: 1.05, color: "var(--sb-green-ink)" }}>
              {formatRand(moneyIn)}
            </p>
          </div>

          <div className="sb-card" style={{ padding: 20 }}>
            <div className="flex items-center justify-between gap-3">
              <p className="sb-label">Money out</p>
              <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "var(--sb-soft)", color: "var(--sb-muted)" }}>
                <ArrowUpRight size={17} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </span>
            </div>
            <p className="sb-display sb-money mt-3" style={{ fontSize: 34, lineHeight: 1.05, color: "var(--sb-ink)" }}>
              {formatRand(moneyOut)}
            </p>
          </div>

          <div className="sb-card" style={{ padding: 20, background: "var(--sb-brand)", borderColor: "transparent", color: "#fff" }}>
            <div className="flex items-center justify-between gap-3">
              <p className="sb-label" style={{ color: "rgba(255,255,255,0.72)" }}>AI suggestions ready</p>
              <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "rgba(200,241,105,0.18)", color: "var(--sb-lime)" }}>
                <Wand2 size={17} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </span>
            </div>
            <p className="sb-display sb-money mt-3" style={{ fontSize: 34, lineHeight: 1.05, color: "#fff" }}>
              {unallocatedCount}
              <span className="ml-2 text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.72)" }}>to review</span>
            </p>
          </div>
        </div>

        {/* Statement summaries */}
        {statementSummaries.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="sb-display" style={{ fontSize: 22, lineHeight: 1.1, color: "var(--sb-ink)" }}>
                Statement summaries
              </h2>
              <p className="text-[12px]" style={{ color: "var(--sb-muted)" }}>
                Opening and closing balances for each uploaded statement
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {statementSummaries.map(({ doc, rows, summary }) => (
                <div key={doc.id} className="sb-card" style={{ padding: 20 }}>
                  <p className="truncate text-[13px] font-semibold" style={{ color: "var(--sb-ink)" }}>{doc.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--sb-muted)" }}>
                    {moment(doc.created_date).format("DD MMM YYYY")} · {rows.length} transactions
                  </p>
                  <h3 className="sb-display mt-3" style={{ fontSize: 18, color: "var(--sb-ink)" }}>Summary</h3>
                  <div className="mt-2" style={{ borderTop: "1px solid var(--sb-border)" }}>
                    {[
                      { label: "Opening balance", value: summary.opening_balance },
                      { label: "Total Credit", value: summary.total_credit },
                      { label: "Total Debit", value: summary.total_debit },
                      { label: "Total Fees*", value: summary.total_fees },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between py-2 text-[12.5px]"
                        style={{ borderBottom: "1px solid var(--sb-border)" }}
                      >
                        <span style={{ color: "var(--sb-muted)" }}>{row.label}</span>
                        <span className="sb-money font-semibold" style={{ color: "var(--sb-ink)" }}>{formatRand(row.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 text-[12.5px]">
                      <span style={{ color: "var(--sb-ink)" }}>Closing balance</span>
                      <span className="sb-money font-semibold" style={{ color: "var(--sb-ink)" }}>{formatRand(summary.closing_balance)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main card */}
        <div className="sb-card" style={{ padding: 0 }}>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: "1px solid var(--sb-border)" }}>
            <div className="sb-seg" role="group" aria-label="Filter transactions by status">
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
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-[220px]">
                <ResponsiveSelect
                  value={statementFilter}
                  onValueChange={setStatementFilter}
                  placeholder="All statements"
                  triggerClassName="h-9 text-[12px] w-full"
                  options={statementOptions}
                />
              </div>
              <div className="relative w-full sm:w-[260px]">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--sb-muted)" }} />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search transactions..."
                  className="pl-9"
                  aria-label="Search transactions"
                />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--sb-muted)" }}>
                Sorted by {sortField === "date" ? "date" : "amount"}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center"><Loader2 size={22} className="mx-auto animate-spin" style={{ color: "var(--sb-muted)" }} /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="sb-display" style={{ fontSize: 28, color: "var(--sb-ink)" }}>Nothing to review here.</p>
              <p className="mt-1 text-[13px]" style={{ color: "var(--sb-muted)" }}>
                No transactions match this filter. Try another status or clear your search.
              </p>
            </div>
          ) : (
            <>
              {/* Phones: a banking-style feed; every row opens the full record. */}
              <TransactionListMobile transactions={filtered} onOpen={setDetailTx} />

              {/* Tablet and up: the dense ledger, scrolling sideways when needed. */}
              <div className="sb-table-scroll hidden md:block">
              <table className="w-full min-w-[860px] text-[13px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--sb-border)" }}>
                    <th className="sb-label px-5 py-3 text-left">Description</th>
                    <th className="sb-label cursor-pointer px-5 py-3 text-left" onClick={() => toggleSort("date")}>
                      <span className="inline-flex items-center gap-1">Date <SortIcon field="date" /></span>
                    </th>
                    <th className="sb-label cursor-pointer px-5 py-3 text-right" onClick={() => toggleSort("amount")}>
                      <span className="inline-flex items-center justify-end gap-1">Amount <SortIcon field="amount" /></span>
                    </th>
                    <th className="sb-label px-5 py-3 text-left">Category</th>
                    <th className="sb-label px-5 py-3 text-left">Status</th>
                    <th className="sb-label px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => {
                    const isIn = tx.type === "credit";
                    const suggested = suggestedCategory(tx);
                    const hasSuggestion = tx.status === "unallocated" && suggested && tx.ai_confidence;
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
                          {accounts.length > 0 ? (
                            <div className="w-[210px]">
                              <ResponsiveSelect
                                value={tx.account_id || undefined}
                                onValueChange={(v) => handleAllocate(tx.id, v)}
                                placeholder={categoryLabel(tx) || "Allocate..."}
                                triggerClassName="h-9 text-[12px] w-full"
                                options={accounts.map((a) => ({ value: a.id, label: `${a.code} – ${a.name}` }))}
                              />
                              {hasSuggestion && (
                                <p className="mt-1 flex items-center gap-1 text-[10.5px]" style={{ color: "var(--sb-brand-2)" }}>
                                  <Sparkles size={10} strokeWidth={2} /> AI suggests {suggested} · {tx.ai_confidence}%
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[12px] font-semibold" style={{ color: "var(--sb-ink)" }}>
                              {categoryLabel(tx) || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={STATUS_CHIP[tx.status] || "sb-chip sb-chip-amber"}>{tx.status}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailTx(tx)}
                              aria-label={`View details for ${tx.description}`}
                              className="grid h-8 w-8 place-items-center rounded-full transition-opacity hover:opacity-70"
                              style={{ border: "1px solid var(--sb-border)", color: "var(--sb-muted)", background: "transparent" }}
                            >
                              <Eye size={15} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAIExplain(tx)}
                              className="text-[12px] font-semibold transition-opacity hover:opacity-70"
                              style={{ color: "#1F6FD1", background: "transparent", border: 0, textDecoration: "none" }}
                            >
                              Explain
                            </button>
                          </div>
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

        {/* AI Explanation Dialog */}
        <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="sb-display flex items-center gap-2" style={{ fontSize: 24, fontWeight: 400 }}>
                <Sparkles size={16} style={{ color: "var(--sb-brand-2)" }} /> AI Transaction Analysis
              </DialogTitle>
            </DialogHeader>
            {selectedTx && (
              <div className="mt-2 space-y-4">
                <div className="space-y-1.5 rounded-[16px] p-4 text-[13px]" style={{ background: "var(--sb-soft)" }}>
                  <div className="flex justify-between gap-4"><span style={{ color: "var(--sb-muted)" }}>Description</span><span className="font-semibold" style={{ color: "var(--sb-ink)" }}>{selectedTx.description}</span></div>
                  <div className="flex justify-between gap-4"><span style={{ color: "var(--sb-muted)" }}>Amount</span><span className="sb-money font-semibold" style={{ color: "var(--sb-ink)" }}>{formatRand(selectedTx.amount)}</span></div>
                  <div className="flex justify-between gap-4"><span style={{ color: "var(--sb-muted)" }}>Category</span><span style={{ color: "var(--sb-ink)" }}>{categoryLabel(selectedTx) || "Unallocated"}</span></div>
                  <div className="flex justify-between gap-4"><span style={{ color: "var(--sb-muted)" }}>Confidence</span><span style={{ color: "var(--sb-ink)" }}>{selectedTx.ai_confidence || 0}%</span></div>
                </div>
                <div>
                  {aiExplaining ? (
                    <div className="flex items-center gap-2 py-4 text-[13px]" style={{ color: "var(--sb-muted)" }}>
                      <Loader2 size={14} className="animate-spin" /> Analyzing transaction...
                    </div>
                  ) : aiExplanation ? (
                    <div className="whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: "var(--sb-ink)" }}>{aiExplanation}</div>
                  ) : null}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Transaction detail sheet — full record plus allocation controls */}
        <TransactionDetailSheet
          tx={detailTx}
          onClose={() => setDetailTx(null)}
          accounts={accounts}
          statements={statements}
          onAllocate={handleAllocate}
          onExplain={(tx) => { setDetailTx(null); handleAIExplain(tx); }}
          allocating={allocating}
        />
      </div>
    </PullToRefresh>
  );
}
