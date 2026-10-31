import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { MobileList, MobileCard, MobileActions, mobileActionClass } from "./MobileCards";

const TYPE_LABEL = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
  vat: "VAT",
  paye: "PAYE",
};

const money = (value) =>
  `R ${(value || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

/** Phone view of the chart of accounts: one card per account. */
export default function AccountCards({ accounts, onEdit, onDelete }) {
  return (
    <MobileList>
      {accounts.map((acct) => (
        <MobileCard key={acct.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold leading-snug" style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
                {acct.name}
              </p>
              <p className="mt-1 text-[11.5px]" style={{ color: "var(--sb-muted)" }}>
                {acct.code}
                {TYPE_LABEL[acct.type] ? ` · ${TYPE_LABEL[acct.type]}` : ""}
                {acct.sub_type ? ` · ${acct.sub_type}` : ""}
              </p>
            </div>
            <span className="sb-money shrink-0 text-[13px] font-semibold" style={{ color: "var(--sb-ink)" }}>
              {money(acct.balance)}
            </span>
          </div>

          <MobileActions>
            <button
              type="button"
              onClick={() => onEdit(acct)}
              className={mobileActionClass}
              style={{ border: "1px solid var(--sb-border)", color: "var(--sb-ink)", background: "var(--sb-card)" }}
            >
              <Pencil size={13} /> Edit
            </button>
            {!acct.is_system && (
              <button
                type="button"
                onClick={() => onDelete(acct.id)}
                className={mobileActionClass}
                style={{ border: "1px solid var(--sb-border)", color: "#B3261E", background: "var(--sb-card)" }}
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </MobileActions>
        </MobileCard>
      ))}
    </MobileList>
  );
}
