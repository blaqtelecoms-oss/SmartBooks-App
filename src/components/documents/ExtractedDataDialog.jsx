import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Shortens a long file name to a compact summary that always fits the dialog.
 * Tapping the name in the dialog reveals it in full.
 */
function compactName(name = "") {
  if (name.length <= 30) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base.slice(0, 16)}…${base.slice(-8)}${ext}`;
}

const formatR = (v) => `R ${(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

/** Label/value line that wraps inside the dialog instead of widening it. */
function Row({ label, value, mono = false, strong = false }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-[#5C7263]">{label}</span>
      <span
        className={`min-w-0 flex-1 text-right ${strong ? "text-[14px] font-semibold" : "font-medium"} ${mono ? "font-mono" : ""}`}
        style={{ overflowWrap: "anywhere" }}
      >
        {value}
      </span>
    </div>
  );
}

/** Extracted receipt/invoice data, sized to fit a phone screen. */
export default function ExtractedDataDialog({ doc, data, onClose, documentNumberLabel = "Document No." }) {
  const [expanded, setExpanded] = useState(false);
  const name = doc?.name || "";

  return (
    <Dialog open={!!doc} onOpenChange={(open) => { if (!open) { setExpanded(false); onClose(); } }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="min-w-0 pr-7 text-[16px] leading-snug">
            <span className="block text-[11px] uppercase tracking-[0.08em]" style={{ color: "var(--sb-muted)" }}>
              Extracted data
            </span>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              title={name}
              className="mt-1 block w-full text-left text-[16px] font-semibold leading-snug"
              style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}
            >
              {expanded ? name : compactName(name)}
            </button>
          </DialogTitle>
        </DialogHeader>

        {data && (
          <div className="mt-2 space-y-3 text-[13px]">
            <Row label="Supplier" value={data.supplier_name} />
            <Row label="VAT Number" value={data.vat_number} />
            <Row label="Date" value={data.date} />
            <Row label={documentNumberLabel} value={data.document_number} />

            {data.line_items?.length > 0 && (
              <div className="border-t pt-2" style={{ borderColor: "var(--sb-border)" }}>
                <p className="mb-2 text-[11px] uppercase tracking-wider" style={{ color: "var(--sb-muted)" }}>
                  Transactions ({data.line_items.length})
                </p>
                {data.line_items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 py-1">
                    <span className="min-w-0 flex-1" style={{ overflowWrap: "anywhere" }}>{item.description}</span>
                    <span className="shrink-0 font-mono">{formatR(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1 border-t pt-2" style={{ borderColor: "var(--sb-border)" }}>
              <Row label="Subtotal" value={data.subtotal != null ? formatR(data.subtotal) : null} mono />
              <Row label="VAT (15%)" value={data.vat_amount != null ? formatR(data.vat_amount) : null} mono />
              <Row label="Total" value={data.total != null ? formatR(data.total) : null} mono strong />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
