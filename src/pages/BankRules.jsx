import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Loader2, Zap, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { testRule } from "@/lib/bankRuleEngine";

export default function BankRules() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [rules, setRules] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({ keyword: "", target_ledger_account_id: "", vat_code: "standard", priority: 0 });
  const [testKeyword, setTestKeyword] = useState("");
  const [testSample, setTestSample] = useState("");
  const [testResult, setTestResult] = useState(null);

  useEffect(() => { if (currentCompany) loadData(); }, [currentCompany]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([
        db.entities.BankRule.filter({ company_id: currentCompany.id }, "-priority"),
        db.entities.Account.filter({ company_id: currentCompany.id, is_active: true }),
      ]);
      setRules(r);
      setAccounts(a);
    } catch (e) {}
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.keyword || !form.target_ledger_account_id) {
      toast({ title: "Keyword and target account are required", variant: "destructive" });
      return;
    }
    const account = accounts.find(a => a.id === form.target_ledger_account_id);
    const payload = {
      company_id: currentCompany.id,
      keyword: form.keyword,
      target_ledger_account_id: form.target_ledger_account_id,
      target_account_name: account?.name || "",
      vat_code: form.vat_code,
      priority: form.priority || 0,
      is_active: true,
    };
    try {
      if (editingRule) {
        await db.entities.BankRule.update(editingRule, payload);
      } else {
        await db.entities.BankRule.create(payload);
      }
      setDialogOpen(false);
      setEditingRule(null);
      setForm({ keyword: "", target_ledger_account_id: "", vat_code: "standard", priority: 0 });
      await loadData();
      toast({ title: editingRule ? "Rule updated" : "Rule created" });
    } catch (e) {
      toast({ title: "Error saving rule", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule.id);
    setForm({
      keyword: rule.keyword,
      target_ledger_account_id: rule.target_ledger_account_id,
      vat_code: rule.vat_code,
      priority: rule.priority || 0,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await db.entities.BankRule.delete(id);
      setRules(rules.filter(r => r.id !== id));
      toast({ title: "Rule deleted" });
    } catch (e) {
      toast({ title: "Error deleting", variant: "destructive" });
    }
  };

  const handleToggle = async (id, current) => {
    try {
      await db.entities.BankRule.update(id, { is_active: !current });
      setRules(rules.map(r => r.id === id ? { ...r, is_active: !current } : r));
    } catch (e) {}
  };

  const runTest = () => {
    const result = testRule(testKeyword, testSample);
    setTestResult(result);
  };

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Bank Rules</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">Keyword-based auto-allocation rules for bank transactions</p>
        </div>
        <div className="flex flex-none flex-wrap gap-2">
          <Button onClick={() => setTestOpen(true)} variant="outline" className="text-[13px] h-9 rounded-lg">
            <Search size={14} className="mr-1.5" /> Test Rule
          </Button>
          <Button onClick={() => { setEditingRule(null); setForm({ keyword: "", target_ledger_account_id: "", vat_code: "standard", priority: 0 }); setDialogOpen(true); }}
            className="bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg text-[13px] h-9">
            <Plus size={14} className="mr-1.5" /> New Rule
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-[#6B6B72] mx-auto" /></div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-12 text-center">
          <Zap size={32} className="text-[#6B6B72] mx-auto mb-3" strokeWidth={1} />
          <p className="text-[15px] font-medium text-[#0F0F0F]">No bank rules yet</p>
          <p className="text-[13px] text-[#6B6B72] mt-1">Create keyword rules to auto-allocate transactions on upload</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E5E8]">
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Keyword</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Target Account</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">VAT Code</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Priority</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Matched</th>
                  <th className="text-center px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Active</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id} className="border-b border-[#F1F1F4] hover:bg-[#F7F7FA] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#0F0F0F]">"{rule.keyword}"</td>
                    <td className="px-4 py-3 text-[#0F0F0F]">{rule.target_account_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">
                        {rule.vat_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#6B6B72]">{rule.priority || 0}</td>
                    <td className="px-4 py-3 text-right text-[#6B6B72]">{rule.match_count || 0}×</td>
                    <td className="px-4 py-3 text-center">
                      <Switch checked={rule.is_active} onCheckedChange={() => handleToggle(rule.id, rule.is_active)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(rule)} className="text-[#6B6B72] hover:text-[#0F0F0F] p-1 mr-1">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(rule.id)} className="text-[#6B6B72] hover:text-red-500 p-1">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-[16px]">{editingRule ? "Edit Rule" : "New Bank Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[12px] text-[#6B6B72]">Keyword</Label>
              <Input value={form.keyword} onChange={e => setForm({ ...form, keyword: e.target.value })}
                placeholder="e.g. Pick n Pay, FNB Fee, Salary" className="mt-1 text-[13px]" />
              <p className="text-[11px] text-[#6B6B72] mt-1">Transactions with this text in their description will be matched</p>
            </div>
            <div>
              <Label className="text-[12px] text-[#6B6B72]">Target Ledger Account</Label>
              <Select value={form.target_ledger_account_id} onValueChange={v => setForm({ ...form, target_ledger_account_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} – {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] text-[#6B6B72]">VAT Code</Label>
                <Select value={form.vat_code} onValueChange={v => setForm({ ...form, vat_code: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (15%)</SelectItem>
                    <SelectItem value="zero_rated">Zero-Rated (0%)</SelectItem>
                    <SelectItem value="exempt">Exempt</SelectItem>
                    <SelectItem value="none">No VAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px] text-[#6B6B72]">Priority</Label>
                <Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  className="mt-1 text-[13px]" />
                <p className="text-[11px] text-[#6B6B72] mt-1">Higher = matched first</p>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg">
              {editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-[16px]">Test Rule</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[12px] text-[#6B6B72]">Keyword</Label>
              <Input value={testKeyword} onChange={e => setTestKeyword(e.target.value)} placeholder="e.g. Pick n Pay" className="mt-1 text-[13px]" />
            </div>
            <div>
              <Label className="text-[12px] text-[#6B6B72]">Sample Transaction Description</Label>
              <Input value={testSample} onChange={e => setTestSample(e.target.value)} placeholder="e.g. PICK N PAY HYPER 1234" className="mt-1 text-[13px]" />
            </div>
            <Button onClick={runTest} className="w-full bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg">
              <Search size={14} className="mr-1.5" /> Test Match
            </Button>
            {testResult !== null && (
              <div className={`p-3 rounded-lg text-[13px] ${testResult ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {testResult ? "✓ Match — this rule would allocate the transaction" : "✗ No match — keyword not found in description"}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
