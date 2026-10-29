import { cn } from "@/lib/utils";

/**
 * SmartBooks SA lock-up: document mark + wordmark.
 * `tone="light"` renders for dark/image backgrounds, `tone="dark"` for white.
 */
export default function BrandMark({ tone = "light", className }) {
  const light = tone === "light";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid h-10 w-10 place-items-center rounded-[13px]",
          light ? "bg-white/10 ring-1 ring-white/20" : "bg-[#0F5132]"
        )}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
          className="text-white"
        >
          <path
            d="M18 16h22a4 4 0 0 1 4 4v28a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2z"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M22 24h14M22 30h14M22 36h10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="44" cy="44" r="8" fill="#1B7A4D" stroke="currentColor" strokeWidth="2.5" />
          <path d="M44 40v8M40 44h8" stroke="#EAF0EB" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block text-[15px] font-extrabold tracking-tight",
            light ? "text-white" : "text-[#0B1F1A]"
          )}
        >
          SmartBooks SA
        </span>
        <span
          className={cn(
            "mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.22em]",
            light ? "text-white/55" : "text-[#8A9A92]"
          )}
        >
          South Africa
        </span>
      </span>
    </div>
  );
}
