import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { extractTextFromFile, isPasswordError, parseDocumentData } from "@/lib/documentExtraction";
import DocumentPasswordDialog from "@/components/documents/DocumentPasswordDialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image, Loader2, Eye, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function Documents() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  // A locked document stays here until its password is entered.
  const [lockedFile, setLockedFile] = useState(null);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (currentCompany) loadDocs();
  }, [currentCompany]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      setDocuments(await db.entities.Document.filter({ company_id: currentCompany.id }, "-created_date"));
    } catch (e) {}
    setLoading(false);
  };

  const processDocument = async (file, type, password = "") => {
    setUploading(true);
    setPasswordError("");
    try {
      // Client-side extraction (OCR for images, text extraction for PDFs) — no AI needed.
      // Read first, so a locked document can ask for its password before it is stored.
      const rawText = await extractTextFromFile(file, { password });
      const extracted = parseDocumentData(rawText, type);

      const { file_url } = await db.integrations.Core.UploadFile({ file, companyId: currentCompany.id, kind: type });

      const doc = await db.entities.Document.create({
        company_id: currentCompany.id,
        name: file.name,
        type,
        file_url,
        file_type: file.name.split(".").pop().toLowerCase(),
        status: "processing"
      });

      await db.entities.Document.update(doc.id, {
        status: "processed",
        extracted_data: JSON.stringify(extracted)
      });

      await loadDocs();
      toast({ title: `${type === "receipt" ? "Receipt" : "Invoice"} processed` });
      return true;
    } catch (e) {
      if (isPasswordError(e)) {
        setLockedFile({ file, type });
        setPasswordError(e.message);
      } else {
        toast({ title: "Upload failed", description: e.message, variant: "destructive" });
      }
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    processDocument(file, type);
  };

  const handleUnlock = async (password) => {
    if (!lockedFile) return;
    const ok = await processDocument(lockedFile.file, lockedFile.type, password);
    if (ok) {
      setLockedFile(null);
      setPasswordError("");
    }
  };

  const viewExtracted = (doc) => {
    setSelectedDoc(doc);
    try { setOcrResult(JSON.parse(doc.extracted_data || "{}")); } catch (e) { setOcrResult(null); }
  };

  const handleDelete = async (doc) => {
    try {
      if (doc.file_url) {
        await db.integrations.Core.DeleteFile({ file_uri: doc.file_url });
      }
      await db.entities.Document.delete(doc.id);
      await loadDocs();
      toast({ title: "Document deleted" });
    } catch (e) {}
  };

  const formatR = (v) => `R ${(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Receipts</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">Receipts, invoices, and supporting documents</p>
        </div>
        <div className="flex flex-none flex-wrap gap-2">
          <label className="cursor-pointer">
            <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => handleUpload(e, "receipt")} />
            <Button variant="outline" className="rounded-lg text-[13px] h-9 pointer-events-none" disabled={uploading}>
              <Image size={14} className="mr-1.5" /> Upload Receipt
            </Button>
          </label>
          <label className="cursor-pointer">
            <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => handleUpload(e, "invoice")} />
            <Button className="bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg text-[13px] h-9 pointer-events-none" disabled={uploading}>
              <FileText size={14} className="mr-1.5" /> Upload Invoice
            </Button>
          </label>
        </div>
      </div>

      {uploading && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-[#3B82F6]" />
          <span className="text-[13px] text-[#0F0F0F]">Extracting document content...</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-[#6B6B72] mx-auto" /></div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-12 text-center">
          <FileText size={32} className="text-[#6B6B72] mx-auto mb-3" strokeWidth={1} />
          <p className="text-[15px] font-medium text-[#0F0F0F]">No documents yet</p>
          <p className="text-[13px] text-[#6B6B72] mt-1">Upload receipts and invoices for OCR extraction</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {documents.map(doc => (
            <div key={doc.id} className="bg-white rounded-xl border border-[#E5E5E8] p-4 hover:border-[#D0D0D4] transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.type === "receipt" ? "bg-green-50" : doc.type === "invoice" ? "bg-blue-50" : "bg-gray-50"}`}>
                    {doc.type === "receipt" ? <Image size={14} className="text-green-600" /> : <FileText size={14} className="text-blue-600" />}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#0F0F0F] truncate max-w-[150px]">{doc.name}</p>
                    <p className="text-[11px] text-[#6B6B72]">{moment(doc.created_date).format("DD MMM YYYY")}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  doc.status === "processed" ? "bg-green-50 text-green-700" :
                  doc.status === "processing" ? "bg-amber-50 text-amber-700" :
                  doc.status === "error" ? "bg-red-50 text-red-700" :
                  "bg-gray-100 text-gray-700"
                }`}>{doc.status}</span>
              </div>
              <div className="flex gap-1.5 mt-3">
                {doc.extracted_data && (
                  <button onClick={() => viewExtracted(doc)} className="text-[11px] text-[#3B82F6] hover:text-[#2563EB] font-medium flex items-center gap-1">
                    <Eye size={12} /> View Data
                  </button>
                )}
                <button onClick={() => handleDelete(doc)} className="text-[11px] text-[#6B6B72] hover:text-red-500 font-medium flex items-center gap-1 ml-auto">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
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
              {ocrResult.supplier_name && <div className="flex justify-between"><span className="text-[#6B6B72]">Supplier</span><span className="font-medium">{ocrResult.supplier_name}</span></div>}
              {ocrResult.vat_number && <div className="flex justify-between"><span className="text-[#6B6B72]">VAT Number</span><span className="font-medium">{ocrResult.vat_number}</span></div>}
              {ocrResult.date && <div className="flex justify-between"><span className="text-[#6B6B72]">Date</span><span className="font-medium">{ocrResult.date}</span></div>}
              {ocrResult.document_number && <div className="flex justify-between"><span className="text-[#6B6B72]">Document No.</span><span className="font-medium">{ocrResult.document_number}</span></div>}
              {ocrResult.line_items?.length > 0 && (
                <div className="pt-2 border-t border-[#E5E5E8]">
                  <p className="text-[11px] text-[#6B6B72] uppercase tracking-wider mb-2">Line Items</p>
                  {ocrResult.line_items.map((item, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span>{item.description}</span>
                      <span className="font-mono">{formatR(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t border-[#E5E5E8] space-y-1">
                {ocrResult.subtotal != null && <div className="flex justify-between"><span className="text-[#6B6B72]">Subtotal</span><span className="font-mono">{formatR(ocrResult.subtotal)}</span></div>}
                {ocrResult.vat_amount != null && <div className="flex justify-between"><span className="text-[#6B6B72]">VAT (15%)</span><span className="font-mono">{formatR(ocrResult.vat_amount)}</span></div>}
                {ocrResult.total != null && <div className="flex justify-between font-semibold text-[14px]"><span>Total</span><span className="font-mono">{formatR(ocrResult.total)}</span></div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password for a locked receipt or invoice */}
      <DocumentPasswordDialog
        open={!!lockedFile}
        fileName={lockedFile?.file?.name}
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