import React, { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Camera, LogOut, Trash2 } from "lucide-react";
import { db } from "@/api/supabaseClient";
import { initialOf, roleLabelOf, toAvatarDataUrl } from "@/lib/avatar";

const Avatar = ({ avatarUrl, initial }) => (
  <span className="sb-avatar sb-avatar--lg" aria-hidden="true">
    {avatarUrl ? <img src={avatarUrl} alt="" /> : initial}
  </span>
);

export default function Profile() {
  const { user, refreshUser } = useOutletContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const avatarUrl = user?.avatar_url || null;
  const initial = initialOf(user);
  const roleLabel = roleLabelOf(user);

  const save = async (nextAvatar) => {
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
      const dataUrl = await toAvatarDataUrl(file);
      await save(dataUrl);
    } catch (err) {
      setError(err.message || "Could not read that image");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[680px] space-y-4">
      <div className="sb-card">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <Avatar avatarUrl={avatarUrl} initial={initial} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="truncate text-[24px] leading-tight" style={{ color: "var(--sb-ink)" }}>
              {user?.full_name || "Your profile"}
            </h2>
            <p className="mt-1 truncate text-[13px]" style={{ color: "var(--sb-muted)" }}>
              {user?.email || ""}
            </p>
            {roleLabel && (
              <span className="sb-chip sb-chip-green mt-2 inline-flex">{roleLabel}</span>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
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
              onClick={() => save(null)}
              disabled={busy}
            >
              <Trash2 size={15} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
              <span>Remove photo</span>
            </button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-[12px]" role="alert" style={{ color: "#B23A2E" }}>
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
      </div>

      <div className="sb-card flex items-center justify-between gap-3">
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
