import React, { useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import GoogleIcon from "@/components/GoogleIcon";
import LandingSplash from "@/components/LandingSplash";
import { Loader2, Mail, Lock, ArrowLeft, ArrowRight } from "lucide-react";

const BG_IMAGE =
  "https://media.base44.com/images/public/6ada1088ea3f224461b94413/9d35c9e1c_generated_1c032f0b.jpg";

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

  const portals = [
    {
      key: "business",
      title: "Business Portal",
      desc: "For business owners to manage books, upload statements, and track finances",
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#143628" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4" />
        </svg>
      ),
    },
    {
      key: "accountant",
      title: "Accountant / Bookkeeper",
      desc: "For accountants and bookkeepers managing multiple client companies",
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#143628" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center py-16 px-4"
      style={{ background: "#143628", fontFamily: '"Inter","Segoe UI",Helvetica,Arial,sans-serif' }}
    >
      {/* Background image */}
      <img
        src={BG_IMAGE}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.55 }}
      />
      {/* Scrim */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(20,54,40,.78), rgba(20,54,40,.9))" }}
      />
      {/* Spinning bronze ring */}
      <div
        className="absolute pointer-events-none sb-spin hidden md:block"
        style={{ right: -60, bottom: -60, width: 260, height: 260, borderRadius: "50%", border: "1px solid rgba(158,116,58,.35)" }}
      />

      {/* Frame + Card */}
      <div
        className="relative w-full max-w-[884px] p-3 sb-rise"
        style={{ border: "1px solid rgba(158,116,58,.6)", borderRadius: 22 }}
      >
        <div
          className="overflow-hidden mx-auto"
          style={{ maxWidth: 860, borderRadius: 14, background: "#FAFCFA", boxShadow: "0 30px 70px rgba(0,0,0,.4)" }}
        >
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-6 md:px-9 py-5 flex-wrap gap-3"
            style={{ background: "#143628", borderBottom: "3px solid #9E743A" }}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-[42px] h-[42px] rounded-[11px] flex items-center justify-center"
                style={{ background: "#EAF0EB" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#143628" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 3h10a2 2 0 0 1 2 2v7" />
                  <path d="M5 3v16a2 2 0 0 0 2 2h5" />
                  <path d="M8 8h6M8 12h6" />
                  <circle cx="17" cy="18" r="4" />
                  <path d="M17 16v4M15 18h4" />
                </svg>
              </div>
              <div>
                <div className="text-[22px] font-semibold tracking-[.06em]" style={{ color: "#FAFCFA" }}>
                  SmartBooks SA
                </div>
                <p className="text-[13px] tracking-[.08em] m-0" style={{ color: "#9E743A" }}>
                  Smarter Accounting. Stronger Business.
                </p>
              </div>
            </div>
            <div
              className="text-[13px] tracking-[.1em] px-4 py-2 rounded-full"
              style={{ color: "#EAF0EB", border: "1px solid rgba(158,116,58,.8)" }}
            >
              Choose your portal to continue
            </div>
          </div>

          {/* Body: two columns */}
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left column — portal cards */}
            <div className="flex flex-col gap-5 p-8 md:p-9" style={{ background: "#EAF0EB" }}>
              {portals.map((p, i) => {
                const selected = portal === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPortal(p.key)}
                    className={`sb-pc sb-rise text-left p-6 rounded-[14px] border ${selected ? "sb-pc-sel" : ""}`}
                    style={{
                      background: "#FAFCFA",
                      borderColor: selected ? "#9E743A" : "#cfdad2",
                      animationDelay: `${0.3 + i * 0.2}s`,
                      cursor: "pointer",
                      font: "inherit",
                      color: "inherit",
                    }}
                  >
                    <div
                      className="sb-ring w-16 h-16 rounded-full flex items-center justify-center mb-1.5"
                      style={{
                        background: "#EAF0EB",
                        boxShadow: "inset 3px 3px 7px rgba(20,54,40,.22), inset -3px -3px 7px #fff",
                        border: `2px solid ${selected ? "#9E743A" : "transparent"}`,
                      }}
                    >
                      {p.icon}
                    </div>
                    <h2 className="m-0 mt-1.5 text-[19px] font-semibold tracking-[.03em]" style={{ color: "#143628" }}>
                      {p.title}
                    </h2>
                    <p className="m-0 text-[14px] leading-[1.55] tracking-[.03em]" style={{ color: "#4a6355" }}>
                      {p.desc}
                    </p>
                    <div
                      className="flex items-center gap-2 text-[13px] font-semibold tracking-[.06em] mt-2"
                      style={{ color: "#9E743A" }}
                    >
                      Log in <ArrowRight size={14} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right column — credentials */}
            <div
              className="flex flex-col p-8 md:p-9"
              style={{ background: "#FAFCFA", borderLeft: "1px solid #d6e0d8" }}
            >
              {portal ? (
                <>
                  {/* Back to portals */}
                  <button
                    onClick={() => setPortal(null)}
                    className="sb-back inline-flex items-center gap-2 bg-transparent border-0 p-0 text-[13px] tracking-[.05em] mb-5 self-start"
                    style={{ color: "#4a6355", font: "inherit", cursor: "pointer" }}
                  >
                    <ArrowLeft size={14} /> Back to portals
                  </button>

                  <h1 className="m-0 mb-6 text-[30px] font-medium tracking-[.04em]" style={{ color: "#143628" }}>
                    Welcome back
                  </h1>

                  {/* Google sign-in */}
                  <button
                    onClick={handleGoogle}
                    className="sb-gb flex items-center justify-center gap-2.5 h-12 border rounded-[10px] text-[14px] font-medium tracking-[.04em] bg-white"
                    style={{ borderColor: "#b9c8bd", color: "#143628", font: "inherit", cursor: "pointer" }}
                  >
                    <GoogleIcon className="w-5 h-5" />
                    Continue with Google
                  </button>

                  {/* Divider */}
                  <div
                    className="flex items-center gap-3 my-5 text-[12px] uppercase tracking-[.14em]"
                    style={{ color: "#6f8576" }}
                  >
                    <div className="flex-1 h-px" style={{ background: "#d6e0d8" }} />
                    or
                    <div className="flex-1 h-px" style={{ background: "#d6e0d8" }} />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                      {error}
                    </div>
                  )}

                  {/* Login form */}
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5 mb-4">
                      <label
                        htmlFor="email"
                        className="text-[13px] font-medium tracking-[.06em]"
                        style={{ color: "#143628" }}
                      >
                        Email
                      </label>
                      <div className="relative">
                        <Mail
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                          style={{ color: "#6f8576" }}
                        />
                        <input
                          id="email"
                          type="email"
                          autoComplete="email"
                          autoFocus
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="sb-input w-full h-12 border rounded-[10px] bg-white pl-10 pr-3.5 text-[14px]"
                          style={{ borderColor: "#b9c8bd", color: "#143628", font: "inherit" }}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 mb-4">
                      <div className="flex justify-between items-center">
                        <label
                          htmlFor="password"
                          className="text-[13px] font-medium tracking-[.06em]"
                          style={{ color: "#143628" }}
                        >
                          Password
                        </label>
                        <Link
                          to="/forgot-password"
                          className="text-[12px] tracking-[.04em] no-underline hover:underline"
                          style={{ color: "#9E743A" }}
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                          style={{ color: "#6f8576" }}
                        />
                        <input
                          id="password"
                          type="password"
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="sb-input w-full h-12 border rounded-[10px] bg-white pl-10 pr-3.5 text-[14px]"
                          style={{ borderColor: "#b9c8bd", color: "#143628", font: "inherit" }}
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="sb-sub h-12 border-0 rounded-[10px] text-[14px] font-semibold tracking-[.08em] mt-1.5"
                      style={{
                        background: "#143628",
                        color: "#FAFCFA",
                        borderBottom: "3px solid #9E743A",
                        font: "inherit",
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Logging in...
                        </span>
                      ) : (
                        "Log in"
                      )}
                    </button>
                  </form>
                </>
              ) : (
                /* Placeholder when no portal selected */
                <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: "#EAF0EB" }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9E743A"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                    </svg>
                  </div>
                  <p className="text-[15px] tracking-[.04em] m-0" style={{ color: "#4a6355" }}>
                    Select a portal to continue
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="relative text-center mt-8 text-[14px] tracking-[.05em] m-0" style={{ color: "#EAF0EB" }}>
        Don't have an account?{" "}
        <Link
          to="/register"
          className="sb-link font-semibold no-underline"
          style={{ color: "#d9b072" }}
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
