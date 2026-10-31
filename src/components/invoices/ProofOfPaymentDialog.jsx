import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Paperclip } from "lucide-react";
import { db } from "@/api/supabaseClient";

/**
 * Collects the proof of payment an invoice needs before it can be marked paid.
 * The file goes to the app's existing private "uploads" bucket; only once that
 * upload succeeds does `onPaid(storagePath)` update the invoice and post it to
 * the transaction history. A failed upload leaves the invoice unpaid.
 */
export default function ProofOfPaymentDialog({ invoice, companyId, onClose, onPaid }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Every invoice starts with an empty proof field.
  useEffect(() => {
    setFile(null);
    setError("");
    setBusy(false);
  }, [invoice?.id]);

  const formatR = (v) => `R ${(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  const handleConfirm = async () => {
    if (!file) {
      setError("Attach the proof of payment to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { file_url } = await db.integrations.Core.UploadFile({
        file,
        companyId,
        kind: "proof_of_payment",
      });
      await onPaid(file_url);
    } catch (e) {
      setError(e.message || "Upload failed — the invoice stays unpaid.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px]">Confirm payment</DialogTitle>
        </DialogHeader>
        {invoice && (
          <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between text-[13px] py-2 border-b border-[#F1F1F4]">
              <span className="text-[#6B6B72]">{invoice.invoice_number}</span>
              <span className="font-semibold text-[#0F0F0F]">{formatR(invoice.total_amount)}</span>
            </div>
            <div>
              <Label className="text-[12px] text-[#6B6B72]">Proof of payment</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setError(""); }}
                className="mt-1 text-[13px]"
              />
              <p className="text-[11px] text-[#6B6B72] mt-1">
                Required — attach the bank confirmation, receipt or screenshot showing this invoice was paid.
              </p>
            </div>
            {error && <p className="text-[12px] text-red-600">{error}</p>}
            <Button
              onClick={handleConfirm}
              disabled={busy || !file}
              className="w-full bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg"
            >
              {busy
                ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Uploading proof…</>
                : <><Paperclip size={14} className="mr-1.5" /> Upload proof &amp; mark paid</>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
