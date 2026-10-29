import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { defaultAccountsFor } from "@/lib/defaultChartOfAccounts";

const accountTypes = [
  { value: "asset", label: "Assets", normalSide: "debit" },
  { value: "liability", label: "Liabilities", normalSide: "credit" },
  { value: "equity", label: "Equity", normalSide: "credit" },
  { value: "income", label: "Income", normalSide: "credit" },
  { value: "expense", label: "Expenses", normalSide: "debit" },
  { value: "vat", label: "VAT Accounts", normalSide: "credit" },
  { value: "paye", label: "PAYE Accounts", normalSide: "credit" }
];

const emptyForm = { code: "", name: "", type: "expense", sub_type: "", description: "", normal_side: "debit" };

export default function ChartOfAccounts() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [activeType, setActiveType] = useState("all");

  useEffect(() => {
    if (currentCompany) loadAccounts();
  }, [currentCompany]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const accts = await db.entities.Account.filter({ company_id: currentCompany.id });
      setAccounts(accts);
    } catch (e) {}
    setLoading(false);
  };

  const handleSetupDefaults = async () => {
    try {
      const toCreate = defaultAccountsFor(currentCompany.offering_type).map(a => ({ ...a, company_id: currentCompany.id, is_system: true, is_active: true, balance: 0 }));
      await db.entities.Account.bulkCreate(toCreate);
      await loadAccounts();
      toast({ title: "Default chart of accounts created" });
    } catch (e) {
      toast({ title: "Error creating defaults", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!form.code || !form.name) { toast({ title: "Code and name are required", variant: "destructive" }); return; }
    try {
      const data = { ...form, company_id: currentCompany.id, is_active: true };
      if (editingId) await db.entities.Account.update(editingId, data);
      else await db.entities.Account.create(data);
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await loadAccounts();
      toast({ title: editingId ? "Account updated" : "Account created" });
    } catch (e) {
      toast({ title: "Error saving", variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this account?")) return;
    try {
      await db.entities.Account.delete(id);
      await loadAccounts();
      toast({ title: "Account deleted" });
    } catch (e) {}
  };

  const filtered = activeType === "all" ? accounts : accounts.filter(a => a.type === activeType);
  const grouped = accountTypes.map(t => ({
    ...t,
    accounts: filtered.filter(a => a.type === t.value).sort((a, b) => a.code.localeCompare(b.code))
  })).filter(g => activeType === "all" ? g.accounts.length > 0 : g.value === activeType);

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Chart of Accounts</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">{accounts.length} accounts</p>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <Button variant="outline" onClick={handleSetupDefaults} className="rounded-lg text-[13px] h-9">
              <BookOpen size={14} className="mr-1.5" /> Setup SA Defaults
            </Button>
          )}
          <Button onClick={() => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); }}
            className="bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg text-[13px] h-9">
            <Plus size={14} className="mr-1.5" /> Add Account
          </Button>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setActiveType("all")}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${activeType === "all" ? "bg-[#0F0F0F] text-white" : "bg-white border border-[#E5E5E8] text-[#6B6B72] hover:text-[#0F0F0F]"}`}>All</button>
        {accountTypes.map(t => (
          <button key={t.value} onClick={() => setActiveType(t.value)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${activeType === t.value ? "bg-[#0F0F0F] text-white" : "bg-white border border-[#E5E5E8] text-[#6B6B72] hover:text-[#0F0F0F]"}`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-[#6B6B72] mx-auto" /></div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-12 text-center">
          <BookOpen size={32} className="text-[#6B6B72] mx-auto mb-3" strokeWidth={1} />
          <p className="text-[15px] font-medium text-[#0F0F0F]">No accounts set up</p>
          <p className="text-[13px] text-[#6B6B72] mt-1">Create a standard SA chart of accounts with one click</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.value} className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F1F1F4] bg-[#FAFAFA]">
                <h3 className="text-[13px] font-medium text-[#0F0F0F]">{group.label}</h3>
              </div>
              <div>
                {group.accounts.map(acct => (
                  <div key={acct.id} className="flex items-center justify-between px-4 py-2.5 border-b border-[#F7F7FA] last:border-0 hover:bg-[#F7F7FA] transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-[12px] font-mono text-[#6B6B72] w-12">{acct.code}</span>
                      <span className="text-[13px] text-[#0F0F0F]">{acct.name}</span>
                      {acct.sub_type && <span className="text-[10px] text-[#6B6B72] bg-[#F1F1F4] px-1.5 py-0.5 rounded">{acct.sub_type}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-medium text-[#0F0F0F]">R {(acct.balance || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
                      <button onClick={() => { setForm({ code: acct.code, name: acct.name, type: acct.type, sub_type: acct.sub_type || "", description: acct.description || "", normal_side: acct.normal_side || "debit" }); setEditingId(acct.id); setDialogOpen(true); }}
                        className="p-1 rounded hover:bg-[#F1F1F4] text-[#6B6B72]"><Pencil size={13} /></button>
                      {!acct.is_system && (
                        <button onClick={() => handleDelete(acct.id)} className="p-1 rounded hover:bg-red-50 text-[#6B6B72] hover:text-red-500"><Trash2 size={13} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-[16px]">{editingId ? "Edit Account" : "Add Account"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[12px] text-[#6B6B72]">Account Code *</Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className="mt-1" placeholder="6100" /></div>
              <div>
                <Label className="text-[12px] text-[#6B6B72]">Type *</Label>
                <Select value={form.type} onValueChange={v => { const t = accountTypes.find(at => at.value === v); setForm(p => ({ ...p, type: v, normal_side: t?.normalSide || "debit" })); }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{accountTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-[12px] text-[#6B6B72]">Account Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
            <div><Label className="text-[12px] text-[#6B6B72]">Sub-Type</Label><Input value={form.sub_type} onChange={e => setForm(p => ({ ...p, sub_type: e.target.value }))} className="mt-1" placeholder="e.g. current_asset" /></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-lg">Cancel</Button>
              <Button onClick={handleSave} className="flex-1 bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg">{editingId ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}