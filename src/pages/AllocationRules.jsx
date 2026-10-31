import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Plus, Trash2, Loader2, Brain, Zap, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AllocationRuleCards from "@/components/mobile/AllocationRuleCards";

export default function AllocationRules() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [rules, setRules] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [learning, setLearning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState({ match_field: "description", match_type: "contains", match_value: "", account_id: "", vat_applicable: false });

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([
        db.entities.AllocationRule.filter({ company_id: currentCompany.id }, '-times_applied'),
        db.entities.Account.filter({ company_id: currentCompany.id, is_active: true })
      ]);
      setRules(r);
      setAccounts(a);
    } catch (e) {}
    setLoading(false);
  };

  const handleLearn = async () => {
    setLearning(true);
    try {
      const res = await db.functions.invoke('learnAllocationRules', { company_id: currentCompany.id });
      toast({ title: res.data.message || `${res.data.rules_created} rules learned` });
      await loadData();
    } catch (e) {
      toast({ title: "Failed to learn rules", description: e.message, variant: "destructive" });
    }
    setLearning(false);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await db.functions.invoke('applyAllocationRules', { company_id: currentCompany.id });
      toast({ title: res.data.message || `${res.data.allocated} transactions allocated` });
    } catch (e) {
      toast({ title: "Failed to apply rules", description: e.message, variant: "destructive" });
    }
    setApplying(false);
  };

  const handleToggle = async (ruleId, current) => {
    try {
      await db.entities.AllocationRule.update(ruleId, { is_active: !current });
      setRules(rules.map(r => r.id === ruleId ? { ...r, is_active: !current } : r));
    } catch (e) {
      toast({ title: "Error updating rule", variant: "destructive" });
    }
  };

  const handleDelete = async (ruleId) => {
    try {
      await db.entities.AllocationRule.delete(ruleId);
      setRules(rules.filter(r => r.id !== ruleId));
      toast({ title: "Rule deleted" });
    } catch (e) {
      toast({ title: "Error deleting rule", variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!newRule.match_value || !newRule.account_id) {
      toast({ title: "Fill in all fields", variant: "destructive" });
      return;
    }
    const account = accounts.find(a => a.id === newRule.account_id);
    try {
      await db.entities.AllocationRule.create({
        company_id: currentCompany.id,
        match_field: newRule.match_field,
        match_type: newRule.match_type,
        match_value: newRule.match_value,
        account_id: newRule.account_id,
        account_name: account?.name || "",
        vat_applicable: newRule.vat_applicable,
        is_active: true,
        source: "manual"
      });
      toast({ title: "Rule created" });
      setNewRule({ match_field: "description", match_type: "contains", match_value: "", account_id: "", vat_applicable: false });
      setShowForm(false);
      await loadData();
    } catch (e) {
      toast({ title: "Error creating rule", variant: "destructive" });
    }
  };

  const aiRules = rules.filter(r => r.source === "ai_learned");
  const manualRules = rules.filter(r => r.source === "manual");
  const totalApplied = rules.reduce((sum, r) => sum + (r.times_applied || 0), 0);

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Allocation Rules</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">{rules.length} rules · {totalApplied} total applications</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleLearn} disabled={learning}
            className="bg-white border border-[#E5E5E8] text-[#0F0F0F] hover:bg-[#F7F7FA] rounded-lg text-[13px] h-9">
            {learning ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Learning...</> : <><Brain size={14} className="mr-1.5" /> Learn from History</>}
          </Button>
          <Button onClick={handleApply} disabled={applying}
            className="bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg text-[13px] h-9">
            {applying ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Applying...</> : <><Zap size={14} className="mr-1.5" /> Apply to Unallocated</>}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-4">
          <div className="flex items-center gap-2 text-[#6B6B72] mb-1"><Sparkles size={14} /><span className="text-[11px] uppercase tracking-wider">Total Rules</span></div>
          <p className="text-[20px] font-semibold text-[#0F0F0F]">{rules.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-4">
          <div className="flex items-center gap-2 text-[#6B6B72] mb-1"><Brain size={14} /><span className="text-[11px] uppercase tracking-wider">AI Learned</span></div>
          <p className="text-[20px] font-semibold text-[#0F0F0F]">{aiRules.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-4">
          <div className="flex items-center gap-2 text-[#6B6B72] mb-1"><Plus size={14} /><span className="text-[11px] uppercase tracking-wider">Manual</span></div>
          <p className="text-[20px] font-semibold text-[#0F0F0F]">{manualRules.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-4">
          <div className="flex items-center gap-2 text-[#6B6B72] mb-1"><TrendingUp size={14} /><span className="text-[11px] uppercase tracking-wider">Times Applied</span></div>
          <p className="text-[20px] font-semibold text-[#0F0F0F]">{totalApplied}</p>
        </div>
      </div>

      {/* New Rule Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-5 space-y-3">
          <h3 className="text-[15px] font-medium text-[#0F0F0F]">New Manual Rule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Select value={newRule.match_field} onValueChange={v => setNewRule({ ...newRule, match_field: v })}>
              <SelectTrigger className="text-[13px]"><SelectValue placeholder="Match Field" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="description">Description</SelectItem>
                <SelectItem value="reference">Reference</SelectItem>
                <SelectItem value="supplier_name">Supplier Name</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newRule.match_type} onValueChange={v => setNewRule({ ...newRule, match_type: v })}>
              <SelectTrigger className="text-[13px]"><SelectValue placeholder="Match Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="exact">Exact</SelectItem>
                <SelectItem value="starts_with">Starts With</SelectItem>
              </SelectContent>
            </Select>
            <Input value={newRule.match_value} onChange={e => setNewRule({ ...newRule, match_value: e.target.value })}
              placeholder="Value to match..." className="text-[13px]" />
            <Select value={newRule.account_id} onValueChange={v => setNewRule({ ...newRule, account_id: v })}>
              <SelectTrigger className="text-[13px]"><SelectValue placeholder="Target Account" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.id} value={a.id} className="text-[12px]">{a.code} – {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[13px] text-[#0F0F0F] cursor-pointer">
              <Switch checked={newRule.vat_applicable} onCheckedChange={v => setNewRule({ ...newRule, vat_applicable: v })} />
              VAT applicable (15%)
            </label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="text-[13px] h-9 rounded-lg">Cancel</Button>
              <Button onClick={handleCreate} className="bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white text-[13px] h-9 rounded-lg">Create Rule</Button>
            </div>
          </div>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="p-8 text-center"><Loader2 size={24} className="animate-spin text-[#6B6B72] mx-auto" /></div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-12 text-center">
          <AlertCircle size={28} className="text-[#6B6B72] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[14px] font-medium text-[#0F0F0F]">No allocation rules yet</p>
          <p className="text-[12px] text-[#6B6B72] mt-1">Click "Learn from History" to auto-generate rules from past allocations, or create one manually.</p>
          <Button onClick={() => setShowForm(true)} className="mt-4 bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white text-[13px] h-9 rounded-lg">
            <Plus size={14} className="mr-1.5" /> Create Rule
          </Button>
        </div>
      ) : (
        <>
        <AllocationRuleCards rules={rules} onDelete={handleDelete} onToggle={handleToggle} />
        {!showForm && (
          <Button onClick={() => setShowForm(true)} variant="outline" className="w-full text-[13px] h-10 rounded-lg md:hidden">
            <Plus size={14} className="mr-1.5" /> Add Manual Rule
          </Button>
        )}
        <div className="hidden bg-white rounded-xl border border-[#E5E5E8] overflow-hidden md:block">
          {!showForm && (
            <div className="px-4 py-3 border-b border-[#E5E5E8]">
              <Button onClick={() => setShowForm(true)} variant="outline" className="text-[13px] h-8 rounded-lg">
                <Plus size={14} className="mr-1.5" /> Add Manual Rule
              </Button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E5E8]">
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Match</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Target Account</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Source</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Applied</th>
                  <th className="text-center px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Active</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id} className="border-b border-[#F1F1F4] hover:bg-[#F7F7FA] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F1F4] text-[#6B6B72] font-medium">{rule.match_field}</span>
                        <span className="text-[10px] text-[#6B6B72]">{rule.match_type}</span>
                        <span className="text-[#0F0F0F] font-medium">"{rule.match_value}"</span>
                        {rule.vat_applicable && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">VAT</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#0F0F0F]">{rule.account_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={rule.source === "ai_learned" ? "sb-chip sb-chip-blue" : "sb-chip"}>
                        {rule.source === "ai_learned" ? "AI Learned" : "Manual"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#6B6B72]">{rule.times_applied || 0}×</td>
                    <td className="px-4 py-3 text-center">
                      <Switch checked={rule.is_active} onCheckedChange={() => handleToggle(rule.id, rule.is_active)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(rule.id)} className="text-[#6B6B72] hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}