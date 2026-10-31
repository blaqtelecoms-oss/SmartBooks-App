import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import AuthLayout from "@/components/AuthLayout";
import VerifyEmailStep from "@/components/auth/VerifyEmailStep";
import { MailCheck } from "lucide-react";

/**
 * Six-digit email verification, on its own route so it survives the auth-state
 * refresh that happens right after sign-up. The code is emailed on arrival.
 */
export default function VerifyEmail() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.email_verified) return <Navigate to="/onboarding" replace />;

  return (
    <AuthLayout
      icon={MailCheck}
      title="Verify your email"
      subtitle={`Enter the 6-digit code we sent to ${user?.email || "your email"}`}
    >
      <VerifyEmailStep
        email={user?.email || "your email"}
        autoSend
        onVerified={() => {
          window.location.href = "/onboarding";
        }}
      />
    </AuthLayout>
  );
}
