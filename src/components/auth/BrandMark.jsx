import { cn } from "@/lib/utils";
import lockup from "@/assets/smartbooks-logo.png";

/**
 * SmartBooks lock-up for the auth screens, rendered from the supplied artwork.
 * `tone="light"` renders for dark/image backgrounds, `tone="dark"` for white.
 */
export default function BrandMark({ tone = "light", className }) {
  const light = tone === "light";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <img
        src={lockup}
        alt="Smart Books"
        className="h-10 w-auto max-w-full object-contain object-left sm:h-11"
      />
      <span
        className={cn(
          "text-[9px] font-semibold uppercase tracking-[0.22em]",
          light ? "text-white/55" : "text-[#8A9A92]"
        )}
      >
        South Africa
      </span>
    </div>
  );
}
