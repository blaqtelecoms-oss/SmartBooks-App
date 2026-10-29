import { Check } from "lucide-react";
import heroImage from "@/assets/login-hero.jpg";
import BrandMark from "./BrandMark";

export const AUTH_FEATURES = [
  "Automated bank statement processing",
  "SARS VAT 201 returns in one click",
  "Real-time financial dashboards",
  "Multi-company & team management",
];

/** Desktop-only brand panel: photo dissolving into the form side through gradients. */
export default function AuthBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden px-10 py-11 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between xl:px-14 xl:py-14">
      <img
        src={heroImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* Brand wash over the photograph */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(158deg, rgba(7,18,14,0.95) 0%, rgba(15,45,34,0.93) 38%, rgba(15,81,50,0.74) 70%, rgba(15,81,50,0.38) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(115% 75% at 84% 10%, rgba(200,241,105,0.16) 0%, rgba(200,241,105,0) 58%)",
        }}
      />
      {/* Dissolve into the page floor */}
      <div
        className="absolute inset-x-0 bottom-0 h-44"
        style={{
          background: "linear-gradient(to top, rgba(7,18,14,0.6) 0%, rgba(7,18,14,0) 100%)",
        }}
      />

      <div className="relative max-w-[420px]">
        <BrandMark />
      </div>

      <div className="relative max-w-[420px] py-10">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-[#C8F169]/80">
          South African accounting
        </p>
        <h2 className="mt-4 font-display text-[40px] leading-[1.06] xl:text-[46px]">
          Smarter accounting.
          <br />
          Stronger business.
        </h2>
        <p className="mt-5 max-w-[360px] text-[13.5px] leading-relaxed text-white/70">
          AI-powered bookkeeping, VAT compliance and financial management — built for
          South African businesses.
        </p>

        <ul className="mt-8 space-y-3">
          {AUTH_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/15">
                <Check size={11} strokeWidth={3} className="text-[#C8F169]" />
              </span>
              <span className="text-[12.5px] text-white/75">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex items-center justify-between text-[10.5px] tracking-wide text-white/45">
        <span>© 2026 SmartBooks SA</span>
        <span>POPIA-aligned · SARS-ready</span>
      </div>
    </aside>
  );
}
