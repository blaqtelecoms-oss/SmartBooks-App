import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, Loader2, Wrench } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const rateUnits = [
  { value: "hour", label: "Per hour" },
  { value: "day", label: "Per day" },
  { value: "session", label: "Per session" },
  { value: "project", label: "Per project" },
  { value: "unit", label: "Per unit" },
];

const vatCodes = [
  { value: "standard", label: "Standard (15%)" },
  { value: "zero_rated", label: "Zero rated" },
  { value: "exempt", label: "Exempt" },
];

const emptyForm = { name: "", description: "", rate: "", rate_unit: "hour", vat_code: "standard", is_active: true };

export default function Services() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentCompany) loadServices();
  }, [currentCompany]);

  const loadServices = async () => {
    setLoading(true);
    try {
      setServices(await db.entities.Service.filter({ company_id: currentCompany.id }, "name"));
    } catch (e) {
      toast({ title: "Could not load services", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const currencyPrefix = currentCompany?.currency && currentCompany.currency !== "ZAR" ? `${currentCompany.currency} ` : "R ";
  const formatMoney = (v) => `${currencyPrefix}${(Number(v) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Service name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        company_id: currentCompany.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        rate: Number(form.rate) || 0,
        rate_unit: form.rate_unit,
        vat_code: form.vat_code,
        is_active: form.is_active,
      };
      if (editingId) await db.entities.Service.update(editingId, payload);
      else await db.entities.Service.create(payload);
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadServices();
      toast({ title: editingId ? "Service updated" : "Service added" });
    } catch (e) {
      toast({ title: "Error saving service", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleEdit = (service) => {
    setForm({
      name: service.name || "",
      description: service.description || "",
      rate: service.rate ?? "",
      rate_unit: service.rate_unit || "hour",
      vat_code: service.vat_code || "standard",
      is_active: service.is_active !== false,
    });
    setEditingId(service.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this service?")) return;
    try {
      await db.entities.Service.delete(id);
      await loadServices();
      toast({ title: "Service deleted" });
    } catch (e) {
      toast({ title: "Error deleting service", description: e.message, variant: "destructive" });
    }
  };

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  const activeServices = services.filter((s) => s.is_active !== false);
  const averageRate = activeServices.length
    ? activeServices.reduce((sum, s) => sum + (Number(s.rate) || 0), 0) / activeServices.length
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[24px] font-medium tracking-tight text-[#0F0F0F]">Services</h1>
          <p className="mt-1 text-[13px] text-[#6B6B72]">The services {currentCompany.name} bills for</p>
        </div>
        <Button
          onClick={() => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); }}
          className="h-9 w-full flex-none rounded-lg bg-[#0F0F0F] text-[13px] text-white hover:bg-[#2D2D2D] sm:w-auto"
        >
          <Plus size={15} className="mr-1.5" /> Add Service
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E5E5E8] bg-white p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#6B6B72]">Services</p>
          <p className="mt-1 text-[20px] font-semibold text-[#0F0F0F]">{services.length}</p>
        </div>
        <div className="rounded-xl border border-[#E5E5E8] bg-white p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#6B6B72]">Active</p>
          <p className="mt-1 text-[20px] font-semibold text-[#0F0F0F]">{activeServices.length}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-[#E5E5E8] bg-white p-4 sm:col-span-1">
          <p className="text-[11px] uppercase tracking-wider text-[#6B6B72]">Average rate</p>
          <p className="mt-1 text-[20px] font-semibold text-[#0F0F0F]">{formatMoney(averageRate)}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center"><Loader2 size={24} className="mx-auto animate-spin text-[#6B6B72]" /></div>
      ) : services.length === 0 ? (
        <div className="rounded-xl border border-[#E5E5E8] bg-white p-10 text-center">
          <Wrench size={30} className="mx-auto mb-3 text-[#6B6B72]" strokeWidth={1} />
          <p className="text-[15px] font-medium text-[#0F0F0F]">No services yet</p>
          <p className="mt-1 text-[13px] text-[#6B6B72]">Add the services you charge for so you can bill them on invoices</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {services.map((service) => (
            <div key={service.id} className="rounded-xl border border-[#E5E5E8] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[14px] font-medium text-[#0F0F0F]">{service.name}</h3>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-[#6B6B72]">
                    {rateUnits.find((u) => u.value === service.rate_unit)?.label || "Rate"}
                    {service.is_active === false ? " · Inactive" : ""}
                  </p>
                </div>
                <div className="flex flex-none gap-1">
                  <button onClick={() => handleEdit(service)} aria-label="Edit service" className="rounded-lg p-1.5 text-[#6B6B72] hover:bg-[#F1F1F4]"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(service.id)} aria-label="Delete service" className="rounded-lg p-1.5 text-[#6B6B72] hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              {service.description && <p className="mt-2 text-[12px] text-[#6B6B72]">{service.description}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#6B6B72]">
                <span className="text-[14px] font-semibold text-[#0F0F0F]">{formatMoney(service.rate)}</span>
                <span>{vatCodes.find((c) => c.value === service.vat_code)?.label || "Standard (15%)"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-medium">{editingId ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            <div>
              <Label className="text-[12px] text-[#6B6B72]">Service name *</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} className="mt-1" placeholder="Monthly bookkeeping" />
            </div>
            <div>
              <Label className="text-[12px] text-[#6B6B72]">Description</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="mt-1" rows={2} placeholder="What the client receives" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] text-[#6B6B72]">Rate</Label>
                <Input type="number" inputMode="decimal" value={form.rate} onChange={(e) => update("rate", e.target.value)} className="mt-1" placeholder="0.00" />
              </div>
              <div>
                <Label className="text-[12px] text-[#6B6B72]">Charged</Label>
                <ResponsiveSelect
                  value={form.rate_unit}
                  onValueChange={(v) => update("rate_unit", v)}
                  placeholder="Select"
                  triggerClassName="mt-1 h-9 w-full"
                  options={rateUnits}
                />
              </div>
            </div>
            <div>
              <Label className="text-[12px] text-[#6B6B72]">VAT</Label>
              <ResponsiveSelect
                value={form.vat_code}
                onValueChange={(v) => update("vat_code", v)}
                placeholder="Select"
                triggerClassName="mt-1 h-9 w-full"
                options={vatCodes}
              />
            </div>
            <label className="flex items-center gap-2 text-[13px] text-[#6B6B72]">
              <input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} />
              Available to bill
            </label>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-lg">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-[#0F0F0F] text-white hover:bg-[#2D2D2D]">
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
