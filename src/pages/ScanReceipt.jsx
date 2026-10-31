import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { extractTextFromFile, isPasswordError, parseDocumentData } from "@/lib/documentExtraction";
import DocumentPasswordDialog from "@/components/documents/DocumentPasswordDialog";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, Send, CheckCircle2, Eye, Trash2, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function ScanReceipt() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  // A locked receipt stays here until its password is entered.
  const [lockedFile, setLockedFile] = useState(null);
  const [passwordError, setPasswordError] = useState("");
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentCompany) loadDocs();
  }, [currentCompany]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const result = await db.entities.Document.filter(
        { company_id: currentCompany.id, type: "receipt" },
        { sort: "-created_date", limit: 50 }
      );
      setDocuments(result.items || result);
    } catch (e) {}
    setLoading(false);
  };

  const processReceipt = async (file, password = "") => {
    setUploading(true);
    setPasswordError("");
    try {
      // Client-side extraction (OCR for images, text extraction for PDFs) — no AI needed.
      // Read first, so a locked receipt can ask for its password before it is stored.
      const rawText = await extractTextFromFile(file, { password });
      const extracted = parseDocumentData(rawText, "receipt");

      const { file_uri } = await db.integrations.Core.UploadPrivateFile({ file, companyId: currentCompany.id, kind: "receipt" });

      const doc = await db.entities.Document.create({
        company_id: currentCompany.id,
        name: file.name,
        type: "receipt",
        file_url: file_uri,
        file_type: file.name.split(".").pop().toLowerCase(),
        status: "processing",
        submitted: false
      });

      await db.entities.Document.update(doc.id, {
        status: "processed",
        extracted_data: JSON.stringify(extracted)
      });

      await loadDocs();
      toast({ title: "Receipt scanned and processed" });
      return true;
    } catch (e) {
      if (isPasswordError(e)) {
        setLockedFile(file);
        setPasswordError(e.message);
      } else {
        toast({ title: "Scan failed", description: e.message, variant: "destructive" });
      }
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    processReceipt(file);
  };

  const handleUnlock = async (password) => {
    if (!lockedFile) return;
    const ok = await processReceipt(lockedFile, password);
    if (ok) {
      setLockedFile(null);
      setPasswordError("");
    }
  };

  const handleCamera = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleSubmit = async (doc) => {
    try {
      await db.entities.Document.update(doc.id, {
        submitted: true,
        submitted_date: moment().format("YYYY-MM-DD")
      });
      await loadDocs();
      toast({ title: "Receipt submitted to accountant" });
    } catch (e) {
      toast({ title: "Failed to submit", variant: "destructive" });
    }
  };

  const viewExtracted = (doc) => {
    setSelectedDoc(doc);
    try { setOcrResult(JSON.parse(doc.extracted_data || "{}")); } catch (e) { setOcrResult(null); }
  };

  const handleDelete = async (doc) => {
    setDeletingId(doc.id);
    try {
      if (doc.file_url) {
        // A file that is already gone must not block removing the record.
        await db.integrations.Core.DeleteFile({ file_uri: doc.file_url }).catch(() => {});
      }
      await db.entities.Document.delete(doc.id);
      await loadDocs();
      toast({ title: "Receipt deleted" });
    } catch (e) {
      toast({ title: "Could not delete receipt", description: e.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const formatR = (v) => `R ${(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  const getOcrField = (doc, field) => {
    try {
      const data = JSON.parse(doc.extracted_data || "{}");
      return data[field];
    } catch (e) { return null; }
  };

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">No business found</p>;

  const pendingCount = documents.filter(d => !d.submitted && d.status === "processed").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-medium text-[#1A2E22] tracking-tight">Scan Receipt</h1>
        <p className="text-[13px] text-[#5C7263] mt-1">Scan slips and receipts so they're stored safely and never get lost or damaged</p>
      </div>

      {/* Scan actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-3 bg-[#2D5A43] text-white rounded-2xl p-8 hover:bg-[#1F4030] transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={32} className="animate-spin" /> : <Camera size={32} strokeWidth={1.5} />}
          <span className="text-[15px] font-medium">{uploading ? "Processing..." : "Take Photo"}</span>
          <span className="text-[12px] text-white/70">Use camera to scan a slip</span>
        </button>

        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            onChange={handleCamera}
          />
          <div className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-[#DDE6DF] rounded-2xl p-8 hover:border-[#2D5A43] transition-colors h-full">
            <Upload size={32} className="text-[#2D5A43]" strokeWidth={1.5} />
            <span className="text-[15px] font-medium text-[#1A2E22]">Upload File</span>
            <span className="text-[12px] text-[#5C7263]">Choose an image or PDF</span>
          </div>
        </label>

        <input
          ref={cameraInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={handleCamera}
        />
      </div>

      {uploading && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-[#3B82F6]" />
          <span className="text-[13px] text-[#1A2E22]">Extracting receipt data...</span>
        </div>
      )}

      {/* Pending submission banner */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-amber-600" />
            <span className="text-[13px] text-[#1A2E22] font-medium">{pendingCount} receipt{pendingCount > 1 ? "s" : ""} ready to submit to your accountant</span>
          </div>
        </div>
      )}

      {/* Receipt list */}
      {loading ? (
        <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-[#5C7263] mx-auto" /></div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#DDE6DF] p-12 text-center">
          <Receipt size={32} className="text-[#5C7263] mx-auto mb-3" strokeWidth={1} />
          <p className="text-[15px] font-medium text-[#1A2E22]">No receipts scanned yet</p>
          <p className="text-[13px] text-[#5C7263] mt-1">Take a photo or upload a file to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => {
            const supplier = getOcrField(doc, "supplier_name");
            const total = getOcrField(doc, "total");
            const date = getOcrField(doc, "date");
            return (
              <div key={doc.id} className="bg-white rounded-xl border border-[#DDE6DF] p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#EFF4F0] flex items-center justify-center flex-shrink-0">
                  <Receipt size={20} className="text-[#2D5A43]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#1A2E22] truncate">{supplier || doc.name}</p>
                  <p className="text-[12px] text-[#5C7263] mt-0.5">
                    {date ? moment(date).format("DD MMM YYYY") : moment(doc.created_date).format("DD MMM YYYY")}
                    {total != null && ` · ${formatR(total)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.submitted ? (
                    <span className="sb-chip sb-chip-green">
                      <CheckCircle2 size={12} /> Submitted
                    </span>
                  ) : doc.status === "processed" ? (
                    <Button
                      size="sm"
                      className="h-8 text-[12px] bg-[#2D5A43] hover:bg-[#1F4030]"
                      onClick={() => handleSubmit(doc)}
                    >
                      <Send size={12} className="mr-1" /> Submit
                    </Button>
                  ) : doc.status === "processing" ? (
                    <span className="sb-chip sb-chip-amber">Processing</span>
                  ) : (
                    <span className="sb-chip">{doc.status}</span>
                  )}
                  {doc.extracted_data && (
                    <button onClick={() => viewExtracted(doc)} className="p-1.5 rounded-lg hover:bg-[#EFF4F0] text-[#5C7263] hover:text-[#2D5A43]">
                      <Eye size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-[#5C7263] hover:text-red-500 disabled:opacity-50"
                  >
                    {deletingId === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* OCR Result Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[16px]">Extracted Data — {selectedDoc?.name}</DialogTitle>
          </DialogHeader>
          {ocrResult && (
            <div className="space-y-3 mt-2 text-[13px]">
              {ocrResult.supplier_name && <div className="flex justify-between"><span className="text-[#5C7263]">Supplier</span><span className="font-medium">{ocrResult.supplier_name}</span></div>}
              {ocrResult.vat_number && <div className="flex justify-between"><span className="text-[#5C7263]">VAT Number</span><span className="font-medium">{ocrResult.vat_number}</span></div>}
              {ocrResult.date && <div className="flex justify-between"><span className="text-[#5C7263]">Date</span><span className="font-medium">{ocrResult.date}</span></div>}
              {ocrResult.document_number && <div className="flex justify-between"><span className="text-[#5C7263]">Receipt No.</span><span className="font-medium">{ocrResult.document_number}</span></div>}
              {ocrResult.line_items?.length > 0 && (
                <div className="pt-2 border-t border-[#E5E5E8]">
                  <p className="text-[11px] text-[#5C7263] uppercase tracking-wider mb-2">
                    Transactions ({ocrResult.line_items.length})
                  </p>
                  {ocrResult.line_items.map((item, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span>{item.description}</span>
                      <span className="font-mono">{formatR(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t border-[#E5E5E8] space-y-1">
                {ocrResult.subtotal != null && <div className="flex justify-between"><span className="text-[#5C7263]">Subtotal</span><span className="font-mono">{formatR(ocrResult.subtotal)}</span></div>}
                {ocrResult.vat_amount != null && <div className="flex justify-between"><span className="text-[#5C7263]">VAT (15%)</span><span className="font-mono">{formatR(ocrResult.vat_amount)}</span></div>}
                {ocrResult.total != null && <div className="flex justify-between font-semibold text-[14px]"><span>Total</span><span className="font-mono">{formatR(ocrResult.total)}</span></div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password for a locked receipt */}
      <DocumentPasswordDialog
        open={!!lockedFile}
        fileName={lockedFile?.name}
        error={passwordError}
        busy={uploading}
        onSubmit={handleUnlock}
        onClose={() => {
          setLockedFile(null);
          setPasswordError("");
        }}
      />
    </div>
  );
}