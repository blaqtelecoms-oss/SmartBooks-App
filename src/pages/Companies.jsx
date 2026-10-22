import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const industries = ["Retail","Manufacturing","Services","Technology","Construction","Agriculture","Mining","Finance","Healthcare","Education","Transport","Hospitality","Other"];

const emptyForm = { name:"", registration_number:"", vat_number:"", paye_number:"", uif_number:"", sdl_number:"", tax_number:"", financial_year_end:"February", industry:"", address:"", contact_email:"", contact_phone:"" };

export default function Companies() {
  const { refreshCompanies } = useOutletContext();
  const { toast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCompanies(); }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try { setCompanies(await db.entities.Company.list()); } catch (e) {}
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Company name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editingId) {
        await db.entities.Company.update(editingId, form);
      } else {
        await db.entities.Company.create(form);
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadCompanies();
      refreshCompanies();
      toast({ title: editingId ? "Company updated" : "Company created" });
    } catch (e) {
      toast({ title: "Error saving company", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleEdit = (company) => {
    setForm({
      name: company.name || "", registration_number: company.registration_number || "",
      vat_number: company.vat_number || "", paye_number: company.paye_number || "",
      uif_number: company.uif_number || "", sdl_number: company.sdl_number || "",
      tax_number: company.tax_number || "", financial_year_end: company.financial_year_end || "February",
      industry: company.industry || "", address: company.address || "",
      contact_email: company.contact_email || "", contact_phone: company.contact_phone || ""
    });
    setEditingId(company.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this company?")) return;
    try {
      await db.entities.Company.delete(id);
      await loadCompanies();
      refreshCompanies();
      toast({ title: "Company deleted" });
    } catch (e) {
      toast({ title: "Error deleting", variant: "destructive" });
    }
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Companies</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">Manage your business entities and SA registrations</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); }}
          className="bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg text-[13px] h-9">
          <Plus size={15} className="mr-1.5" /> Add Company
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-[#E5E5E8] p-6 animate-pulse"><div className="h-5 bg-[#F1F1F4] rounded w-40" /></div>)}
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-12 text-center">
          <Building2 size={32} className="text-[#6B6B72] mx-auto mb-3" strokeWidth={1} />
          <p className="text-[15px] font-medium text-[#0F0F0F]">No companies yet</p>
          <p className="text-[13px] text-[#6B6B72] mt-1">Add your first company to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-[#E5E5E8] p-5 hover:border-[#D0D0D4] transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[15px] font-medium text-[#0F0F0F]">{c.name}</h3>
                  {c.industry && <span className="text-[11px] text-[#6B6B72] bg-[#F7F7FA] px-2 py-0.5 rounded-full mt-1 inline-block">{c.industry}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg hover:bg-[#F1F1F4] text-[#6B6B72]"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#6B6B72] hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 text-[12px]">
                {c.registration_number && <div><span className="text-[#6B6B72]">Reg:</span> <span className="text-[#0F0F0F]">{c.registration_number}</span></div>}
                {c.vat_number && <div><span className="text-[#6B6B72]">VAT:</span> <span className="text-[#0F0F0F]">{c.vat_number}</span></div>}
                {c.tax_number && <div><span className="text-[#6B6B72]">Tax:</span> <span className="text-[#0F0F0F]">{c.tax_number}</span></div>}
                {c.paye_number && <div><span className="text-[#6B6B72]">PAYE:</span> <span className="text-[#0F0F0F]">{c.paye_number}</span></div>}
                {c.financial_year_end && <div><span className="text-[#6B6B72]">FYE:</span> <span className="text-[#0F0F0F]">{c.financial_year_end}</span></div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-medium">{editingId ? "Edit Company" : "Add Company"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label className="text-[12px] text-[#6B6B72]">Company Name *</Label><Input value={form.name} onChange={e => update("name", e.target.value)} className="mt-1" placeholder="Acme (Pty) Ltd" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[12px] text-[#6B6B72]">Registration No.</Label><Input value={form.registration_number} onChange={e => update("registration_number", e.target.value)} className="mt-1" placeholder="2024/123456/07" /></div>
              <div><Label className="text-[12px] text-[#6B6B72]">VAT Number</Label><Input value={form.vat_number} onChange={e => update("vat_number", e.target.value)} className="mt-1" placeholder="4123456789" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[12px] text-[#6B6B72]">Tax Number</Label><Input value={form.tax_number} onChange={e => update("tax_number", e.target.value)} className="mt-1" placeholder="9123456789" /></div>
              <div><Label className="text-[12px] text-[#6B6B72]">PAYE Number</Label><Input value={form.paye_number} onChange={e => update("paye_number", e.target.value)} className="mt-1" placeholder="7123456789" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[12px] text-[#6B6B72]">UIF Number</Label><Input value={form.uif_number} onChange={e => update("uif_number", e.target.value)} className="mt-1" placeholder="U123456789" /></div>
              <div><Label className="text-[12px] text-[#6B6B72]">SDL Number</Label><Input value={form.sdl_number} onChange={e => update("sdl_number", e.target.value)} className="mt-1" placeholder="L123456789" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] text-[#6B6B72]">Financial Year End</Label>
                <ResponsiveSelect
                  value={form.financial_year_end}
                  onValueChange={v => update("financial_year_end", v)}
                  placeholder="Select month"
                  triggerClassName="mt-1 w-full"
                  options={months.map(m => ({ value: m, label: m }))}
                />
              </div>
              <div>
                <Label className="text-[12px] text-[#6B6B72]">Industry</Label>
                <ResponsiveSelect
                  value={form.industry}
                  onValueChange={v => update("industry", v)}
                  placeholder="Select..."
                  triggerClassName="mt-1 w-full"
                  options={industries.map(i => ({ value: i, label: i }))}
                />
              </div>
            </div>
            <div><Label className="text-[12px] text-[#6B6B72]">Address</Label><Input value={form.address} onChange={e => update("address", e.target.value)} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[12px] text-[#6B6B72]">Email</Label><Input type="email" value={form.contact_email} onChange={e => update("contact_email", e.target.value)} className="mt-1" /></div>
              <div><Label className="text-[12px] text-[#6B6B72]">Phone</Label><Input value={form.contact_phone} onChange={e => update("contact_phone", e.target.value)} className="mt-1" /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-lg">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg">
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}