import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const industries = ["Retail","Manufacturing","Services","Technology","Construction","Agriculture","Mining","Finance","Healthcare","Education","Transport","Hospitality","Other"];

const emptyForm = { name:"", registration_number:"", vat_number:"", paye_number:"", uif_number:"", sdl_number:"", tax_number:"", financial_year_end:"February", industry:"", address:"", contact_email:"", contact_phone:"" };

const initialsOf = (name) =>
  (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Companies</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">Manage your business entities and SA registrations</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); }}
          className="w-full flex-none bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg text-[13px] h-9 sm:w-auto">
          <Plus size={15} className="mr-1.5" /> Add Company
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="sb-tile p-6 animate-pulse"><div className="h-5 bg-[#F1F1F4] rounded w-40" /></div>)}
        </div>
      ) : companies.length === 0 ? (
        <div className="sb-empty p-12">
          <div className="sb-empty-icon"><Building2 size={24} strokeWidth={1.5} /></div>
          <p className="text-[15px] font-semibold text-[#0F0F0F]">No companies yet</p>
          <p className="text-[13px] text-[#6B6B72] mt-1">Add your first company to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map(c => (
            <div key={c.id} className="sb-tile flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="sb-monogram" aria-hidden="true">{initialsOf(c.name)}</div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold tracking-tight text-[#0F0F0F]">{c.name}</h3>
                    {c.industry && (
                      <span className="mt-2 inline-flex items-center rounded-full bg-[#EFF4F0] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#2D5A43] ring-1 ring-inset ring-[#DCE7DE]">
                        {c.industry}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-none gap-1">
                  <button onClick={() => handleEdit(c)} aria-label={`Edit ${c.name}`} className="sb-tile-action"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(c.id)} aria-label={`Delete ${c.name}`} className="sb-tile-action sb-tile-action--danger"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#EDF1ED] pt-4">
                {[
                  ["Reg", c.registration_number],
                  ["VAT", c.vat_number],
                  ["Tax", c.tax_number],
                  ["PAYE", c.paye_number],
                  ["FYE", c.financial_year_end],
                ].filter(([, value]) => !!value).map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#93A096]">{label}</p>
                    <p className="mt-0.5 truncate text-[12.5px] font-medium text-[#0F0F0F]">{value}</p>
                  </div>
                ))}
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