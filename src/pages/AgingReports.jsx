import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Mail, Users } from "lucide-react";
import { calculateAging, exportAgingCSV } from "@/lib/agingCalculator";
import { useToast } from "@/components/ui/use-toast";

export default function AgingReports() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [tab, setTab] = useState("debtor");
  const [invoices, setInvoices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);

  useEffect(() => { if (currentCompany) loadData(); }, [currentCompany]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inv, ct] = await Promise.all([
        db.entities.Invoice.filter({ company_id: currentCompany.id }),
        db.entities.Contact.filter({ company_id: currentCompany.id }),
      ]);
      setInvoices(inv);
      setContacts(ct);
    } catch (e) {}
    setLoading(false);
  };

  const formatR = (v) => `R ${(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  const debtorInvoices = invoices.filter(i => i.type === "sales");
  const creditorInvoices = invoices.filter(i => i.type === "purchase");

  const debtorContacts = contacts.filter(c => c.type === "customer");
  const creditorContacts = contacts.filter(c => c.type === "supplier");

  const currentType = tab === "debtor" ? "customer" : "supplier";
  const currentInvoices = tab === "debtor" ? debtorInvoices : creditorInvoices;
  const currentContacts = tab === "debtor" ? debtorContacts : creditorContacts;

  const aging = calculateAging(currentInvoices, currentContacts);

  const downloadCSV = () => {
    const csv = exportAgingCSV(aging, currentType);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab === "debtor" ? "Debtors" : "Creditors"}_Aging_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  const sendStatement = async (contactRow) => {
    if (!contactRow.contact.email) {
      toast({ title: "No email on file for this contact", variant: "destructive" });
      return;
    }
    setSending(contactRow.contact.id);
    try {
      await db.functions.invoke("send-statement", {
        company_id: currentCompany.id,
        company_name: currentCompany.name,
        contact_name: contactRow.contact.name,
        contact_email: contactRow.contact.email,
        total: contactRow.total,
        buckets: contactRow.buckets,
      });
      toast({ title: `Statement sent to ${contactRow.contact.email}` });
    } catch (e) {
      toast({ title: "Error sending statement", description: e.message, variant: "destructive" });
    }
    setSending(null);
  };

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Aging Reports</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">Debtor and creditor aging analysis (30/60/90 days)</p>
        </div>
        <Button onClick={downloadCSV} variant="outline" className="text-[13px] h-9 rounded-lg">
          <Download size={14} className="mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Current", value: aging.totals.current, color: "text-[#0F0F0F]" },
          { label: "1–30 Days", value: aging.totals.days30, color: "text-amber-600" },
          { label: "31–60 Days", value: aging.totals.days60, color: "text-orange-600" },
          { label: "90+ Days", value: aging.totals.days90, color: "text-red-600" },
        ].map(b => (
          <div key={b.label} className="bg-white rounded-xl border border-[#E5E5E8] p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#6B6B72]">{b.label}</p>
            <p className={`text-[20px] font-semibold mt-1 ${b.color}`}>{formatR(b.value)}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("debtor")} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${tab === "debtor" ? "bg-[#0F0F0F] text-white" : "bg-white border border-[#E5E5E8] text-[#6B6B72] hover:bg-[#F7F7FA]"}`}>
          Debtors
        </button>
        <button onClick={() => setTab("creditor")} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${tab === "creditor" ? "bg-[#0F0F0F] text-white" : "bg-white border border-[#E5E5E8] text-[#6B6B72] hover:bg-[#F7F7FA]"}`}>
          Creditors
        </button>
      </div>

      {/* Grand total */}
      <div className="bg-[#0F0F0F] text-white rounded-xl p-4 flex items-center justify-between">
        <span className="text-[13px] text-white/70">Total Outstanding ({tab === "debtor" ? "Debtors" : "Creditors"})</span>
        <span className="text-[22px] font-semibold">{formatR(aging.totals.grand)}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-[#6B6B72] mx-auto" /></div>
      ) : aging.contacts.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-12 text-center">
          <Users size={32} className="text-[#6B6B72] mx-auto mb-3" strokeWidth={1} />
          <p className="text-[15px] font-medium text-[#0F0F0F]">No outstanding {tab === "debtor" ? "debtor" : "creditor"} balances</p>
          <p className="text-[13px] text-[#6B6B72] mt-1">Create invoices with contacts to see aging data</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E5E8]">
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Contact</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Current</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">1–30</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">31–60</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">90+</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Total</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {aging.contacts.map(r => (
                  <tr key={r.contact.id} className="border-b border-[#F1F1F4] hover:bg-[#F7F7FA] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#0F0F0F]">{r.contact.name}</p>
                      {r.contact.email && <p className="text-[11px] text-[#6B6B72]">{r.contact.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-[#0F0F0F]">{formatR(r.buckets.current)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{formatR(r.buckets.days30)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatR(r.buckets.days60)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatR(r.buckets.days90)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#0F0F0F]">{formatR(r.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => sendStatement(r)} disabled={sending === r.contact.id}
                        className="text-[12px] px-2 py-1 rounded bg-[#0F0F0F] text-white hover:bg-[#2D2D2D] disabled:opacity-50 inline-flex items-center gap-1">
                        {sending === r.contact.id ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                        Send
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F7F7FA] font-semibold">
                  <td className="px-4 py-3 text-[#6B6B72]">Total</td>
                  <td className="px-4 py-3 text-right">{formatR(aging.totals.current)}</td>
                  <td className="px-4 py-3 text-right">{formatR(aging.totals.days30)}</td>
                  <td className="px-4 py-3 text-right">{formatR(aging.totals.days60)}</td>
                  <td className="px-4 py-3 text-right">{formatR(aging.totals.days90)}</td>
                  <td className="px-4 py-3 text-right">{formatR(aging.totals.grand)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
