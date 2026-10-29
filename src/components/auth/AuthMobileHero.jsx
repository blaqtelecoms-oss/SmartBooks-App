import heroImage from "@/assets/login-hero.jpg";
import BrandMark from "./BrandMark";

/** Mobile / tablet header: the same brand story, condensed above the sign-in card. */
export default function AuthMobileHero() {
  return (
    <div className="relative overflow-hidden lg:hidden">
      <img
        src={heroImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(168deg, rgba(7,18,14,0.9) 0%, rgba(15,45,34,0.88) 45%, rgba(15,81,50,0.86) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 60% at 88% 0%, rgba(200,241,105,0.18) 0%, rgba(200,241,105,0) 60%)",
        }}
      />

      <div className="relative px-5 pb-10 pt-5 text-white">
        <BrandMark />
        <p className="mt-6 text-[9.5px] font-semibold uppercase tracking-[0.24em] text-[#C8F169]/80">
          South African accounting
        </p>
        <h1 className="mt-2.5 font-display text-[27px] leading-[1.1]">
          Smarter accounting.
          <br />
          Stronger business.
        </h1>
        <p className="mt-2.5 max-w-[280px] text-[12.5px] leading-relaxed text-white/70">
          AI-powered bookkeeping, VAT compliance and financial management.
        </p>
      </div>
    </div>
  );
}
