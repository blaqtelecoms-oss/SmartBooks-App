import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { storePortal } from "@/lib/portal";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

const countries = [
  "South Africa",
  "Namibia",
  "Botswana",
  "Zimbabwe",
  "Mozambique",
  "Zambia",
  "Kenya",
  "Nigeria",
  "United Kingdom",
  "United States",
  "Australia",
  "Other",
];

const currencies = [
  { value: "ZAR", label: "ZAR — South African Rand" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — Pound Sterling" },
];

const steps = [
  { key: "personal", title: "About you", subtitle: "Your personal details, not a business" },
  { key: "practice", title: "Your practice", subtitle: "Optional — you can add this later" },
];

const emptyForm = {
  full_name: "",
  country: "South Africa",
  currency: "ZAR",
  practice_name: "",
  practice_email: "",
  practice_phone: "",
};

export default function AccountantOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  // Prefill whatever the account already knows so a returning user never retypes.
  useEffect(() => {
    (async () => {
      try {
        const me = await db.auth.me();
        setForm((prev) => ({
          ...prev,
          full_name: me?.full_name || "",
          country: me?.country || prev.country,
          currency: me?.currency || prev.currency,
          practice_name: me?.practice_name || "",
          practice_email: me?.practice_email || "",
          practice_phone: me?.practice_phone || "",
        }));
      } catch (e) {
        /* stay with the defaults; the user can still complete setup */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (index) => {
    const next = {};
    if (index === 0 && !form.full_name.trim()) {
      next.full_name = "Your name is required";
    }
    if (index === 1 && form.practice_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.practice_email)) {
      next.practice_email = "Enter a valid email address";
    }
    return next;
  };

  const finish = async () => {
    setSaving(true);
    try {
      await db.auth.completeOnboarding({
        portal: "accountant",
        profilePatch: { full_name: form.full_name.trim() },
        metadataPatch: {
          full_name: form.full_name.trim(),
          country: form.country,
          currency: form.currency,
          practice_name: form.practice_name.trim() || null,
          practice_email: form.practice_email.trim() || null,
          practice_phone: form.practice_phone.trim() || null,
        },
      });
      storePortal("accountant");
      toast({
        title: "Your portal is ready",
        description: form.practice_name.trim()
          ? `${form.practice_name.trim()} is set up.`
          : "Your accountant workspace is ready to use.",
      });
      navigate("/", { replace: true });
    } catch (e) {
      toast({ title: "Could not finish setup", description: e.message, variant: "destructive" });
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const nextErrors = validate(step);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    if (step === steps.length - 1) {
      await finish();
      return;
    }
    setStep((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--sb-page)" }}>
        <Loader2 size={26} className="animate-spin" style={{ color: "var(--sb-muted)" }} />
      </div>
    );
  }

  const current = steps[step];

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: "var(--sb-page)" }}>
      <div className="mx-auto w-full max-w-[760px] px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
        <div className="flex items-center justify-between gap-4">
          <Logo size={34} />
          <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--sb-muted)" }}>
            Step {step + 1} of {steps.length}
          </p>
        </div>

        <div className="mt-5 flex gap-1.5" aria-hidden="true">
          {steps.map((item, index) => (
            <span
              key={item.key}
              className="h-[3px] flex-1 rounded-pill transition-colors"
              style={{ background: index <= step ? "var(--sb-brand)" : "var(--sb-border)" }}
            />
          ))}
        </div>

        <div className="mt-6 rounded-[22px] p-5 sm:p-7" style={{ background: "var(--sb-card)", border: "1px solid var(--sb-border)", boxShadow: "var(--sb-shadow)" }}>
          <h1 className="text-[26px] leading-tight sm:text-[32px]" style={{ fontFamily: "var(--font-display)" }}>
            {current.title}
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--sb-muted)" }}>{current.subtitle}</p>

          <div className="mt-6">
            {current.key === "personal" && (
              <div className="space-y-4">
                <Field label="Your name *" error={errors.full_name}>
                  <Input
                    value={form.full_name}
                    onChange={(e) => update("full_name", e.target.value)}
                    placeholder="Thandi Mokoena"
                    autoComplete="name"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Country">
                    <ResponsiveSelect
                      value={form.country}
                      onValueChange={(v) => update("country", v)}
                      placeholder="Select country"
                      triggerClassName="mt-1 h-9 w-full"
                      options={countries.map((c) => ({ value: c, label: c }))}
                    />
                  </Field>
                  <Field label="Preferred currency">
                    <ResponsiveSelect
                      value={form.currency}
                      onValueChange={(v) => update("currency", v)}
                      placeholder="Select currency"
                      triggerClassName="mt-1 h-9 w-full"
                      options={currencies}
                    />
                  </Field>
                </div>
                <p className="rounded-[14px] px-4 py-3 text-[12px]" style={{ background: "var(--sb-soft)", color: "var(--sb-muted)" }}>
                  This is your personal workspace. You don&apos;t need a company to get started — add clients and their books when you&apos;re ready.
                </p>
              </div>
            )}

            {current.key === "practice" && (
              <div className="space-y-4">
                <Field label="Practice name">
                  <Input
                    value={form.practice_name}
                    onChange={(e) => update("practice_name", e.target.value)}
                    placeholder="Mokoena Accounting"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Practice email" error={errors.practice_email}>
                    <Input
                      type="email"
                      value={form.practice_email}
                      onChange={(e) => update("practice_email", e.target.value)}
                      placeholder="hello@practice.co.za"
                    />
                  </Field>
                  <Field label="Practice phone">
                    <Input
                      value={form.practice_phone}
                      onChange={(e) => update("practice_phone", e.target.value)}
                      placeholder="021 555 0123"
                    />
                  </Field>
                </div>
                <p className="rounded-[14px] px-4 py-3 text-[12px]" style={{ background: "var(--sb-soft)", color: "var(--sb-muted)" }}>
                  Nothing here is required. You can skip this step and add your practice details from your profile later.
                </p>
              </div>
            )}
          </div>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0 || saving}
              onClick={() => { setErrors({}); setStep((prev) => Math.max(0, prev - 1)); }}
              className="h-11 rounded-lg text-[13px] sm:order-1 sm:w-auto"
            >
              <ArrowLeft size={15} className="mr-1.5" /> Back
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="h-12 rounded-xl bg-[var(--sb-brand)] text-[13.5px] font-semibold text-white shadow-[0_14px_28px_-16px_rgba(15,81,50,0.9)] hover:opacity-90 sm:order-2 sm:h-11 sm:rounded-lg sm:text-[13px] sm:min-w-[180px]"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="mr-2 animate-spin" /> Saving...
                </>
              ) : step === steps.length - 1 ? (
                <>
                  Enter my portal <Check size={15} className="ml-1.5" />
                </>
              ) : (
                <>
                  Continue <ArrowRight size={15} className="ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <Label className="text-[12px]" style={{ color: "var(--sb-muted)" }}>{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
