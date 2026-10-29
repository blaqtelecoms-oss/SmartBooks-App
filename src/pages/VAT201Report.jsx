import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { calculateVAT201, exportVAT201CSV } from "@/lib/vat201Calculator";
import { useToast } from "@/components/ui/use-toast";

export default function VAT201Report() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [report, setReport] = useState(null);
  const [expandedBox, setExpandedBox] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      // Default to current tax period
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      setPeriodStart(start.toISOString().split("T")[0]);
      setPeriodEnd(now.toISOString().split("T")[0]);
      loadTransactions();
    }
  }, [currentCompany]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      setTransactions(await db.entities.Transaction.filter({ company_id: currentCompany.id }, "-date", 500));
    } catch (e) {}
    setLoading(false);
  };

  const generateReport = () => {
    if (!periodStart || !periodEnd) {
      toast({ title: "Select period dates", variant: "destructive" });
      return;
    }
    setCalculating(true);
    const r = calculateVAT201(transactions, periodStart, periodEnd);
    setReport(r);
    setCalculating(false);
  };

  const formatR = (v) => v !== null && v !== undefined
    ? `R ${Math.abs(v).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}${v < 0 ? " (Cr)" : ""}`
    : "—";

  const downloadCSV = () => {
    if (!report) return;
    const csv = exportVAT201CSV(report);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VAT201_${periodStart}_to_${periodEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  const downloadPDF = () => {
    if (!report) return;
    // Simple printable PDF via window.print with a formatted report
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>VAT 201 Report</title>
      <style>
        body { font-family: sans-serif; padding: 40px; }
        h1 { font-size: 20px; } h2 { font-size: 14px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { text-align: left; padding: 8px; border-bottom: 2px solid #333; font-size: 12px; }
        td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
        .total { font-weight: bold; background: #f5f5f5; }
      </style></head><body>
      <h1>SARS VAT 201 Return</h1>
      <h2>${currentCompany.name} | Period: ${periodStart} to ${periodEnd}</h2>
      <table>
        <thead><tr><th>Box</th><th>Description</th><th>Value (R)</th><th>VAT (R)</th></tr></thead>
        <tbody>
        ${report.boxes.map(b => `
          <tr${b.box === 3 || b.box === 6 || b.box === 7 ? ' class="total"' : ""}>
            <td>Box ${b.box}</td><td>${b.label}</td>
            <td>${b.value !== null ? b.value.toFixed(2) : "—"}</td>
            <td>${b.tax.toFixed(2)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <p style="margin-top:20px;font-size:12px;">Net VAT ${report.summary.isRefund ? "Refundable" : "Payable"}: R ${Math.abs(report.summary.netVAT).toFixed(2)}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
    toast({ title: "PDF export ready" });
  };

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">VAT 201 Report</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">SARS VAT 201 return with box-by-box breakdown</p>
        </div>
        {report && (
          <div className="flex gap-2">
            <Button onClick={downloadCSV} variant="outline" className="text-[13px] h-9 rounded-lg">
              <Download size={14} className="mr-1.5" /> CSV
            </Button>
            <Button onClick={downloadPDF} variant="outline" className="text-[13px] h-9 rounded-lg">
              <FileText size={14} className="mr-1.5" /> PDF
            </Button>
          </div>
        )}
      </div>

      {/* Date range filter */}
      <div className="bg-white rounded-xl border border-[#E5E5E8] p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <Label className="text-[12px] text-[#6B6B72]">Period Start</Label>
            <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="mt-1 text-[13px]" />
          </div>
          <div>
            <Label className="text-[12px] text-[#6B6B72]">Period End</Label>
            <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="mt-1 text-[13px]" />
          </div>
          <Button onClick={generateReport} disabled={calculating || loading}
            className="bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg text-[13px] h-9">
            {calculating ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Calculating...</> : "Generate Report"}
          </Button>
        </div>
      </div>

      {/* Report */}
      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="bg-white rounded-xl border border-[#E5E5E8] p-4">
              <p className="text-[11px] uppercase tracking-wider text-[#6B6B72]">Total Output Tax</p>
              <p className="text-[20px] font-semibold text-[#0F0F0F] mt-1">{formatR(report.summary.totalOutput)}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E5E5E8] p-4">
              <p className="text-[11px] uppercase tracking-wider text-[#6B6B72]">Total Input Tax</p>
              <p className="text-[20px] font-semibold text-[#0F0F0F] mt-1">{formatR(report.summary.totalInput)}</p>
            </div>
            <div className={`rounded-xl border p-4 ${report.summary.isRefund ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              <p className="text-[11px] uppercase tracking-wider text-[#6B6B72]">{report.summary.isRefund ? "Refundable" : "Payable"}</p>
              <p className="text-[20px] font-semibold text-[#0F0F0F] mt-1">{formatR(Math.abs(report.summary.netVAT))}</p>
            </div>
          </div>

          {/* Box breakdown */}
          <div className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E5E8]">
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Box</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">Value</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6B6B72] text-[11px] uppercase tracking-wider">VAT</th>
                  <th className="text-center px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {report.boxes.map(box => {
                  const isTotal = box.box === 3 || box.box === 6 || box.box === 7;
                  const isExpanded = expandedBox === box.box;
                  return (
                    <React.Fragment key={box.box}>
                      <tr
                        className={`border-b border-[#F1F1F4] hover:bg-[#F7F7FA] transition-colors ${isTotal ? "bg-[#F7F7FA] font-semibold" : ""} ${box.transactions.length > 0 ? "cursor-pointer" : ""}`}
                        onClick={() => box.transactions.length > 0 && setExpandedBox(isExpanded ? null : box.box)}
                      >
                        <td className="px-4 py-3 text-[#6B6B72]">Box {box.box}</td>
                        <td className="px-4 py-3 text-[#0F0F0F]">{box.label}</td>
                        <td className="px-4 py-3 text-right text-[#0F0F0F]">{formatR(box.value)}</td>
                        <td className="px-4 py-3 text-right text-[#0F0F0F]">{formatR(box.tax)}</td>
                        <td className="px-4 py-3 text-center">
                          {box.transactions.length > 0 && (isExpanded ? <ChevronDown size={14} className="text-[#6B6B72]" /> : <ChevronRight size={14} className="text-[#6B6B72]" />)}
                        </td>
                      </tr>
                      {isExpanded && box.transactions.length > 0 && (
                        <tr className="bg-white">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="pl-8 space-y-1 max-h-[200px] overflow-y-auto">
                              {box.transactions.map(tx => (
                                <div key={tx.id} className="flex justify-between text-[12px] py-1 border-b border-[#F1F1F4]">
                                  <span className="text-[#6B6B72]">{tx.date} — {tx.description}</span>
                                  <span className="text-[#0F0F0F] font-mono">{formatR(tx.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
