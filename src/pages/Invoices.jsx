import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Invoices() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ contact_id: "", issue_date: new Date().toISOString().split("T")[0], due_date: "", subtotal: 0, vat_amount: 0, notes: "" });

  useEffect(() => { if (currentCompany) loadData(); }, [currentCompany]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inv, ct] = await Promise.all([
        db.entities.Invoice.filter({ company_id: currentCompany.id }, "-created_date"),
        db.entities.Contact.filter({ company_id: currentCompany.id, type: "customer" }),
      ]);
      setInvoices(inv);
      setContacts(ct);
    } catch (e) {}
    setLoading(false);
  };

  const formatR = (v) => `R ${(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  const total = (Number(form.subtotal) || 0) + (Number(form.vat_amount) || 0);

  const handleCreate = async () => {
    if (!form.contact_id || !form.due_date) {
      toast({ title: "Customer and due date are required", variant: "destructive" });
      return;
    }
    try {
      const count = invoices.length + 1;
      await db.entities.Invoice.create({
        company_id: currentCompany.id,
        contact_id: form.contact_id,
        invoice_number: `INV-${String(count).padStart(4, "0")}`,
        type: "sales",
        issue_date: form.issue_date,
        due_date: form.due_date,
        subtotal: Number(form.subtotal) || 0,
        vat_amount: Number(form.vat_amount) || 0,
        total_amount: total,
        status: "draft",
      });
      setDialogOpen(false);
      setForm({ contact_id: "", issue_date: new Date().toISOString().split("T")[0], due_date: "", subtotal: 0, vat_amount: 0, notes: "" });
      await loadData();
      toast({ title: "Invoice created" });
    } catch (e) {
      toast({ title: "Error creating invoice", description: e.message, variant: "destructive" });
    }
  };

  const handleMarkPaid = async (invoice) => {
    try {
      await db.entities.Invoice.update(invoice.id, { status: "paid" });
      // Post a cash-received transaction
      await db.entities.Transaction.create({
        company_id: currentCompany.id,
        date: new Date().toISOString().split("T")[0],
        description: `Payment received — ${invoice.invoice_number}`,
        amount: invoice.total_amount,
        type: "credit",
        source: "invoice",
        status: "allocated",
        reference: invoice.invoice_number,
      });
      await loadData();
      toast({ title: "Invoice marked as paid" });
    } catch (e) {
      toast({ title: "Error marking as paid", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this invoice?")) return;
    try {
      await db.entities.Invoice.delete(id);
      await loadData();
      toast({ title: "Invoice deleted" });
    } catch (e) {}
  };

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Invoices</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">Customer invoices and payment status</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full flex-none bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg text-[13px] h-9 sm:w-auto">
          <Plus size={14} className="mr-1.5" /> New Invoice
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-[#6B6B72] mx-auto" /></div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-12 text-center">
          <FileText size={32} className="text-[#6B6B72] mx-auto mb-3" strokeWidth={1} />
          <p className="text-[15px] font-medium text-[#0F0F0F]">No invoices yet</p>
          <p className="text-[13px] text-[#6B6B72] mt-1">Create your first customer invoice to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E5E8]">
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Invoice #</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Due Date</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Total</th>
                  <th className="text-center px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const contact = contacts.find(c => c.id === inv.contact_id);
                  return (
                    <tr key={inv.id} className="border-b border-[#F1F1F4] hover:bg-[#F7F7FA] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#0F0F0F]">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-[#0F0F0F]">{contact?.name || "—"}</td>
                      <td className="px-4 py-3 text-[#6B6B72]">{inv.due_date}</td>
                      <td className="px-4 py-3 text-right text-[#0F0F0F] font-medium">{formatR(inv.total_amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          inv.status === "paid" ? "bg-green-50 text-green-700" :
                          inv.status === "sent" ? "bg-blue-50 text-blue-700" :
                          inv.status === "overdue" ? "bg-red-50 text-red-600" :
                          "bg-gray-100 text-gray-700"
                        }`}>{inv.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {inv.status !== "paid" && (
                            <button onClick={() => handleMarkPaid(inv)} className="text-[12px] px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700">
                              Mark Paid
                            </button>
                          )}
                          <button onClick={() => handleDelete(inv.id)} className="p-1 text-[#6B6B72] hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-[16px]">New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[12px] text-[#6B6B72]">Customer</Label>
              <Select value={form.contact_id} onValueChange={v => setForm({ ...form, contact_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  {contacts.length === 0 && <SelectItem value="" disabled>No customers — add in Aging tab</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[12px] text-[#6B6B72]">Issue Date</Label><Input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} className="mt-1 text-[13px]" /></div>
              <div><Label className="text-[12px] text-[#6B6B72]">Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="mt-1 text-[13px]" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[12px] text-[#6B6B72]">Subtotal (R)</Label><Input type="number" value={form.subtotal} onChange={e => setForm({ ...form, subtotal: e.target.value })} className="mt-1 text-[13px]" /></div>
              <div><Label className="text-[12px] text-[#6B6B72]">VAT (R)</Label><Input type="number" value={form.vat_amount} onChange={e => setForm({ ...form, vat_amount: e.target.value })} className="mt-1 text-[13px]" /></div>
            </div>
            <div className="flex justify-between text-[13px] py-2 border-t border-[#F1F1F4]">
              <span className="text-[#6B6B72]">Total</span>
              <span className="font-semibold text-[#0F0F0F]">{formatR(total)}</span>
            </div>
            <Button onClick={handleCreate} className="w-full bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg">Create Invoice</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
