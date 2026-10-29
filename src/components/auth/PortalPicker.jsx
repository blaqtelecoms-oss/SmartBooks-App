import { Building2, Calculator, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const PORTALS = [
  {
    id: "business",
    label: "Business",
    description: "Owners & SMEs",
    icon: Building2,
  },
  {
    id: "accountant",
    label: "Accountant",
    description: "Multi-client books",
    icon: Calculator,
  },
];

/** Compact two-option portal choice, shown inline so sign-in stays on one page. */
export default function PortalPicker({ value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose your portal"
      className="grid grid-cols-2 gap-2.5"
    >
      {PORTALS.map(({ id, label, description, icon: Icon }) => {
        const active = value === id;

        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-all",
              active
                ? "border-[#0F5132] bg-[#F1F7F2]"
                : "border-[#E3E9E4] bg-white hover:border-[#B9CCC2]"
            )}
          >
            <span
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors",
                active ? "bg-[#0F5132] text-white" : "bg-[#F1F4EF] text-[#0F5132]"
              )}
            >
              <Icon size={17} strokeWidth={1.7} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-[#0B1F1A]">
                {label}
              </span>
              <span className="block truncate text-[11px] text-[#5B6B64]">
                {description}
              </span>
            </span>
            {active && (
              <Check
                size={13}
                strokeWidth={3}
                className="absolute right-2 top-2 text-[#0F5132]"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
