import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, FileText, Loader2, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";

export default function TaxModule() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [taxReturns, setTaxReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState("VAT201");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, returns] = await Promise.all([
        base44.entities.Transaction.filter({ company_id: currentCompany.id }, "-date", 50),
        base44.entities.TaxReturn.filter({ company_id: currentCompany.id }, "-created_date")
      ]);
      setTransactions(txs);
      setTaxReturns(returns);
    } catch (e) {}
    setLoading(false);
  };

  const formatR = (v) => `R ${(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  const generateReturn = async () => {
    if (!periodStart || !periodEnd) { toast({ title: "Select period dates", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const periodTxs = transactions.filter(t => t.date >= periodStart && t.date <= periodEnd);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a South African tax specialist. Generate a ${selectedType} tax return calculation for company "${currentCompany.name}".

Company details:
- VAT Number: ${currentCompany.vat_number || "N/A"}
- Tax Number: ${currentCompany.tax_number || "N/A"}
- PAYE Number: ${currentCompany.paye_number || "N/A"}

Period: ${periodStart} to ${periodEnd}

Transactions in this period:
${JSON.stringify(periodTxs.slice(0, 30).map(t => ({ date: t.date, description: t.description, amount: t.amount, type: t.type, category: t.category, vat_amount: t.vat_amount })))}

Calculate the ${selectedType} return with all applicable fields. Use current SA tax rates (VAT 15%, company tax 27%, PAYE brackets as per current legislation).

For VAT201: calculate output VAT, input VAT, net VAT payable/refundable.
For ITR14: calculate taxable income, deductions, tax payable.
For EMP201: calculate PAYE, UIF (1% employer + 1% employee), SDL (1% of payroll).
For ITR12: calculate individual tax per brackets.
For IRP5: calculate employee tax certificate details.`,
        response_json_schema: {
          type: "object",
          properties: {
            return_type: { type: "string" },
            total_amount: { type: "number" },
            summary: { type: "string" },
            line_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  amount: { type: "number" },
                  description: { type: "string" }
                }
              }
            },
            compliance_notes: { type: "string" },
            due_date: { type: "string" }
          }
        },
        model: "claude_sonnet_4_6"
      });

      await base44.entities.TaxReturn.create({
        company_id: currentCompany.id,
        type: selectedType,
        period_start: periodStart,
        period_end: periodEnd,
        status: "calculated",
        total_amount: result.total_amount || 0,
        data: JSON.stringify(result),
        due_date: result.due_date || ""
      });

      await loadData();
      toast({ title: `${selectedType} return generated successfully` });
    } catch (e) {
      toast({ title: "Error generating return", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Tax & Compliance</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">SARS tax return calculations and filing preparation</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-[#6B6B72] mx-auto" /></div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Generate Panel */}
          <div className="bg-white rounded-xl border border-[#E5E5E8] p-5 space-y-4">
            <h3 className="text-[15px] font-medium text-[#0F0F0F]">Generate Return</h3>
            <div>
              <Label className="text-[12px] text-[#6B6B72]">Return Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VAT201">VAT201 — VAT Return</SelectItem>
                  <SelectItem value="ITR14">ITR14 — Company Tax</SelectItem>
                  <SelectItem value="ITR12">ITR12 — Personal Tax</SelectItem>
                  <SelectItem value="EMP201">EMP201 — PAYE/UIF/SDL</SelectItem>
                  <SelectItem value="IRP5">IRP5 — Employee Tax Cert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[12px] text-[#6B6B72]">Period Start</Label><Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-[12px] text-[#6B6B72]">Period End</Label><Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="mt-1" /></div>
            </div>
            <Button onClick={generateReturn} disabled={generating} className="w-full bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg text-[13px]">
              {generating ? <><Loader2 size={14} className="mr-2 animate-spin" /> Calculating...</> : <><Calculator size={14} className="mr-2" /> Generate Return</>}
            </Button>
          </div>

          {/* Returns List */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-[15px] font-medium text-[#0F0F0F]">Tax Returns</h3>
            {taxReturns.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E5E5E8] p-8 text-center">
                <FileText size={28} className="text-[#6B6B72] mx-auto mb-2" strokeWidth={1} />
                <p className="text-[13px] text-[#6B6B72]">No tax returns generated yet</p>
              </div>
            ) : (
              taxReturns.map(tr => {
                let data = {};
                try { data = JSON.parse(tr.data || "{}"); } catch (e) {}
                return (
                  <div key={tr.id} className="bg-white rounded-xl border border-[#E5E5E8] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-[#0F0F0F]">{tr.type}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            tr.status === "filed" ? "bg-green-50 text-green-700" :
                            tr.status === "reviewed" ? "bg-blue-50 text-blue-700" :
                            tr.status === "calculated" ? "bg-amber-50 text-amber-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>{tr.status}</span>
                        </div>
                        <p className="text-[12px] text-[#6B6B72] mt-0.5">{tr.period_start} — {tr.period_end}</p>
                      </div>
                      <p className="text-[20px] font-semibold text-[#0F0F0F]">{formatR(tr.total_amount)}</p>
                    </div>
                    {data.line_items && (
                      <div className="space-y-1 mt-3 pt-3 border-t border-[#F1F1F4]">
                        {data.line_items.map((item, i) => (
                          <div key={i} className="flex justify-between text-[12px] py-1">
                            <span className="text-[#6B6B72]">{item.label}</span>
                            <span className="text-[#0F0F0F] font-mono">{formatR(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {data.compliance_notes && (
                      <div className="mt-3 pt-3 border-t border-[#F1F1F4] flex items-start gap-2">
                        <AlertTriangle size={14} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-[#6B6B72]">{data.compliance_notes}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}