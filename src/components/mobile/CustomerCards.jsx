import React from "react";
import { Pencil, Trash2, Mail, Phone } from "lucide-react";
import { MobileList, MobileCard, MobileField, MobileActions, mobileActionClass } from "./MobileCards";

/** Phone view of the customer list. */
export default function CustomerCards({ customers, onEdit, onDelete }) {
  return (
    <MobileList>
      {customers.map((customer) => (
        <MobileCard key={customer.id}>
          <p className="text-[14px] font-semibold leading-snug" style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
            {customer.name}
          </p>

          {customer.email && (
            <p className="mt-1 flex items-start gap-1.5 text-[12px]" style={{ color: "var(--sb-muted)" }}>
              <Mail size={12} className="mt-0.5 flex-none" aria-hidden="true" />
              <span className="min-w-0" style={{ overflowWrap: "anywhere" }}>{customer.email}</span>
            </p>
          )}
          {customer.phone && (
            <p className="mt-1 flex items-start gap-1.5 text-[12px]" style={{ color: "var(--sb-muted)" }}>
              <Phone size={12} className="mt-0.5 flex-none" aria-hidden="true" />
              <span className="min-w-0" style={{ overflowWrap: "anywhere" }}>{customer.phone}</span>
            </p>
          )}

          <MobileField label="VAT no." value={customer.vat_number || "—"} />
          <MobileField label="Address" value={customer.address || "—"} />

          <MobileActions>
            <button
              type="button"
              onClick={() => onEdit(customer)}
              className={mobileActionClass}
              style={{ border: "1px solid var(--sb-border)", color: "var(--sb-ink)", background: "var(--sb-card)" }}
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(customer.id)}
              className={mobileActionClass}
              style={{ border: "1px solid var(--sb-border)", color: "#B3261E", background: "var(--sb-card)" }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </MobileActions>
        </MobileCard>
      ))}
    </MobileList>
  );
}
