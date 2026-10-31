import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountantIcon3D, BusinessIcon3D } from "./PortalIcon3D";

const PORTALS = [
  {
    id: "business",
    label: "Business",
    description: "Owners & SMEs running their own books",
    Icon: BusinessIcon3D,
    accents: {
      glow: "rgba(29,169,92,0.18)",
      chip: "#0F5132",
      tint: "linear-gradient(150deg, #E9F8EE 0%, #F5FBF7 45%, #FFFFFF 100%)",
      iconBg: "radial-gradient(circle at 50% 45%, rgba(76,228,149,0.22), transparent 70%)",
    },
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
    Icon: AccountantIcon3D,
    accents: {
      glow: "rgba(28,122,165,0.16)",
      chip: "#14618A",
      tint: "linear-gradient(150deg, #E8F3F9 0%, #F4F9FC 45%, #FFFFFF 100%)",
      iconBg: "radial-gradient(circle at 50% 45%, rgba(89,195,232,0.22), transparent 70%)",
    },
    highlights: [
      "Every client company under one login",
      "Switch between client books without signing out",
      "Review and submit client documents",
    ],
  },
];

/**
 * Full-size portal choice for the standalone portal step. Raised 3D portal
 * marks, a lit gradient panel and generous touch targets; side by side from
 * large screens up, comfortably stacked on phones.
 */
export default function PortalChooser({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Choose your portal" className="grid gap-3.5 lg:grid-cols-2">
      {PORTALS.map(({ id, label, description, Icon, accents, highlights }) => {
        const active = value === id;

        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              "group relative flex h-full w-full flex-col overflow-hidden rounded-[22px] border text-left transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              active
                ? "border-[#0F5132] shadow-[0_22px_46px_-26px_rgba(15,81,50,0.55)] ring-1 ring-[#0F5132] focus-visible:ring-[#0F5132]"
                : "border-[#E3E9E4] hover:-translate-y-0.5 hover:border-[#B9CCC2] hover:shadow-[0_18px_36px_-28px_rgba(11,31,26,0.5)] focus-visible:ring-[#B9CCC2]"
            )}
          >
            {/* Header */}
            <span className="flex items-start gap-3.5 bg-white px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
              <span
                className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full transition-transform duration-200 group-hover:scale-[1.03] sm:h-14 sm:w-14"
                style={{ backgroundImage: accents.iconBg }}
              >
                <Icon size={52} />
              </span>

              <span className="min-w-0 flex-1 pt-0.5">
                <span className="block text-[15.5px] font-bold tracking-[-0.01em] text-[#0B1F1A]">
                  {label}
                </span>
                <span className="mt-1 block text-[12.5px] leading-relaxed text-[#5B6B64]">
                  {description}
                </span>
              </span>

              <span
                className={cn(
                  "mt-1 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border transition-colors",
                  active
                    ? "border-[#0F5132] bg-[#0F5132] shadow-[0_6px_14px_-6px_rgba(15,81,50,0.8)]"
                    : "border-[#D8E1DA] bg-white text-transparent"
                )}
              >
                <Check size={14} strokeWidth={3.5} className="text-white" aria-hidden="true" />
              </span>
            </span>

            {/* Detail section */}
            <span
              className={cn(
                "mt-auto block border-t px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5",
                active ? "border-[#DCEBE1]" : "border-[#EDF1EE]"
              )}
              style={{ backgroundImage: accents.tint }}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78899A]">
                What you get
              </span>
              <span className="mt-2.5 grid gap-2">
                {highlights.map((item) => (
                  <span key={item} className="flex items-start gap-2">
                    <span
                      className="mt-[1px] grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full transition-opacity"
                      style={{
                        background: active
                          ? `color-mix(in srgb, ${accents.chip} 14%, #FFFFFF)`
                          : "#FFFFFF",
                        border: `1px solid color-mix(in srgb, ${accents.chip} 22%, #DCE7E0)`,
                        opacity: active ? 1 : 0.85,
                      }}
                    >
                      <Check
                        size={10}
                        strokeWidth={3.6}
                        style={{ color: active ? accents.chip : "#7E9187" }}
                        aria-hidden="true"
                      />
                    </span>
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
