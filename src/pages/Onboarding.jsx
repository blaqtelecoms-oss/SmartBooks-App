import React, { useEffect, useState } from "react";
import { db } from "@/api/supabaseClient";
import { accountPortal, storePortal } from "@/lib/portal";
import BusinessOnboarding from "@/components/onboarding/BusinessOnboarding";
import AccountantOnboarding from "@/components/onboarding/AccountantOnboarding";
import { Loader2 } from "lucide-react";

/**
 * Onboarding entry point. The account's portal decides which setup runs:
 * businesses describe a company, accountants describe themselves.
 */
export default function Onboarding() {
  const [portal, setPortal] = useState(null);

  useEffect(() => {
    (async () => {
      let next = "business";
      try {
        next = accountPortal(await db.auth.me()) || "business";
      } catch (e) {
        /* not signed in: ProtectedRoute sends the user back to sign-in */
      }
      storePortal(next);
      setPortal(next);
    })();
  }, []);

  if (!portal) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--sb-page)" }}>
        <Loader2 size={26} className="animate-spin" style={{ color: "var(--sb-muted)" }} />
      </div>
    );
  }

  return portal === "accountant" ? <AccountantOnboarding /> : <BusinessOnboarding />;
}
