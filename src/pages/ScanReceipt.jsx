import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { extractTextFromFile, isPasswordError, parseDocumentData } from "@/lib/documentExtraction";
import DocumentPasswordDialog from "@/components/documents/DocumentPasswordDialog";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, Send, CheckCircle2, Eye, Trash2, Receipt } from "lucide-react";
import ExtractedDataSheet from "@/components/documents/ExtractedDataSheet";
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
          className="sb-action-card sb-action-card--brand disabled:opacity-60"
        >
          <span className="sb-action-icon sb-action-icon--brand">
            {uploading ? <Loader2 size={26} className="animate-spin" /> : <Camera size={26} strokeWidth={1.6} />}
          </span>
          <span className="text-[15px] font-semibold tracking-tight">{uploading ? "Processing..." : "Take Photo"}</span>
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
          <div className="sb-action-card sb-action-card--outline h-full">
            <span className="sb-action-icon sb-action-icon--outline">
              <Upload size={26} strokeWidth={1.6} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-[#1A2E22]">Upload File</span>
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
        <div className="sb-empty p-12">
          <div className="sb-empty-icon"><Receipt size={24} strokeWidth={1.4} /></div>
          <p className="text-[15px] font-semibold text-[#1A2E22]">No receipts scanned yet</p>
          <p className="mt-1 text-[13px] text-[#5C7263]">Take a photo or upload a file to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => {
            const supplier = getOcrField(doc, "supplier_name");
            const total = getOcrField(doc, "total");
            const date = getOcrField(doc, "date");
            return (
              <div key={doc.id} className="sb-tile flex items-center gap-3.5 p-4">
                <div className="sb-tile-icon" aria-hidden="true">
                  <Receipt size={19} strokeWidth={1.6} />
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
                    <button onClick={() => viewExtracted(doc)} aria-label="View extracted data" className="sb-tile-action">
                      <Eye size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    aria-label="Delete receipt"
                    className="sb-tile-action sb-tile-action--danger disabled:opacity-50"
                  >
                    {deletingId === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Extracted data — full-screen on phones */}
      <ExtractedDataSheet
        doc={selectedDoc}
        data={ocrResult}
        onClose={() => setSelectedDoc(null)}
      />

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