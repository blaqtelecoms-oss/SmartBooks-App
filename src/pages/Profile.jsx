import React, { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Camera, LogOut, Trash2, Loader2 } from "lucide-react";
import { db } from "@/api/supabaseClient";
import { initialOf, roleLabelOf, toAvatarDataUrl } from "@/lib/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const EMPTY_FORM = {
  full_name: "",
  business_name: "",
  registration_number: "",
  vat_number: "",
  phone: "",
  address: "",
};

const DETAIL_FIELDS = [
  { key: "full_name", label: "Full name", placeholder: "e.g. Linda Mokoena" },
  { key: "business_name", label: "Business / trading name", placeholder: "e.g. Protea Solutions (Pty) Ltd" },
  { key: "registration_number", label: "Registration number", placeholder: "e.g. 2019/123456/07" },
  { key: "vat_number", label: "VAT number", placeholder: "e.g. 4987654321" },
  { key: "phone", label: "Contact number", placeholder: "e.g. 082 000 0000" },
];

const formFromUser = (user) => ({
  full_name: user?.full_name || "",
  business_name: user?.business_name || "",
  registration_number: user?.registration_number || "",
  vat_number: user?.vat_number || "",
  phone: user?.phone || "",
  address: user?.address || "",
});

export default function Profile() {
  const { user, refreshUser } = useOutletContext();
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    setForm(formFromUser(user));
  }, [user]);

  const avatarUrl = user?.avatar_url || null;
  const roleLabel = roleLabelOf(user);
  const saved = formFromUser(user);
  const dirty = Object.keys(form).some((key) => (form[key] || "") !== (saved[key] || ""));

  const saveAvatar = async (nextAvatar) => {
    setBusy(true);
    setError("");
    try {
      await db.auth.updateAvatar(nextAvatar);
      await refreshUser?.();
    } catch (err) {
      setError(err.message || "Could not save your photo");
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await saveAvatar(await toAvatarDataUrl(file));
    } catch (err) {
      setError(err.message || "Could not read that image");
      setBusy(false);
    }
  };

  const saveDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await db.auth.updateProfile({
        full_name: form.full_name.trim(),
        business_name: form.business_name.trim(),
        registration_number: form.registration_number.trim(),
        vat_number: form.vat_number.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      await refreshUser?.();
      toast({ title: "Profile updated" });
    } catch (err) {
      toast({ title: "Could not save your profile", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="sb-display" style={{ fontSize: 40, lineHeight: 1.05, color: "var(--sb-ink)" }}>
          Profile
        </h1>
        <p className="mt-2 text-[13px]" style={{ color: "var(--sb-muted)" }}>
          Your details and business information, used across SmartBooks.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Photo + account summary */}
        <section className="sb-card flex flex-col items-center text-center" style={{ padding: 22 }}>
          <span className="sb-avatar sb-avatar--lg" aria-hidden="true">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : initialOf(user)}
          </span>
          <b className="mt-3 block max-w-full truncate text-[14px] font-bold" style={{ color: "var(--sb-ink)" }}>
            {user?.business_name || user?.full_name || "Your profile"}
          </b>
          <p className="mt-0.5 block max-w-full truncate text-[12px]" style={{ color: "var(--sb-muted)" }}>
            {user?.email || ""}
          </p>
          {roleLabel && <span className="sb-chip sb-chip-green mt-2">{roleLabel}</span>}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="sb-btn sb-btn-primary inline-flex items-center gap-2"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Camera size={15} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
              <span>{busy ? "Saving…" : avatarUrl ? "Change photo" : "Upload photo"}</span>
            </button>
            {avatarUrl && (
              <button
                type="button"
                className="sb-btn sb-btn-outline inline-flex items-center gap-2"
                onClick={() => saveAvatar(null)}
                disabled={busy}
              >
                <Trash2 size={15} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
                <span>Remove</span>
              </button>
            )}
          </div>

          {error && (
            <p className="mt-3 text-[12px]" role="alert" style={{ color: "var(--sb-red-ink)" }}>
              {error}
            </p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
            aria-label="Choose a profile photo"
          />
        </section>

        {/* Editable details */}
        <form className="sb-card" onSubmit={saveDetails} style={{ padding: 22 }}>
          <p className="sb-label">Profile details</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {DETAIL_FIELDS.map((field) => (
              <div key={field.key}>
                <Label htmlFor={field.key} className="text-[11px]" style={{ color: "var(--sb-muted)" }}>
                  {field.label}
                </Label>
                <Input
                  id={field.key}
                  value={form[field.key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="mt-1 text-[13px]"
                />
              </div>
            ))}
            <div>
              <Label className="text-[11px]" style={{ color: "var(--sb-muted)" }}>
                Email
              </Label>
              <Input value={user?.email || ""} readOnly disabled className="mt-1 text-[13px]" />
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="address" className="text-[11px]" style={{ color: "var(--sb-muted)" }}>
              Business address
            </Label>
            <textarea
              id="address"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Street, suburb, city, postal code"
              rows={3}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-[13px] outline-none focus:ring-2"
              style={{ borderColor: "var(--sb-border)", color: "var(--sb-ink)", background: "var(--sb-card)" }}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              className="sb-btn sb-btn-outline"
              onClick={() => setForm(formFromUser(user))}
              disabled={!dirty || saving}
            >
              Reset
            </button>
            <button type="submit" className="sb-btn sb-btn-primary inline-flex items-center gap-2" disabled={!dirty || saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              <span>{saving ? "Saving…" : "Save changes"}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="sb-card flex items-center justify-between gap-3" style={{ padding: 20 }}>
        <div className="min-w-0">
          <b className="block text-[13px] font-bold" style={{ color: "var(--sb-ink)" }}>
            Signed in as {user?.email || "your account"}
          </b>
          <small className="text-[11px]" style={{ color: "var(--sb-muted)" }}>
            Sign out on this device when you are finished.
          </small>
        </div>
        <button
          type="button"
          className="sb-btn sb-btn-outline inline-flex flex-none items-center gap-2"
          onClick={() => db.auth.logout("/")}
        >
          <LogOut size={15} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
