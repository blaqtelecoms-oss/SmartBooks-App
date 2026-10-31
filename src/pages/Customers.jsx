import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Contact } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const EMPTY_FORM = { name: "", email: "", phone: "", address: "", vat_number: "" };

// Customers are the `contacts` rows of type 'customer'; invoices point at them
// through invoices.contact_id, so this page is the one place they are managed.
export default function Customers() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { if (currentCompany) loadData(); }, [currentCompany]);

  const loadData = async () => {
    setLoading(true);
    try {
      const rows = await db.entities.Contact.filter(
        { company_id: currentCompany.id, type: "customer" },
        "name"
      );
      setCustomers(rows);
    } catch (e) {}
    setLoading(false);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      vat_number: customer.vat_number || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Customer name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      company_id: currentCompany.id,
      type: "customer",
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      vat_number: form.vat_number.trim() || null,
    };
    try {
      if (editingId) {
        await db.entities.Contact.update(editingId, payload);
      } else {
        await db.entities.Contact.create(payload);
      }
      setDialogOpen(false);
      await loadData();
      toast({ title: editingId ? "Customer updated" : "Customer added" });
    } catch (e) {
      toast({ title: "Error saving customer", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await db.entities.Contact.delete(id);
      setCustomers((list) => list.filter((c) => c.id !== id));
      toast({ title: "Customer deleted", description: "Existing invoices keep their numbers and totals." });
    } catch (e) {
      toast({ title: "Error deleting customer", description: e.message, variant: "destructive" });
    }
  };

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Customers</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">The people and businesses you invoice</p>
        </div>
        <Button onClick={openNew} className="w-full flex-none bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg text-[13px] h-9 sm:w-auto">
          <Plus size={14} className="mr-1.5" /> New Customer
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-[#6B6B72] mx-auto" /></div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-12 text-center">
          <Contact size={32} className="text-[#6B6B72] mx-auto mb-3" strokeWidth={1} />
          <p className="text-[15px] font-medium text-[#0F0F0F]">No customers yet</p>
          <p className="text-[13px] text-[#6B6B72] mt-1">Add a customer so invoices can be assigned to them</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E5E8]">
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">VAT No.</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-[#F1F1F4] hover:bg-[#F7F7FA] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#0F0F0F]">{customer.name}</td>
                    <td className="px-4 py-3 text-[#6B6B72]">{customer.email || "—"}</td>
                    <td className="px-4 py-3 text-[#6B6B72]">{customer.phone || "—"}</td>
                    <td className="px-4 py-3 text-[#6B6B72]">{customer.vat_number || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(customer)} className="text-[#6B6B72] hover:text-[#0F0F0F] p-1 mr-1">Edit</button>
                      <button onClick={() => handleDelete(customer.id)} className="text-[#6B6B72] hover:text-red-500 p-1">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-[16px]">{editingId ? "Edit Customer" : "New Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[12px] text-[#6B6B72]">Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Thabo Mokoena or Acme (Pty) Ltd" className="mt-1 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] text-[#6B6B72]">Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] text-[#6B6B72]">Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1 text-[13px]" />
              </div>
            </div>
            <div>
              <Label className="text-[12px] text-[#6B6B72]">Address</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="mt-1 text-[13px]" />
            </div>
            <div>
              <Label className="text-[12px] text-[#6B6B72]">VAT Number</Label>
              <Input value={form.vat_number} onChange={e => setForm({ ...form, vat_number: e.target.value })}
                placeholder="Optional" className="mt-1 text-[13px]" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg">
              {saving ? "Saving…" : editingId ? "Update Customer" : "Add Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
