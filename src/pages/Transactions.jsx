import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import PullToRefresh from "@/components/PullToRefresh";
import { Search, Filter, Sparkles, ArrowUpRight, ArrowDownRight, Check, Loader2, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function Transactions() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTx, setSelectedTx] = useState(null);
  const [aiExplaining, setAiExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, accts] = await Promise.all([
        base44.entities.Transaction.filter({ company_id: currentCompany.id }, "-date", 50),
        base44.entities.Account.filter({ company_id: currentCompany.id })
      ]);
      setTransactions(txs);
      setAccounts(accts);
    } catch (e) {}
    setLoading(false);
  };

  const handleAllocate = async (txId, accountId) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    setAllocating(true);
    try {
      await base44.entities.Transaction.update(txId, {
        account_id: accountId,
        account_name: account.name,
        status: "allocated"
      });

      // Learn from this manual allocation — create a rule for future matching
      const tx = transactions.find(t => t.id === txId);
      if (tx?.description) {
        const keyword = tx.description.split(" ").slice(0, 3).join(" ").trim();
        if (keyword.length > 2) {
          try {
            await base44.entities.AllocationRule.create({
              company_id: currentCompany.id,
              match_field: "description",
              match_type: "contains",
              match_value: keyword,
              account_id: accountId,
              account_name: account.name,
              vat_applicable: account.type === "expense" || account.type === "income",
              is_active: true,
              source: "manual"
            });
          } catch (e) { /* duplicate rule — that's fine */ }
        }
      }

      await loadData();
      toast({ title: "Transaction allocated", description: "Rule learned for future transactions" });
    } catch (e) {
      toast({ title: "Error allocating", variant: "destructive" });
    }
    setAllocating(false);
  };

  const handleLearnRules = async () => {
    setAllocating(true);
    try {
      const res = await base44.functions.invoke("learnAllocationRules", { company_id: currentCompany.id });
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
      const result = await base44.integrations.Core.InvokeLLM({
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
4. Any compliance considerations`
      });
      setAiExplanation(result);
    } catch (e) {
      setAiExplanation("Unable to generate explanation. Please try again.");
    }
    setAiExplaining(false);
  };

  const handleBulkAllocate = async () => {
    setAllocating(true);
    try {
      const res = await base44.functions.invoke("applyAllocationRules", { company_id: currentCompany.id });
      toast({ title: res.data.message || `${res.data.allocated} transactions auto-allocated` });
      await loadData();
    } catch (e) {
      toast({ title: "Failed to apply rules", description: e.message, variant: "destructive" });
    }
    setAllocating(false);
  };

  const filtered = transactions
    .filter(t => statusFilter === "all" || t.status === statusFilter)
    .filter(t => !searchTerm || t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || t.reference?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "date") return dir * (new Date(a.date) - new Date(b.date));
      if (sortField === "amount") return dir * (a.amount - b.amount);
      return 0;
    });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Transactions</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">{transactions.length} transactions · {transactions.filter(t => t.status === "unallocated").length} unallocated</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleLearnRules} disabled={allocating}
            className="bg-white border border-[#E5E5E8] text-[#0F0F0F] hover:bg-[#F7F7FA] rounded-lg text-[13px] h-9">
            <Brain size={14} className="mr-1.5" /> Learn Rules
          </Button>
          <Button onClick={handleBulkAllocate} disabled={allocating}
            className="bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg text-[13px] h-9">
            <Sparkles size={14} className="mr-1.5" /> Apply Rules
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B72]" />
          <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search transactions..." className="pl-9 text-[13px]" />
        </div>
        <ResponsiveSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          placeholder="All Status"
          triggerClassName="w-40 text-[13px] h-9"
          triggerIcon={<Filter size={14} className="mr-2 text-[#6B6B72]" />}
          options={[
            { value: "all", label: "All Status" },
            { value: "unallocated", label: "Unallocated" },
            { value: "allocated", label: "Allocated" },
            { value: "reviewed", label: "Reviewed" },
          ]}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 size={24} className="animate-spin text-[#6B6B72] mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[#6B6B72]">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E5E8]">
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider cursor-pointer" onClick={() => toggleSort("date")}>
                    <span className="flex items-center gap-1">Date <SortIcon field="date" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider cursor-pointer" onClick={() => toggleSort("amount")}>
                    <span className="flex items-center justify-end gap-1">Amount <SortIcon field="amount" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => (
                  <tr key={tx.id} className="border-b border-[#F1F1F4] hover:bg-[#F7F7FA] transition-colors">
                    <td className="px-4 py-3 text-[#6B6B72] whitespace-nowrap">{moment(tx.date).format("DD MMM YY")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === "credit" ? "bg-green-50" : "bg-red-50"}`}>
                          {tx.type === "credit" ? <ArrowDownRight size={11} className="text-[#22C55E]" /> : <ArrowUpRight size={11} className="text-red-500" />}
                        </div>
                        <span className="text-[#0F0F0F] truncate max-w-[200px]">{tx.description}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${tx.type === "credit" ? "text-[#22C55E]" : "text-[#0F0F0F]"}`}>
                      {tx.type === "credit" ? "+" : "-"}R {Math.abs(tx.amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      {tx.status === "unallocated" && accounts.length > 0 ? (
                        <ResponsiveSelect
                          onValueChange={(v) => handleAllocate(tx.id, v)}
                          placeholder={tx.category || "Allocate..."}
                          triggerClassName="h-9 text-[12px] w-36"
                          options={accounts.map(a => ({ value: a.id, label: `${a.code} – ${a.name}` }))}
                        />
                      ) : (
                        <span className="text-[12px] text-[#6B6B72]">{tx.category || tx.account_name || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        tx.status === "allocated" ? "bg-green-50 text-green-700" :
                        tx.status === "reviewed" ? "bg-blue-50 text-blue-700" :
                        tx.status === "locked" ? "bg-gray-100 text-gray-700" :
                        "bg-amber-50 text-amber-700"
                      }`}>{tx.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleAIExplain(tx)}
                        className="text-[11px] text-[#3B82F6] hover:text-[#2563EB] font-medium">
                        Explain
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Explanation Dialog */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-medium flex items-center gap-2">
              <Sparkles size={16} className="text-[#3B82F6]" /> AI Transaction Analysis
            </DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4 mt-2">
              <div className="bg-[#F7F7FA] rounded-lg p-4 space-y-1.5 text-[13px]">
                <div className="flex justify-between"><span className="text-[#6B6B72]">Description</span><span className="text-[#0F0F0F] font-medium">{selectedTx.description}</span></div>
                <div className="flex justify-between"><span className="text-[#6B6B72]">Amount</span><span className="text-[#0F0F0F] font-medium">R {selectedTx.amount?.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between"><span className="text-[#6B6B72]">Category</span><span className="text-[#0F0F0F]">{selectedTx.category || "Unallocated"}</span></div>
                <div className="flex justify-between"><span className="text-[#6B6B72]">Confidence</span><span className="text-[#0F0F0F]">{selectedTx.ai_confidence || 0}%</span></div>
              </div>
              <div>
                {aiExplaining ? (
                  <div className="flex items-center gap-2 text-[13px] text-[#6B6B72] py-4">
                    <Loader2 size={14} className="animate-spin" /> Analyzing transaction...
                  </div>
                ) : aiExplanation ? (
                  <div className="text-[13px] text-[#0F0F0F] leading-relaxed whitespace-pre-wrap">{aiExplanation}</div>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </PullToRefresh>
  );
}