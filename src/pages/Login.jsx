import React, { useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Building2, Calculator, ArrowLeft } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import Logo from "@/components/Logo";
import LandingSplash from "@/components/LandingSplash";

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

  // Portal selection screen
  if (!portal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F4F7F3] to-[#EFF4F0] px-4 py-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-5">
              <Logo size={64} collapsed />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#1A2E22]">SmartBooks SA</h1>
            <p className="text-[#5C7263] mt-2 text-[14px]">Smarter Accounting. Stronger Business.</p>
            <p className="text-[15px] text-[#1A2E22] mt-7 font-medium">Choose your portal to continue</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Business Portal */}
            <button
              onClick={() => setPortal("business")}
              className="group bg-white rounded-2xl border-2 border-[#DDE6DF] p-7 text-left hover:border-[#2D5A43] hover:shadow-lg transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-[#EFF4F0] flex items-center justify-center mb-4 group-hover:bg-[#2D5A43] transition-colors">
                <Building2 size={28} className="text-[#2D5A43] group-hover:text-white transition-colors" strokeWidth={1.5} />
              </div>
              <h2 className="text-[18px] font-semibold text-[#1A2E22]">Business Portal</h2>
              <p className="text-[13px] text-[#5C7263] mt-1.5 leading-relaxed">
                For business owners to manage books, upload statements, and track finances
              </p>
              <div className="flex items-center gap-1.5 mt-5 text-[13px] font-medium text-[#2D5A43]">
                Log in <LogIn size={14} />
              </div>
            </button>

            {/* Accountant / Bookkeeper Portal */}
            <button
              onClick={() => setPortal("accountant")}
              className="group bg-white rounded-2xl border-2 border-[#DDE6DF] p-7 text-left hover:border-[#2D5A43] hover:shadow-lg transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-[#EFF4F0] flex items-center justify-center mb-4 group-hover:bg-[#2D5A43] transition-colors">
                <Calculator size={28} className="text-[#2D5A43] group-hover:text-white transition-colors" strokeWidth={1.5} />
              </div>
              <h2 className="text-[18px] font-semibold text-[#1A2E22]">Accountant / Bookkeeper</h2>
              <p className="text-[13px] text-[#5C7263] mt-1.5 leading-relaxed">
                For accountants and bookkeepers managing multiple client companies
              </p>
              <div className="flex items-center gap-1.5 mt-5 text-[13px] font-medium text-[#2D5A43]">
                Log in <LogIn size={14} />
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
      </div>
    );
  }

  // Login form
  const portalLabel = portal === "business" ? "Business Portal" : "Accountant / Bookkeeper Portal";
  const PortalIcon = portal === "business" ? Building2 : Calculator;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F4F7F3] to-[#EFF4F0] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={48} collapsed />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFF4F0] mb-3">
            <PortalIcon size={14} className="text-[#2D5A43]" />
            <span className="text-[12px] font-medium text-[#2D5A43]">{portalLabel}</span>
          </div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#1A2E22]">Welcome back</h1>
          <p className="text-[#5C7263] mt-1.5 text-[14px]">Log in to your {portalLabel}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#DDE6DF] p-8">
          <button
            onClick={() => setPortal(null)}
            className="flex items-center gap-1.5 text-[13px] text-[#5C7263] hover:text-[#2D5A43] mb-6 transition-colors"
          >
            <ArrowLeft size={14} /> Back to portals
          </button>

          <Button
            variant="outline"
            className="w-full h-12 text-sm font-medium mb-6"
            onClick={handleGoogle}
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E5E8]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-[#7A8E7E]">or</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A8E7E]" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-[#2D5A43] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A8E7E]" aria-hidden="true" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 font-medium bg-[#2D5A43] hover:bg-[#1F4030]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log in"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-[#7A8E7E] mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-[#2D5A43] font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}