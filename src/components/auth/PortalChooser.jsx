import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountantIcon, BusinessIcon } from "./PortalIcons";

const PORTALS = [
  {
    id: "business",
    label: "Business",
    description: "Owners & SMEs running their own books",
    icon: BusinessIcon,
    highlights: [
      "Bookkeeping, VAT and SARS-ready reports",
      "Scan receipts and import bank statements",
      "Invoices, expenses, debtors and creditors",
    ],
  },
  {
    id: "accountant",
    label: "Accountant",
    description: "Practices managing many client sets of books",
    icon: AccountantIcon,
    highlights: [
      "Every client company under one login",
      "Switch between client books without signing out",
      "Review and submit client documents",
    ],
  },
];

/**
 * Full-size portal choice for the standalone portal step: roomy cards with a
 * short explanation of what each portal gives you and a soft cool gradient
 * behind the detail section.
 */
export default function PortalChooser({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Choose your portal" className="space-y-3.5">
      {PORTALS.map(({ id, label, description, icon: Icon, highlights }) => {
        const active = value === id;

        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              "group block w-full overflow-hidden rounded-2xl border text-left transition-all duration-200",
              active
                ? "border-[#0F5132] shadow-[0_18px_40px_-24px_rgba(15,81,50,0.55)]"
                : "border-[#E3E9E4] hover:border-[#B9CCC2] hover:shadow-[0_14px_32px_-28px_rgba(11,31,26,0.45)]"
            )}
          >
            {/* Header */}
            <span className="flex items-start gap-3.5 bg-white px-5 pb-4 pt-5">
              <span
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-[13px] transition-colors",
                  active
                    ? "bg-[#0F5132] text-[#EAF3ED] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                    : "bg-[#F4F7F5] text-[#0F5132] ring-1 ring-[#E3E9E4]"
                )}
              >
                <Icon width={20} height={20} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold tracking-[-0.01em] text-[#0B1F1A]">
                  {label}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[#5B6B64]">
                  {description}
                </span>
              </span>

              <span
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
                  active
                    ? "border-[#0F5132] bg-[#0F5132]"
                    : "border-[#D8E1DA] bg-white text-transparent"
                )}
              >
                <Check size={11} strokeWidth={3.5} className="text-white" aria-hidden="true" />
              </span>
            </span>

            {/* Detail section with the restrained cool gradient */}
            <span
              className={cn(
                "block border-t px-5 pb-5 pt-4",
                active ? "border-[#DCEBE1]" : "border-[#EDF1EE]"
              )}
              style={{
                backgroundImage: active
                  ? "linear-gradient(135deg, #E4EDF5 0%, #EEF5F1 48%, #FFFFFF 100%)"
                  : "linear-gradient(135deg, #F0F4F8 0%, #F6FAF7 55%, #FFFFFF 100%)",
              }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#78899A]">
                What you get
              </span>
              <span className="mt-2.5 grid gap-2">
                {highlights.map((item) => (
                  <span key={item} className="flex items-start gap-2">
                    <Check
                      size={12}
                      strokeWidth={3}
                      className={cn(
                        "mt-[3px] shrink-0",
                        active ? "text-[#0F5132]" : "text-[#7E9187]"
                      )}
                      aria-hidden="true"
                    />
                    <span className="text-[12.5px] leading-snug text-[#33453D]">{item}</span>
                  </span>
                ))}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
