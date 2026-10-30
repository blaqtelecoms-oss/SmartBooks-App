import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2 } from "lucide-react";

const RESEND_SECONDS = 45;
const CODE_LENGTH = 6;

/**
 * Six-digit email verification step shown right after sign-up. The code itself is
 * created and checked by the send-verification-code / verify-email-code functions.
 */
export default function VerifyEmailStep({ email, notice, initialError, onVerified }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialError || "");
  const [info, setInfo] = useState(notice || "");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(notice ? RESEND_SECONDS : 0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code from your email.`);
      return;
    }
    setError("");
    setVerifying(true);
    try {
      await db.auth.verifyEmailCode(code);
      onVerified();
    } catch (err) {
      setError(err.message || "We could not verify that code. Please try again.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSending(true);
    try {
      await db.auth.sendVerificationCode();
      setInfo(`We sent a new ${CODE_LENGTH}-digit code to ${email}.`);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err.message || "We could not send the verification email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {info && !error && (
        <div className="mb-4 rounded-lg bg-muted/60 p-3 text-sm text-foreground">{info}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="flex justify-center">
          <InputOTP
            value={code}
            onChange={setCode}
            maxLength={CODE_LENGTH}
            pattern="[0-9]*"
            inputMode="numeric"
            autoFocus
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                <InputOTPSlot key={index} index={index} className="h-12 w-11 text-lg" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button type="submit" className="h-12 w-full font-medium" disabled={verifying || code.length !== CODE_LENGTH}>
          {verifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify email"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full text-sm font-medium"
          onClick={handleResend}
          disabled={sending || cooldown > 0}
        >
          {sending ? "Sending..." : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </Button>
      </form>

      <p className="mt-4 text-center text-[12px] text-muted-foreground">
        Sent to {email}.{" "}
        <Link to="/onboarding" className="text-primary font-medium hover:underline">
          Verify later
        </Link>
      </p>
    </>
  );
}
