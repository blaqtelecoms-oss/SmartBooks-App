import React, { useState } from "react";
import moment from "moment";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Loader2, ArrowDownLeft, ArrowUpRight, ChevronDown, Check } from "lucide-react";
import { formatRand } from "@/lib/money";

const isPlaceholderCategory = (category) =>
  !category || category.trim().toLowerCase() === "uncategorized";

const categoryLabel = (tx) =>
  tx.account_name || (isPlaceholderCategory(tx.category) ? null : tx.category);

/** One label/value line in the full transaction record. */
const DetailRow = ({ label, value }) => {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0" style={{ color: "var(--sb-muted)" }}>{label}</span>
      <span className="min-w-0 break-words text-right font-semibold" style={{ color: "var(--sb-ink)" }}>{value}</span>
    </div>
  );
};

/**
 * The complete transaction record plus allocation controls. On phones it rises
 * from the bottom edge the way banking apps present a movement's detail.
 */
export default function TransactionDetailSheet({
  tx,
  onClose,
  accounts,
  statements,
  onAllocate,
  onExplain,
  allocating,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!tx) return null;

  const isIn = tx.type === "credit";
  const statement = statements.find((doc) => doc.id === tx.document_id);
  const allocatedAccount = accounts.find((a) => a.id === tx.account_id);

  return (
    <Dialog open={!!tx} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-h-[90vh] !bottom-0 !top-auto !left-0 !w-full !translate-x-0 !translate-y-0 rounded-t-[24px] rounded-b-none pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:!bottom-auto sm:!top-[50%] sm:!left-[50%] sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:rounded-b-[26px]"
      >
        <DialogHeader>
          <DialogTitle className="sr-only">Transaction details</DialogTitle>
          <div className="flex items-start gap-3 pr-6 text-left">
            <span
              className="grid h-11 w-11 flex-none place-items-center rounded-full"
              style={{
                background: isIn ? "var(--sb-green-bg)" : "var(--sb-soft)",
                color: isIn ? "var(--sb-green-ink)" : "var(--sb-muted)",
              }}
              aria-hidden="true"
            >
              {isIn
                ? <ArrowDownLeft size={18} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
                : <ArrowUpRight size={18} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />}
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold leading-snug" style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
                {tx.description}
              </p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--sb-muted)" }}>
                {moment(tx.date).format("DD MMM YYYY")}
                {tx.reference ? ` · ${tx.reference}` : ""}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-wrap items-end justify-between gap-2">
          <p
            className="sb-money"
            style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: isIn ? "var(--sb-green-ink)" : "var(--sb-ink)" }}
          >
            {isIn ? "+" : "−"}{formatRand(Math.abs(tx.amount || 0))}
          </p>
          <span className={tx.status === "unallocated" ? "sb-chip sb-chip-amber" : "sb-chip sb-chip-green"}>
            {tx.status}
          </span>
        </div>

        {/* Allocation */}
        <div className="rounded-[16px] p-3.5" style={{ background: "var(--sb-soft)" }}>
          <p className="sb-label">Allocate to account</p>
          {accounts.length > 0 ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setPickerOpen((open) => !open)}
                aria-expanded={pickerOpen}
                className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[12px] px-3 text-left text-[13px]"
                style={{ background: "var(--sb-card)", border: "1px solid var(--sb-border)" }}
              >
                <span
                  className="min-w-0 truncate font-semibold"
                  style={{ color: allocatedAccount || categoryLabel(tx) ? "var(--sb-ink)" : "var(--sb-muted)" }}
                >
                  {allocatedAccount ? `${allocatedAccount.code} – ${allocatedAccount.name}` : (categoryLabel(tx) || "Choose an account")}
                </span>
                <ChevronDown size={15} style={{ color: "var(--sb-muted)" }} aria-hidden="true" />
              </button>

              {pickerOpen && (
                <div
                  className="mt-2 max-h-56 overflow-y-auto rounded-[12px]"
                  style={{ background: "var(--sb-card)", border: "1px solid var(--sb-border)" }}
                >
                  {accounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { onAllocate(tx.id, a.id); setPickerOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-[var(--sb-soft)]"
                      style={{ borderBottom: "1px solid var(--sb-border)" }}
                    >
                      <span className="min-w-0 flex-1 truncate" style={{ color: "var(--sb-ink)" }}>{a.code} – {a.name}</span>
                      {tx.account_id === a.id && <Check size={15} style={{ color: "var(--sb-green-ink)" }} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              )}

              {allocating && (
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--sb-muted)" }}>
                  <Loader2 size={12} className="animate-spin" /> Saving allocation…
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-[12.5px] font-semibold" style={{ color: "var(--sb-ink)" }}>
              {categoryLabel(tx) || "No chart of accounts yet"}
            </p>
          )}
        </div>

        {/* Full record */}
        <div className="space-y-1.5 rounded-[16px] p-4 text-[13px]" style={{ background: "var(--sb-soft)" }}>
          <DetailRow label="Type" value={isIn ? "Credit" : "Debit"} />
          <DetailRow label="Category" value={categoryLabel(tx) || "Uncategorized"} />
          <DetailRow label="Account" value={tx.account_name} />
          <DetailRow label="Reference" value={tx.reference} />
          <DetailRow label="Fee" value={tx.fee ? formatRand(tx.fee) : null} />
          <DetailRow label="Running balance" value={tx.balance != null ? formatRand(tx.balance) : null} />
          <DetailRow label="Bank" value={tx.bank_name} />
          <DetailRow label="Statement" value={statement?.name} />
          <DetailRow label="Source" value={tx.source} />
          <DetailRow label="AI confidence" value={tx.ai_confidence != null ? `${tx.ai_confidence}%` : null} />
          <DetailRow label="Imported" value={tx.created_date ? moment(tx.created_date).format("DD MMM YYYY HH:mm") : null} />
        </div>

        <button
          type="button"
          onClick={() => onExplain(tx)}
          className="sb-btn sb-btn-outline w-full"
        >
          <Sparkles size={15} style={{ color: "var(--sb-brand-2)" }} /> Explain with AI
        </button>
      </DialogContent>
    </Dialog>
  );
}
