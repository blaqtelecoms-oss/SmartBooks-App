import React from "react";
import { Trash2, Paperclip } from "lucide-react";
import { MobileList, MobileCard, MobileField, MobileActions, mobileActionClass } from "./MobileCards";

const statusChip = (status) => {
  if (status === "paid") return "sb-chip sb-chip-green";
  if (status === "sent") return "sb-chip sb-chip-blue";
  if (status === "overdue") return "sb-chip sb-chip-red";
  return "sb-chip";
};

/** Phone view of the invoice register. */
export default function InvoiceCards({ invoices, contacts, onProof, onPay, onDelete, formatR }) {
  return (
    <MobileList>
      {invoices.map((inv) => {
        const contact = contacts.find((c) => c.id === inv.contact_id);
        return (
          <MobileCard key={inv.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold" style={{ color: "var(--sb-ink)" }}>
                  {inv.invoice_number}
                </p>
                <p className="mt-1 text-[12.5px]" style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
                  {contact?.name || "—"}
                </p>
              </div>
              <span className={`shrink-0 ${statusChip(inv.status)}`}>
                {inv.status}
              </span>
            </div>

            <p className="sb-money mt-2 text-[17px] font-bold" style={{ color: "var(--sb-ink)" }}>
              {formatR(inv.total_amount)}
            </p>

            <MobileField label="Due date" value={inv.due_date} />

            <MobileActions>
              {inv.proof_of_payment_url && (
                <button
                  type="button"
                  onClick={() => onProof(inv)}
                  className={mobileActionClass}
                  style={{ border: "1px solid var(--sb-border)", color: "var(--sb-ink)", background: "var(--sb-card)" }}
                >
                  <Paperclip size={12} /> Proof
                </button>
              )}
              {inv.status !== "paid" && (
                <button
                  type="button"
                  onClick={() => onPay(inv)}
                  className={mobileActionClass}
                  style={{ background: "var(--sb-brand-2)", color: "#FFFFFF" }}
                >
                  Mark Paid
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(inv.id)}
                aria-label={`Delete ${inv.invoice_number}`}
                className={mobileActionClass}
                style={{ border: "1px solid var(--sb-border)", color: "#B3261E", background: "var(--sb-card)" }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </MobileActions>
          </MobileCard>
        );
      })}
    </MobileList>
  );
}
