import React, { useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { storePortal } from "@/lib/portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, User, Check, MailCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import PortalPicker from "@/components/auth/PortalPicker";
import VerifyEmailStep from "@/components/auth/VerifyEmailStep";

const portalCopy = {
  business: {
    label: "Business",
    subtitle: "Create your account, then tell us about your business.",
  },
  accountant: {
    label: "Accountant",
    subtitle: "Create your account, then set up your personal practice profile.",
  },
};

/**
 * Portal-first sign-up: choose Business or Accountant, then create the account.
 * A six-digit verification code is emailed through Resend straight after sign-up;
 * confirming it marks the profile verified, then onboarding starts.
 */
export default function Register() {
  const [step, setStep] = useState("portal");
  const [portal, setPortal] = useState("business");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState("");
  const [verifyError, setVerifyError] = useState("");

  const choosePortal = (value) => {
    setPortal(value);
    storePortal(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Use at least 6 characters for your password");
      return;
    }
    setLoading(true);
    try {
      const data = await db.auth.register({ email, password, fullName, portal });
      storePortal(portal);
      if (!data?.session) {
        // Supabase still requires its own confirmation on this project: keep the old path.
        window.location.href = "/onboarding";
        return;
      }
      // Six-digit code emailed through Resend.
      setStep("verify");
      try {
        await db.auth.sendVerificationCode();
        setVerifyNotice(`We sent a 6-digit code to ${email}.`);
      } catch (err) {
        setVerifyError(err.message || "We could not send the verification email. Resend it below.");
      }
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    storePortal(portal);
    db.auth.loginWithProvider("google", "/onboarding");
  };

  if (step === "portal") {
    return (
      <AuthLayout
        icon={UserPlus}
        title="Choose your portal"
        subtitle="Pick the workspace you're joining. It decides what we ask you next."
        footer={
          <>
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </>
        }
      >
        <PortalPicker value={portal} onChange={choosePortal} />
        <Button
          type="button"
          className="mt-6 h-12 w-full font-medium"
          onClick={() => {
            setError("");
            setStep("account");
          }}
        >
          Continue
        </Button>
        <p className="mt-4 text-center text-[12px] text-muted-foreground">
          You can&apos;t switch portals later — each one has its own setup.
        </p>
      </AuthLayout>
    );
  }

  if (step === "verify") {
    return (
      <AuthLayout
        icon={MailCheck}
        title="Verify your email"
        subtitle={`Enter the 6-digit code we sent to ${email}`}
      >
        <VerifyEmailStep
          email={email}
          notice={verifyNotice}
          initialError={verifyError}
          onVerified={() => {
            window.location.href = "/onboarding";
          }}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle={portalCopy[portal].subtitle}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {/* Selected portal, with a way back to the choice */}
      <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground">
          <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">{portalCopy[portal].label} portal</span>
        </span>
        <button
          type="button"
          onClick={() => setStep("portal")}
          className="shrink-0 text-[12px] font-medium text-primary hover:underline"
        >
          Change
        </button>
      </div>

      <Button
        variant="outline"
        className="mb-5 h-12 w-full text-sm font-medium"
        onClick={handleGoogle}
      >
        <GoogleIcon className="mr-2 h-5 w-5" />
        Continue with Google
      </Button>

      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="name"
              autoComplete="name"
              autoFocus
              placeholder="Thandi Mokoena"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-12 pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 pl-10"
              required
            />
          </div>
        </div>
        <Button type="submit" className="h-12 w-full font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
