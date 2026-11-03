import React from "react";
import { FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const formatR = (v) => `R ${(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

/** One label/value line inside a section card. */
function DetailRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
      <span className="shrink-0 text-[12px]" style={{ color: "var(--sb-muted)" }}>
        {label}
      </span>
      <span
        className="min-w-0 flex-1 text-right text-[12.5px] font-semibold"
        style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}
      >
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.09em]" style={{ color: "var(--sb-muted)" }}>
      {children}
    </p>
  );
}

function SectionCard({ children }) {
  return (
    <div
      className="divide-y divide-[var(--sb-border)] overflow-hidden rounded-2xl border"
      style={{ borderColor: "var(--sb-border)", background: "var(--sb-card)" }}
    >
      {children}
    </div>
  );
}

/**
 * Extracted document data. Full-screen sheet on phones, centred dialog on wider
 * screens — long file names wrap instead of being clipped.
 */
export default function ExtractedDataSheet({ doc, data, onClose }) {
  const hasDetails = data && (data.supplier_name || data.vat_number || data.date || data.document_number);
  const items = data?.line_items || [];
  const hasTotals = data && (data.subtotal != null || data.vat_amount != null || data.total != null);

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="left-0 top-0 flex h-[100dvh] max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[26px] sm:border sm:p-5">
        <DialogHeader className="flex-none space-y-0 border-b px-5 pb-4 pt-5 text-left sm:border-0 sm:p-0">
          <div className="flex items-start gap-3 pr-6">
            <span
              className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl"
              style={{ background: "var(--sb-soft)", color: "var(--sb-brand)" }}
            >
              <FileText size={17} strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-[15px] font-semibold leading-tight" style={{ color: "var(--sb-ink)" }}>
                Extracted data
              </DialogTitle>
              <p className="mt-1 text-[11.5px] leading-snug" style={{ color: "var(--sb-muted)", overflowWrap: "anywhere" }}>
                {doc?.name}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-0 sm:py-0">
          {data?.total != null && (
            <div className="rounded-2xl px-4 py-3.5" style={{ background: "var(--sb-soft)" }}>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.09em]" style={{ color: "var(--sb-muted)" }}>
                Total
              </p>
              <p className="sb-money mt-1 text-[24px] font-bold leading-none" style={{ color: "var(--sb-ink)" }}>
                {formatR(data.total)}
              </p>
            </div>
          )}

          {hasDetails && (
            <div>
              <SectionLabel>Document details</SectionLabel>
              <SectionCard>
                <DetailRow label="Supplier" value={data.supplier_name} />
                <DetailRow label="VAT number" value={data.vat_number} />
                <DetailRow label="Date" value={data.date} />
                <DetailRow label="Document no." value={data.document_number} />
              </SectionCard>
            </div>
          )}

          {items.length > 0 && (
            <div>
              <SectionLabel>Transactions ({items.length})</SectionLabel>
              <SectionCard>
                {items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1 text-[12.5px]" style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
                      {item.description || "—"}
                    </span>
                    <span className="sb-money shrink-0 text-[12.5px] font-semibold" style={{ color: "var(--sb-ink)" }}>
                      {formatR(item.amount)}
                    </span>
                  </div>
                ))}
              </SectionCard>
            </div>
          )}

          {hasTotals && (
            <div>
              <SectionLabel>Summary</SectionLabel>
              <SectionCard>
                <DetailRow label="Subtotal" value={data.subtotal != null ? formatR(data.subtotal) : null} />
                <DetailRow label="VAT (15%)" value={data.vat_amount != null ? formatR(data.vat_amount) : null} />
                <DetailRow label="Total" value={data.total != null ? formatR(data.total) : null} />
              </SectionCard>
            </div>
          )}

          {!hasDetails && items.length === 0 && !hasTotals && (
            <p className="py-10 text-center text-[13px]" style={{ color: "var(--sb-muted)" }}>
              No data could be read from this document.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
