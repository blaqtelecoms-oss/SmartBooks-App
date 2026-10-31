import React, { useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import GoogleIcon from "@/components/GoogleIcon";
import LandingSplash from "@/components/LandingSplash";
import AuthBrandPanel, { AUTH_FEATURES } from "@/components/auth/AuthBrandPanel";
import AuthMobileHero from "@/components/auth/AuthMobileHero";
import PortalPicker from "@/components/auth/PortalPicker";
import { storePortal } from "@/lib/portal";
import { Loader2, Mail, Lock, Check } from "lucide-react";

export default function Login() {
  const [showSplash, setShowSplash] = useState(true);
  const [portal, setPortal] = useState("business");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await db.auth.loginViaEmailPassword(email, password);
      // The account's own portal wins; the picker only applies to accounts that
      // were created before portals were recorded.
      const me = await db.auth.me().catch(() => null);
      storePortal(me?.portal || portal);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    storePortal(portal);
    db.auth.loginWithProvider("google", "/");
  };

  // Animated splash screen
  if (showSplash) {
    return <LandingSplash onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFBFA] lg:flex-row">
      <AuthBrandPanel />
      <AuthMobileHero />

      {/* ── Sign-in panel (same content and options at every breakpoint) ── */}
      <div className="relative flex flex-1 justify-center px-4 pb-8 sm:px-6 lg:items-center lg:px-10 lg:py-12">
        <div className="sb-fade-in -mt-5 w-full max-w-[420px] rounded-[26px] border border-[#E3E9E4] bg-white px-5 py-6 shadow-[0_24px_60px_-32px_rgba(11,31,26,0.35)] sm:px-7 lg:mt-0 lg:px-9 lg:py-9">
          <h1 className="font-display text-[27px] leading-tight text-[#0B1F1A] lg:text-[30px]">
            Welcome back
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-[#5B6B64]">
            Sign in to your SmartBooks SA workspace.
          </p>

          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#5B6B64]">
                Portal
              </span>
              <span className="text-[11px] text-[#9AA9A1]">Matched to your account</span>
            </div>
            <PortalPicker value={portal} onChange={setPortal} />
          </div>

          {/* Google sign-in */}
          <button
            onClick={handleGoogle}
            className="sb-google-btn mt-4 flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#E3E9E4] bg-white text-[13px] font-semibold text-[#0B1F1A] transition-all"
          >
            <GoogleIcon className="h-[18px] w-[18px]" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#EEF2EE]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9AA9A1]">
              or sign in with email
            </span>
            <div className="h-px flex-1 bg-[#EEF2EE]" />
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-[#F6D5D0] bg-[#FDF2F0] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#8E2218]"
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[12.5px] font-semibold text-[#0B1F1A]"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA9A1]" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="sb-input-field h-11 w-full rounded-xl border border-[#E3E9E4] bg-white pl-10 pr-3 text-[13.5px] text-[#0B1F1A] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="password" className="block text-[12.5px] font-semibold text-[#0B1F1A]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11.5px] font-medium text-[#0F5132] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA9A1]" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="sb-input-field h-11 w-full rounded-xl border border-[#E3E9E4] bg-white pl-10 pr-3 text-[13.5px] text-[#0B1F1A] transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-[52px] w-full rounded-xl bg-[#0F5132] text-[14px] font-semibold text-white shadow-[0_14px_28px_-14px_rgba(15,81,50,0.9)] transition-all hover:bg-[#0B3F27] active:scale-[0.99] disabled:opacity-70 sm:h-12 sm:text-[13px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[12.5px] text-[#5B6B64]">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-[#0F5132] hover:underline">
              Create one
            </Link>
          </p>

          {/* Mobile keeps the brand story on the same page as the sign-in options */}
          <div className="mt-6 border-t border-[#EEF2EE] pt-5 lg:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9AA9A1]">
              Everything you need
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              {AUTH_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-1.5 text-[11.5px] leading-snug text-[#5B6B64]"
                >
                  <Check
                    size={12}
                    strokeWidth={3}
                    className="mt-[2px] shrink-0 text-[#0F5132]"
                  />
                  {feature}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[10.5px] text-[#9AA9A1]">
              © 2026 SmartBooks SA · POPIA-aligned · SARS-ready
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
