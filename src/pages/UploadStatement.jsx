import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { extractBankTransactions, categorizeTransaction } from "@/lib/bankStatementExtraction";
import { autoAllocate } from "@/lib/bankRuleEngine";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Check, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function UploadStatement() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f) => {
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["pdf", "csv", "xlsx", "xls"].includes(ext)) {
      toast({ title: "Unsupported file type", description: "Please upload PDF, CSV, or Excel files", variant: "destructive" });
      return;
    }
    setFile(f);
    setResults(null);
  };

  const handleUpload = async () => {
    if (!file || !currentCompany) return;
    setUploading(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file, companyId: currentCompany.id, kind: "bank_statement" });

      await db.entities.Document.create({
        company_id: currentCompany.id,
        name: file.name,
        type: "bank_statement",
        file_url,
        file_type: file.name.split(".").pop().toLowerCase(),
        status: "processing"
      });

      setUploading(false);
      setProcessing(true);

      // Client-side extraction — no AI needed
      const { transactions: txs, bank_name } = await extractBankTransactions(file);

      if (txs.length > 0) {
        // Load bank rules for auto-allocation
        let bankRules = [];
        try {
          bankRules = await db.entities.BankRule.filter({ company_id: currentCompany.id, is_active: true });
        } catch (e) {}

        // Apply categorization first
        let categorized = txs.slice(0, 100).map((tx) => {
          const cat = categorizeTransaction(tx.description, tx.amount);
          return {
            company_id: currentCompany.id,
            date: tx.date || new Date().toISOString().split("T")[0],
            description: tx.description || "Unknown",
            amount: Math.abs(tx.amount || 0),
            type: cat.type,
            category: cat.category,
            vat_amount: cat.vat_amount,
            reference: tx.reference || "",
            source: "bank_statement",
            status: cat.confidence > 80 ? "allocated" : "unallocated",
            ai_confidence: cat.confidence,
            ai_reasoning: "",
            bank_name: bank_name || ""
          };
        });

        // Then apply bank rules auto-allocation (overrides categorization for matched transactions)
        if (bankRules.length > 0) {
          categorized = autoAllocate(categorized, bankRules);
          const matched = categorized.filter(t => t.status === "allocated" && t.ai_reasoning?.startsWith("Auto-matched"));
          if (matched.length > 0) {
            toast({ title: `${matched.length} transactions auto-matched by bank rules` });
          }
        }

        const created = categorized;

        if (created.length > 0) {
          await db.entities.Transaction.bulkCreate(created);
        }

        await db.entities.Document.update(
          (await db.entities.Document.filter({ company_id: currentCompany.id, name: file.name }, "-created_date"))[0]?.id,
          { status: "processed" }
        );

        setResults({ total: txs.length, imported: created.length, bank: bank_name });
        toast({ title: `${created.length} transactions imported and categorized` });
      } else {
        toast({ title: "Could not extract transactions", description: "Please check the file format", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
    setUploading(false);
    setProcessing(false);
  };

  if (!currentCompany) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={32} className="text-[#6B6B72] mx-auto mb-3" />
        <p className="text-[15px] text-[#0F0F0F]">Please select or create a company first</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Upload Bank Statement</h1>
        <p className="text-[13px] text-[#6B6B72] mt-1">Upload PDF, CSV, or Excel bank statements for automatic extraction and categorization</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        className={`bg-white rounded-xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
        dragOver ? "border-[#2D5A43] bg-[#4A7C5E]/5" : "border-[#DDE6DF] hover:border-[#4A7C5E] hover:bg-[#EFF4F0]/50"
        }`}
        onClick={() => document.getElementById("file-input").click()}
      >
        <input id="file-input" type="file" accept=".pdf,.csv,.xlsx,.xls" className="hidden" onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
        <div className="w-14 h-14 rounded-2xl bg-[#EFF4F0] flex items-center justify-center mx-auto mb-3">
          <Upload size={28} className="text-[#2D5A43]" strokeWidth={1.5} />
        </div>
        <p className="text-[14px] font-medium text-[#0F0F0F]">Drop your bank statement here</p>
        <p className="text-[12px] text-[#6B6B72] mt-1">or click to browse — PDF, CSV, Excel supported</p>
      </div>

      {/* Selected file */}
      {file && (
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-[#2D5A43]" />
            <div>
              <p className="text-[13px] font-medium text-[#0F0F0F]">{file.name}</p>
              <p className="text-[11px] text-[#6B6B72]">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <Button onClick={handleUpload} disabled={uploading || processing}
            className="bg-[#2D5A43] hover:bg-[#1F4030] text-white rounded-lg text-[13px] h-9 shadow-sm shadow-[#2D5A43]/20">
            {uploading ? <><Loader2 size={14} className="mr-2 animate-spin" /> Uploading...</> :
             processing ? <><Loader2 size={14} className="mr-2 animate-spin" /> Processing...</> :
             "Process Statement"}
          </Button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-5">
          <div className="flex items-start gap-3">
            <Check size={20} className="text-[#22C55E] mt-0.5" />
            <div>
              <p className="text-[14px] font-medium text-[#0F0F0F]">Statement processed successfully</p>
              <div className="text-[12px] text-[#6B6B72] mt-1 space-y-0.5">
                {results.bank && <p>Bank: {results.bank}</p>}
                <p>{results.total} transactions found, {results.imported} imported and categorized</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}