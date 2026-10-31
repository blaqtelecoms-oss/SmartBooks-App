import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { defaultAccountsFor } from "@/lib/defaultChartOfAccounts";
import { storePortal } from "@/lib/portal";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, ArrowRight, Check, Layers, Loader2, Package, Wrench } from "lucide-react";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const industries = ["Retail", "Manufacturing", "Services", "Technology", "Construction", "Agriculture", "Mining", "Finance", "Healthcare", "Education", "Transport", "Hospitality", "Other"];
const currencies = [
  { value: "ZAR", label: "ZAR — South African Rand" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — Pound Sterling" },
];

const offeringChoices = [
  { value: "products", icon: Package, title: "Products", description: "You sell stock items, so inventory and warehouses are part of your workspace." },
  { value: "services", icon: Wrench, title: "Services", description: "You bill for time or expertise. A services catalogue replaces inventory." },
  { value: "both", icon: Layers, title: "Both", description: "You sell products and services, so both catalogues are available." },
];

const steps = [
  { key: "business", title: "Business details", subtitle: "Who the books belong to" },
  { key: "tax", title: "Tax & compliance", subtitle: "Your SARS registrations" },
  { key: "finance", title: "Financial setup", subtitle: "Year end and opening position" },
  { key: "offering", title: "What you offer", subtitle: "Your workspace is built around this" },
  { key: "review", title: "Review & finish", subtitle: "Check everything before we open your books" },
];

const emptyForm = {
  name: "",
  registration_number: "",
  industry: "",
  address: "",
  contact_email: "",
  contact_phone: "",
  vat_registered: false,
  vat_number: "",
  tax_number: "",
  paye_number: "",
  uif_number: "",
  sdl_number: "",
  financial_year_end: "February",
  currency: "ZAR",
  opening_balance: "",
  offering_type: "both",
};

const fromCompany = (company) => ({
  name: company.name || "",
  registration_number: company.registration_number || "",
  industry: company.industry || "",
  address: company.address || "",
  contact_email: company.contact_email || "",
  contact_phone: company.contact_phone || "",
  vat_registered: !!company.vat_number,
  vat_number: company.vat_number || "",
  tax_number: company.tax_number || "",
  paye_number: company.paye_number || "",
  uif_number: company.uif_number || "",
  sdl_number: company.sdl_number || "",
  financial_year_end: company.financial_year_end || "February",
  currency: company.currency || "ZAR",
  opening_balance: "",
  offering_type: company.offering_type || "both",
});

export default function BusinessOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  // Resume an unfinished setup instead of starting a second business. A brand-new
  // account has no company yet: the first step writes the draft, so stay here.
  useEffect(() => {
    (async () => {
      try {
        const companies = await db.entities.Company.list();
        const draft = companies.find((c) => !c.onboarding_completed);
        if (draft) {
          setDraftId(draft.id);
          setForm(fromCompany(draft));
        }
      } catch (e) {
        toast({ title: "Could not load your setup", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (index) => {
    const next = {};
    if (index === 0) {
      if (!form.name.trim()) next.name = "Business name is required";
      if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) next.contact_email = "Enter a valid email address";
    }
    if (index === 1 && form.vat_registered && !form.vat_number.trim()) {
      next.vat_number = "VAT number is required for a VAT-registered business";
    }
    if (index === 3 && !form.offering_type) {
      next.offering_type = "Choose how you sell";
    }
    return next;
  };

  const payload = () => ({
    name: form.name.trim(),
    registration_number: form.registration_number.trim() || null,
    industry: form.industry || null,
    address: form.address.trim() || null,
    contact_email: form.contact_email.trim() || null,
    contact_phone: form.contact_phone.trim() || null,
    vat_number: form.vat_registered ? form.vat_number.trim() || null : null,
    tax_number: form.tax_number.trim() || null,
    paye_number: form.paye_number.trim() || null,
    uif_number: form.uif_number.trim() || null,
    sdl_number: form.sdl_number.trim() || null,
    financial_year_end: form.financial_year_end,
    currency: form.currency,
    offering_type: form.offering_type,
  });

  // Every step that moves forward writes the setup, so a half-finished wizard
  // resumes exactly where the user left off and never creates a second company.
  const persist = async (patch = {}) => {
    if (draftId) {
      const updated = await db.entities.Company.update(draftId, { ...payload(), ...patch });
      return updated;
    }
    const created = await db.entities.Company.create({ ...payload(), onboarding_completed: false, ...patch });
    setDraftId(created.id);
    return created;
  };

  const finish = async () => {
    setSaving(true);
    try {
      const company = await persist({ onboarding_completed: true });

      const existing = await db.entities.Account.filter({ company_id: company.id });
      if (existing.length === 0) {
        const opening = Number(form.opening_balance) || 0;
        const seeded = await db.entities.Account.bulkCreate(
          defaultAccountsFor(form.offering_type).map((account) => ({
            ...account,
            company_id: company.id,
            is_system: true,
            is_active: true,
            balance: 0,
          }))
        );
        const bank = seeded.find((account) => account.code === "1000");
        if (opening && bank) {
          await db.entities.Account.update(bank.id, { balance: opening });
        }
      }

      // Record the portal on the account so every later sign-in returns here.
      await db.auth.completeOnboarding({ portal: "business" });

      localStorage.setItem("smartbooks_company_id", company.id);
      storePortal("business");
      toast({ title: "Your workspace is ready", description: `${company.name} is set up and ready to use.` });
      navigate(form.offering_type === "services" ? "/services" : "/", { replace: true });
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
    setSaving(true);
    try {
      await persist();
      setStep((prev) => prev + 1);
    } catch (e) {
      toast({ title: "Could not save your details", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const current = steps[step];
  const chosenOffering = offeringChoices.find((c) => c.value === form.offering_type);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--sb-page)" }}>
        <Loader2 size={26} className="animate-spin" style={{ color: "var(--sb-muted)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: "var(--sb-page)" }}>
      <div className="mx-auto w-full max-w-[760px] px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
        <div className="flex items-center justify-between gap-4">
          <Logo size={34} />
          <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--sb-muted)" }}>
            Step {step + 1} of {steps.length}
          </p>
        </div>

        {/* Progress */}
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
            {current.key === "business" && (
              <div className="space-y-4">
                <Field label="Business name *" error={errors.name}>
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Protea Solutions (Pty) Ltd" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Registration number">
                    <Input value={form.registration_number} onChange={(e) => update("registration_number", e.target.value)} placeholder="2024/123456/07" />
                  </Field>
                  <Field label="Industry">
                    <ResponsiveSelect
                      value={form.industry}
                      onValueChange={(v) => update("industry", v)}
                      placeholder="Select industry"
                      triggerClassName="mt-1 h-9 w-full"
                      options={industries.map((i) => ({ value: i, label: i }))}
                    />
                  </Field>
                </div>
                <Field label="Trading address">
                  <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="12 Loop Street, Cape Town" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Business email" error={errors.contact_email}>
                    <Input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} placeholder="accounts@business.co.za" />
                  </Field>
                  <Field label="Phone">
                    <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} placeholder="021 555 0123" />
                  </Field>
                </div>
              </div>
            )}

            {current.key === "tax" && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => update("vat_registered", !form.vat_registered)}
                  aria-pressed={form.vat_registered}
                  className="flex w-full items-center justify-between gap-4 rounded-[16px] px-4 py-3.5 text-left transition-colors"
                  style={{ background: form.vat_registered ? "var(--sb-soft)" : "transparent", border: "1px solid var(--sb-border)" }}
                >
                  <span>
                    <b className="block text-[13px] font-semibold" style={{ color: "var(--sb-ink)" }}>Registered for VAT</b>
                    <small className="text-[12px]" style={{ color: "var(--sb-muted)" }}>Turn on if you charge and claim VAT</small>
                  </span>
                  <span
                    className="relative h-[22px] w-[38px] flex-none rounded-pill transition-colors"
                    style={{ background: form.vat_registered ? "var(--sb-brand)" : "var(--sb-border)" }}
                  >
                    <span
                      className="absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all"
                      style={{ left: form.vat_registered ? "19px" : "3px" }}
                    />
                  </span>
                </button>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={form.vat_registered ? "VAT number *" : "VAT number"} error={errors.vat_number}>
                    <Input value={form.vat_number} onChange={(e) => update("vat_number", e.target.value)} placeholder="4123456789" disabled={!form.vat_registered} />
                  </Field>
                  <Field label="Income tax number">
                    <Input value={form.tax_number} onChange={(e) => update("tax_number", e.target.value)} placeholder="9123456789" />
                  </Field>
                  <Field label="PAYE number">
                    <Input value={form.paye_number} onChange={(e) => update("paye_number", e.target.value)} placeholder="7123456789" />
                  </Field>
                  <Field label="UIF number">
                    <Input value={form.uif_number} onChange={(e) => update("uif_number", e.target.value)} placeholder="U123456789" />
                  </Field>
                  <Field label="SDL number">
                    <Input value={form.sdl_number} onChange={(e) => update("sdl_number", e.target.value)} placeholder="L123456789" />
                  </Field>
                </div>
              </div>
            )}

            {current.key === "finance" && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Financial year end">
                    <ResponsiveSelect
                      value={form.financial_year_end}
                      onValueChange={(v) => update("financial_year_end", v)}
                      placeholder="Select month"
                      triggerClassName="mt-1 h-9 w-full"
                      options={months.map((m) => ({ value: m, label: m }))}
                    />
                  </Field>
                  <Field label="Reporting currency">
                    <ResponsiveSelect
                      value={form.currency}
                      onValueChange={(v) => update("currency", v)}
                      placeholder="Select currency"
                      triggerClassName="mt-1 h-9 w-full"
                      options={currencies}
                    />
                  </Field>
                </div>
                <Field label="Opening bank balance (optional)">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.opening_balance}
                    onChange={(e) => update("opening_balance", e.target.value)}
                    placeholder="0.00"
                  />
                </Field>
                <p className="rounded-[14px] px-4 py-3 text-[12px]" style={{ background: "var(--sb-soft)", color: "var(--sb-muted)" }}>
                  We create a standard South African chart of accounts for you, so you can start capturing transactions straight away.
                </p>
              </div>
            )}

            {current.key === "offering" && (
              <div className="space-y-3">
                {offeringChoices.map((choice) => {
                  const active = form.offering_type === choice.value;
                  const Icon = choice.icon;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      onClick={() => update("offering_type", choice.value)}
                      aria-pressed={active}
                      className="flex w-full items-start gap-3.5 rounded-[16px] p-4 text-left transition-colors"
                      style={{
                        background: active ? "var(--sb-soft)" : "transparent",
                        border: `1px solid ${active ? "var(--sb-brand)" : "var(--sb-border)"}`,
                      }}
                    >
                      <span
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px]"
                        style={{ background: active ? "var(--sb-brand)" : "var(--sb-soft)", color: active ? "#fff" : "var(--sb-brand)" }}
                      >
                        <Icon size={17} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block text-[14px] font-semibold" style={{ color: "var(--sb-ink)" }}>{choice.title}</b>
                        <small className="mt-0.5 block text-[12px]" style={{ color: "var(--sb-muted)" }}>{choice.description}</small>
                      </span>
                      {active && <Check size={17} className="mt-1 flex-none" style={{ color: "var(--sb-brand)" }} />}
                    </button>
                  );
                })}
                {errors.offering_type && <p className="text-[12px] text-red-600">{errors.offering_type}</p>}
              </div>
            )}

            {current.key === "review" && (
              <div className="space-y-4">
                <ReviewGroup title="Business" rows={[
                  ["Name", form.name],
                  ["Registration", form.registration_number],
                  ["Industry", form.industry],
                  ["Address", form.address],
                  ["Email", form.contact_email],
                  ["Phone", form.contact_phone],
                ]} />
                <ReviewGroup title="Tax" rows={[
                  ["VAT registered", form.vat_registered ? "Yes" : "No"],
                  ["VAT number", form.vat_registered ? form.vat_number : ""],
                  ["Income tax", form.tax_number],
                  ["PAYE", form.paye_number],
                  ["UIF", form.uif_number],
                  ["SDL", form.sdl_number],
                ]} />
                <ReviewGroup title="Finance" rows={[
                  ["Financial year end", form.financial_year_end],
                  ["Currency", form.currency],
                  ["Opening bank balance", form.opening_balance ? `${form.currency} ${Number(form.opening_balance).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` : ""],
                ]} />
                <ReviewGroup title="Workspace" rows={[["Catalogue", chosenOffering?.title || ""]]} />
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
                  Create my workspace <Check size={15} className="ml-1.5" />
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

function ReviewGroup({ title, rows }) {
  const filled = rows.filter(([, value]) => value);
  return (
    <div className="rounded-[16px] p-4" style={{ border: "1px solid var(--sb-border)" }}>
      <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--sb-muted)" }}>{title}</p>
      <dl className="mt-2 space-y-1.5">
        {filled.length === 0 && <p className="text-[13px]" style={{ color: "var(--sb-muted)" }}>Not provided</p>}
        {filled.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 text-[13px]">
            <dt style={{ color: "var(--sb-muted)" }}>{label}</dt>
            <dd className="min-w-0 break-words text-right font-medium" style={{ color: "var(--sb-ink)" }}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
