import React from "react";
import { Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { MobileList, MobileCard, MobileField, MobileActions, mobileActionClass } from "./MobileCards";

/** Phone view of the allocation rules table. */
export default function AllocationRuleCards({ rules, onDelete, onToggle }) {
  return (
    <MobileList>
      {rules.map((rule) => (
        <MobileCard key={rule.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold leading-snug" style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
                {rule.match_value}
              </p>
              <p className="mt-1 text-[11.5px]" style={{ color: "var(--sb-muted)" }}>
                {rule.match_field} {rule.match_type}
                {rule.vat_applicable ? " · VAT 15%" : ""}
              </p>
            </div>
            <Switch
              checked={rule.is_active}
              onCheckedChange={() => onToggle(rule.id, rule.is_active)}
              aria-label={`Toggle rule ${rule.match_value}`}
            />
          </div>

          <MobileField label="Target account" value={rule.account_name || "—"} />
          <MobileField label="Source" value={rule.source === "ai_learned" ? "AI learned" : "Manual"} />
          <MobileField label="Applied" value={`${rule.times_applied || 0}×`} />

          <MobileActions>
            <button
              type="button"
              onClick={() => onDelete(rule.id)}
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
