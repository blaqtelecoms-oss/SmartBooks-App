import React, { useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import GoogleIcon from "@/components/GoogleIcon";
import LandingSplash from "@/components/LandingSplash";
import { Loader2, Mail, Lock, ArrowLeft, Building2, Calculator, Check } from "lucide-react";

export default function Login() {
  const [showSplash, setShowSplash] = useState(true);
  const [portal, setPortal] = useState(null);
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
      localStorage.setItem("smartbooks_portal", portal);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    localStorage.setItem("smartbooks_portal", portal);
    db.auth.loginWithProvider("google", "/");
  };

  // Animated splash screen
  if (showSplash) {
    return <LandingSplash onComplete={() => setShowSplash(false)} />;
  }

  const portalLabel = portal === "business" ? "Business Portal" : "Accountant / Bookkeeper";

  return (
    <div className="min-h-screen flex bg-white">
      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #1A2E22 0%, #2D5A43 100%)",
          width: "45%",
          minWidth: 420,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="14" fill="#EAF0EB" />
            <path d="M18 16h22a4 4 0 0 1 4 4v28a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2z" stroke="#2D5A43" strokeWidth="3" strokeLinejoin="round" />
            <path d="M22 24h14M22 30h14M22 36h10" stroke="#2D5A43" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="44" cy="44" r="8" fill="#4A7C5E" stroke="#2D5A43" strokeWidth="2.5" />
            <path d="M44 40v8M40 44h8" stroke="#EAF0EB" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">SmartBooks SA</h1>
            <p className="text-xs text-white/50 tracking-wide uppercase mt-0.5">South Africa</p>
          </div>
        </div>

        {/* Value proposition */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight">
            Smarter Accounting.<br />Stronger Business.
          </h2>
          <p className="text-white/60 mt-4 text-base leading-relaxed">
            AI-powered bookkeeping, VAT compliance, and financial management built for South African businesses.
          </p>

          {/* Feature bullets */}
          <div className="mt-8 space-y-3.5">
            {[
              "Automated bank statement processing",
              "SARS VAT 201 returns in one click",
              "Real-time financial dashboards",
              "Multi-company & team management",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-white/80" strokeWidth={2.5} />
                </div>
                <span className="text-sm text-white/70">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom footer */}
        <div className="relative z-10 text-xs text-white/40">
          © 2026 SmartBooks SA. All rights reserved.
        </div>

        {/* Subtle decorative grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.03) 0%, transparent 50%)",
          }}
        />
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-12 bg-[#FAFBFA]">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="14" fill="#2D5A43" />
              <path d="M18 16h22a4 4 0 0 1 4 4v28a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2z" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
              <path d="M22 24h14M22 30h14M22 36h10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="44" cy="44" r="8" fill="#4A7C5E" stroke="#fff" strokeWidth="2.5" />
              <path d="M44 40v8M40 44h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-lg font-semibold text-[#1A2E22]">SmartBooks SA</span>
          </div>

          {/* ── Portal selection ── */}
          {!portal ? (
            <div className="sb-fade-in">
              <h1 className="text-2xl font-bold text-[#1A2E22] tracking-tight mb-1">Choose your portal</h1>
              <p className="text-sm text-[#5C7263] mb-6">Select how you'll be using SmartBooks today.</p>

              <div className="space-y-3">
                <button
                  onClick={() => setPortal("business")}
                  className="sb-portal-card group w-full flex items-start gap-4 p-5 rounded-xl border-2 border-[#E2E8E0] bg-white text-left transition-all hover:border-[#2D5A43] hover:shadow-md"
                >
                  <div className="w-11 h-11 rounded-lg bg-[#EFF4F0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#2D5A43] transition-colors">
                    <Building2 size={22} className="text-[#2D5A43] group-hover:text-white transition-colors" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-[#1A2E22]">Business Portal</h2>
                    <p className="text-sm text-[#5C7263] mt-0.5 leading-relaxed">
                      For business owners managing books, statements, and finances
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setPortal("accountant")}
                  className="sb-portal-card group w-full flex items-start gap-4 p-5 rounded-xl border-2 border-[#E2E8E0] bg-white text-left transition-all hover:border-[#2D5A43] hover:shadow-md"
                >
                  <div className="w-11 h-11 rounded-lg bg-[#EFF4F0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#2D5A43] transition-colors">
                    <Calculator size={22} className="text-[#2D5A43] group-hover:text-white transition-colors" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-[#1A2E22]">Accountant / Bookkeeper</h2>
                    <p className="text-sm text-[#5C7263] mt-0.5 leading-relaxed">
                      For professionals managing multiple client companies
                    </p>
                  </div>
                </button>
              </div>

              <p className="text-center text-sm text-[#7A8E7E] mt-8">
                Don't have an account?{" "}
                <Link to="/register" className="text-[#2D5A43] font-medium hover:underline">
                  Create one
                </Link>
              </p>
            </div>
          ) : (
            /* ── Login form ── */
            <div className="sb-fade-in">
              {/* Back link */}
              <button
                onClick={() => setPortal(null)}
                className="sb-back-link flex items-center gap-1.5 text-sm text-[#5C7263] hover:text-[#2D5A43] mb-6 transition-colors"
              >
                <ArrowLeft size={15} /> Back to portals
              </button>

              <h1 className="text-2xl font-bold text-[#1A2E22] tracking-tight mb-1">Welcome back</h1>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm text-[#5C7263]">Signing in to</span>
                <span className="text-sm font-medium text-[#2D5A43] bg-[#EFF4F0] px-2.5 py-0.5 rounded-full">
                  {portalLabel}
                </span>
              </div>

              {/* Google sign-in */}
              <button
                onClick={handleGoogle}
                className="sb-google-btn w-full h-11 flex items-center justify-center gap-2.5 border border-[#DDE3DA] rounded-lg bg-white text-sm font-medium text-[#1A2E22] transition-all"
              >
                <GoogleIcon className="w-5 h-5" />
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[#E2E8E0]" />
                <span className="text-xs text-[#7A8E7E] uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-[#E2E8E0]" />
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#1A2E22] mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A8E7E]" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="sb-input-field w-full h-11 pl-10 pr-3 border border-[#DDE3DA] rounded-lg bg-white text-sm text-[#1A2E22] transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-[#1A2E22]">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-xs text-[#2D5A43] hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A8E7E]" />
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="sb-input-field w-full h-11 pl-10 pr-3 border border-[#DDE3DA] rounded-lg bg-white text-sm text-[#1A2E22] transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="sb-submit-btn w-full h-11 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{
                    background: loading ? "#6B8E7A" : "#2D5A43",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-[#7A8E7E] mt-6">
                Don't have an account?{" "}
                <Link to="/register" className="text-[#2D5A43] font-medium hover:underline">
                  Create one
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
