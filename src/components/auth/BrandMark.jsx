import { cn } from "@/lib/utils";
import LogoMark from "@/components/brand/LogoMark";
import Wordmark from "@/components/brand/Wordmark";

/**
 * SmartBooks lock-up for the auth screens: logo tile + pill wordmark.
 * `tone="light"` renders for dark/image backgrounds, `tone="dark"` for white.
 */
export default function BrandMark({ tone = "light", className }) {
  const light = tone === "light";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={40} />
      <span className="flex flex-col gap-1.5 leading-none">
        <Wordmark size={14} onDark={light} />
        <span
          className={cn(
            "text-[9px] font-semibold uppercase tracking-[0.22em]",
            light ? "text-white/55" : "text-[#8A9A92]"
          )}
        >
          South Africa
        </span>
      </span>
    </div>
  );
}
