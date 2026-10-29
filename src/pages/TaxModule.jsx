import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, FileText, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { calculateTaxReturn } from "@/lib/taxCalculation";
import { formatRand } from "@/lib/money";
import { ReportShell, ReportCard, ReportLoading, NoCompany } from "@/components/accounting/ReportShell";

const STATUS_TONE = {
  filed: "sb-chip-green",
  reviewed: "sb-chip-amber",
  calculated: "sb-chip-amber",
};

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
        db.entities.Transaction.filter({ company_id: currentCompany.id }, "-date", 50),
        db.entities.TaxReturn.filter({ company_id: currentCompany.id }, "-created_date"),
      ]);
      setTransactions(txs);
      setTaxReturns(returns);
    } catch (e) {}
    setLoading(false);
  };

  const generateReturn = async () => {
    if (!periodStart || !periodEnd) {
      toast({ title: "Select period dates", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const result = calculateTaxReturn(selectedType, transactions, currentCompany, periodStart, periodEnd);

      await db.entities.TaxReturn.create({
        company_id: currentCompany.id,
        type: selectedType,
        period_start: periodStart,
        period_end: periodEnd,
        status: "calculated",
        total_amount: result.total_amount || 0,
        data: JSON.stringify(result),
        due_date: result.due_date || "",
      });

      await loadData();
      toast({ title: `${selectedType} return generated successfully` });
    } catch (e) {
      toast({ title: "Error generating return", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  if (!currentCompany) return <NoCompany />;

  return (
    <ReportShell title="Tax & Compliance" subtitle="SARS tax return calculations and filing preparation">
      {loading ? (
        <ReportLoading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <ReportCard title="Generate return">
            <div className="space-y-3.5 py-1">
              <div>
                <Label className="text-[11px]" style={{ color: "var(--sb-muted)" }}>
                  Return type
                </Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="mt-1 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
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
                <div>
                  <Label className="text-[11px]" style={{ color: "var(--sb-muted)" }}>
                    Period start
                  </Label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="mt-1 text-[13px]"
                  />
                </div>
                <div>
                  <Label className="text-[11px]" style={{ color: "var(--sb-muted)" }}>
                    Period end
                  </Label>
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="mt-1 text-[13px]"
                  />
                </div>
              </div>

              <Button
                onClick={generateReturn}
                disabled={generating}
                className="w-full rounded-full text-[13px]"
                style={{ background: "var(--sb-ink)", color: "#fff" }}
              >
                {generating ? (
                  <>
                    <Loader2 size={14} className="mr-2 animate-spin" /> Calculating…
                  </>
                ) : (
                  <>
                    <Calculator size={14} className="mr-2" /> Generate return
                  </>
                )}
              </Button>

              <p className="text-[11px] leading-relaxed" style={{ color: "var(--sb-muted)" }}>
                Returns are calculated from allocated transactions for {currentCompany.name} and saved for review.
              </p>
            </div>
          </ReportCard>

          <div className="flex flex-col gap-3 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <p className="sb-label">Tax returns</p>
              <span className="sb-chip">{taxReturns.length} saved</span>
            </div>

            {taxReturns.length === 0 ? (
              <ReportCard>
                <div className="flex flex-col items-center py-8 text-center">
                  <FileText size={26} strokeWidth={1.5} style={{ color: "var(--sb-muted)" }} />
                  <p className="mt-2 text-[13px]" style={{ color: "var(--sb-muted)" }}>
                    No tax returns generated yet
                  </p>
                </div>
              </ReportCard>
            ) : (
              taxReturns.map((tr) => {
                let data = {};
                try {
                  data = JSON.parse(tr.data || "{}");
                } catch (e) {}
                return (
                  <section key={tr.id} className="sb-card" style={{ padding: 20 }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold" style={{ color: "var(--sb-ink)" }}>
                            {tr.type}
                          </span>
                          <span className={`sb-chip ${STATUS_TONE[tr.status] || ""}`}>{tr.status}</span>
                        </div>
                        <p className="mt-1 text-[12px] sb-money" style={{ color: "var(--sb-muted)" }}>
                          {tr.period_start} — {tr.period_end}
                        </p>
                      </div>
                      <p className="sb-money flex-none text-[20px] font-bold" style={{ color: "var(--sb-ink)" }}>
                        {formatRand(tr.total_amount)}
                      </p>
                    </div>

                    {data.line_items && (
                      <div className="mt-3 border-t pt-2" style={{ borderColor: "var(--sb-border)" }}>
                        {data.line_items.map((item, i) => (
                          <div key={i} className="flex justify-between py-1 text-[12px]">
                            <span style={{ color: "var(--sb-muted)" }}>{item.label}</span>
                            <span className="sb-money" style={{ color: "var(--sb-ink)" }}>
                              {formatRand(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {data.compliance_notes && (
                      <div className="mt-3 flex items-start gap-2 border-t pt-3" style={{ borderColor: "var(--sb-border)" }}>
                        <AlertTriangle size={14} strokeWidth={1.7} className="mt-0.5 flex-none" style={{ color: "var(--sb-amber-ink)" }} />
                        <p className="text-[11px] leading-relaxed" style={{ color: "var(--sb-muted)" }}>
                          {data.compliance_notes}
                        </p>
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </div>
        </div>
      )}
    </ReportShell>
  );
}
