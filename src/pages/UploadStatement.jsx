import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { extractBankTransactions, categorizeTransaction, STATEMENT_PERIOD_MISSING } from "@/lib/bankStatementExtraction";
import { isPasswordError } from "@/lib/documentExtraction";
import { autoAllocate } from "@/lib/bankRuleEngine";
import FilePasswordField from "@/components/documents/FilePasswordField";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Check, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function UploadStatement() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [password, setPassword] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (currentCompany) loadDocuments();
  }, [currentCompany]);

  const loadDocuments = async () => {
    try {
      const docs = await db.entities.Document.filter(
        { company_id: currentCompany.id, type: "bank_statement" },
        "-created_date"
      );
      setDocuments(docs);
    } catch (e) {
      // Keep whatever list is already on screen.
    }
    setLoadingDocuments(false);
  };

  const handleFile = (f) => {
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["pdf", "csv", "xlsx", "xls"].includes(ext)) {
      toast({ title: "Unsupported file type", description: "Please upload PDF, CSV, or Excel files", variant: "destructive" });
      return;
    }
    setFile(f);
    setPassword("");
    setResults(null);
  };

  const transactionCountOf = (doc) => {
    try {
      return JSON.parse(doc.extracted_data || "{}").transaction_count || 0;
    } catch (e) {
      return 0;
    }
  };

  const handleUpload = async () => {
    if (!file || !currentCompany) return;
    setUploading(true);
    setResults(null);
    try {
      // Read the statement first: nothing is stored, and a locked file asks for
      // its password, before any document record is created.
      const { transactions: txs, bank_name, summary, period, excluded_outside_period } =
        await extractBankTransactions(file, { password });

      if (txs.length === 0) {
        toast({
          title: "No transactions in this period",
          description: excluded_outside_period > 0
            ? `All ${excluded_outside_period} rows on this statement fall outside its period (${period.start} to ${period.end}).`
            : "We couldn't find any transaction rows in this statement. Try the original PDF, CSV or Excel file, or check that each row shows a date and an amount.",
          variant: "destructive",
        });
        return;
      }

      setUploading(false);
      setProcessing(true);

      const { file_url } = await db.integrations.Core.UploadFile({
        file,
        companyId: currentCompany.id,
        kind: "bank_statement",
      });

      const document = await db.entities.Document.create({
        company_id: currentCompany.id,
        name: file.name,
        type: "bank_statement",
        file_url,
        file_type: file.name.split(".").pop().toLowerCase(),
        status: "processing",
      });

      try {
        // Every extracted row is imported — no cap, in the statement's own order.
        let categorized = txs.map((tx) => {
          const cat = categorizeTransaction(tx.description, tx.amount);
          return {
            company_id: currentCompany.id,
            // Keeps the import tied to its statement, so removing the statement
            // removes these transactions with it.
            document_id: document.id,
            date: tx.date || new Date().toISOString().split("T")[0],
            description: tx.description || "Unknown",
            amount: Math.abs(tx.amount || 0),
            type: cat.type,
            category: cat.category,
            vat_amount: cat.vat_amount,
            fee: tx.fee || 0,
            balance: tx.balance ?? null,
            reference: tx.reference || "",
            source: "bank_statement",
            status: cat.confidence > 80 ? "allocated" : "unallocated",
            ai_confidence: cat.confidence,
            ai_reasoning: "",
            bank_name: bank_name || "",
          };
        });

        // Bank rules override the keyword categorization for matched transactions.
        let bankRules = [];
        try {
          bankRules = await db.entities.BankRule.filter({ company_id: currentCompany.id, is_active: true });
        } catch (e) {
          bankRules = [];
        }

        if (bankRules.length > 0) {
          categorized = autoAllocate(categorized, bankRules);
          const matched = categorized.filter((t) => t.status === "allocated" && t.ai_reasoning?.startsWith("Auto-matched"));
          if (matched.length > 0) {
            toast({ title: `${matched.length} transactions auto-matched by bank rules` });
          }
        }

        await db.entities.Transaction.bulkCreate(categorized);
        await db.entities.Document.update(document.id, {
          status: "processed",
          // Opening/closing balances and the statement's own totals live with the
          // document, so the transaction page can summarise it as printed.
          extracted_data: JSON.stringify({ ...summary, bank_name }),
        });

        setResults({
          total: txs.length,
          imported: categorized.length,
          bank: bank_name,
          period,
          excluded: excluded_outside_period || 0,
        });
        toast({ title: `${categorized.length} transactions imported and categorized` });
        setFile(null);
        setPassword("");
        await loadDocuments();
      } catch (error) {
        await db.entities.Document.update(document.id, { status: "error" }).catch(() => {});
        throw error;
      }
    } catch (e) {
      toast({
        title: isPasswordError(e)
          ? "Statement locked"
          : e.code === STATEMENT_PERIOD_MISSING
            ? "Statement period not found"
            : "Statement import failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleDelete = async (doc) => {
    setDeletingId(doc.id);
    try {
      // Counted before the delete: the statement's own transactions go with it.
      const removed = await db.entities.Transaction.count({ document_id: doc.id }).catch(() => 0);
      if (doc.file_url) {
        // Missing storage objects must not block removing the record.
        await db.integrations.Core.DeleteFile({ file_uri: doc.file_url }).catch(() => {});
      }
      await db.entities.Document.delete(doc.id);
      setDocuments((list) => list.filter((item) => item.id !== doc.id));
      toast({
        title: "Statement removed",
        description: removed > 0 ? `${removed} imported transaction${removed === 1 ? "" : "s"} removed` : undefined,
      });
    } catch (e) {
      toast({ title: "Could not remove statement", description: e.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
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
        <p className="text-[13px] text-[#6B6B72] mt-1">Upload PDF, CSV, or Excel bank statements — only the transactions in the period the statement covers are imported and categorized</p>
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
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileText size={20} className="shrink-0 text-[#2D5A43]" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#0F0F0F] truncate">{file.name}</p>
                <p className="text-[11px] text-[#6B6B72]">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <Button onClick={handleUpload} disabled={uploading || processing}
              className="shrink-0 bg-[#2D5A43] hover:bg-[#1F4030] text-white rounded-lg text-[13px] h-9 shadow-sm shadow-[#2D5A43]/20">
              {uploading ? <><Loader2 size={14} className="mr-2 animate-spin" /> Reading...</> :
               processing ? <><Loader2 size={14} className="mr-2 animate-spin" /> Importing...</> :
               "Process Statement"}
            </Button>
          </div>

          {/* Locked statements can be opened with their password */}
          <FilePasswordField
            id="statement-password"
            value={password}
            onChange={setPassword}
            hint="Only needed if the statement is locked. Used once to read the file — never stored."
          />
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
                {results.period && (
                  <p>
                    Period: {moment(results.period.start).format("DD MMM YYYY")} –{" "}
                    {moment(results.period.end).format("DD MMM YYYY")}
                  </p>
                )}
                <p>{results.total} transactions found, {results.imported} imported and categorized</p>
                {results.excluded > 0 && (
                  <p>
                    {results.excluded} row{results.excluded === 1 ? "" : "s"} outside the statement
                    period skipped
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded statements */}
      <div className="space-y-3">
        <div>
          <h2 className="text-[15px] font-medium text-[#0F0F0F]">Uploaded statements</h2>
          <p className="text-[12px] text-[#6B6B72] mt-0.5">
            Removing a statement deletes the stored file, its record, and the transactions it imported.
          </p>
        </div>

        {loadingDocuments ? (
          <div className="text-center py-8"><Loader2 size={20} className="animate-spin text-[#6B6B72] mx-auto" /></div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E5E8] p-6 text-center">
            <p className="text-[13px] text-[#6B6B72]">No statements uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl border border-[#E5E5E8] p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#EFF4F0] flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-[#2D5A43]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[#0F0F0F] truncate">{doc.name}</p>
                  <p className="text-[11px] text-[#6B6B72]">
                    {moment(doc.created_date).format("DD MMM YYYY")}
                    {transactionCountOf(doc) > 0 && ` · ${transactionCountOf(doc)} transactions`}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  aria-label={`Remove ${doc.name}`}
                  className="p-1.5 rounded-lg text-[#6B6B72] hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
