import React, { useEffect, useRef, useState } from "react";
import { Camera, LogOut, Trash2 } from "lucide-react";
import { db } from "@/api/supabaseClient";

const MAX_SIDE = 256;

/** Centre-crops the chosen image to a square and returns a small data URL. */
const toAvatarDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read that image"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = MAX_SIDE;
        canvas.height = MAX_SIDE;
        canvas
          .getContext("2d")
          .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, MAX_SIDE, MAX_SIDE);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

/**
 * Account avatar in the top bar. Clicking it opens a small menu where the user can
 * upload or remove their own profile picture.
 */
export default function ProfileMenu({ user, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const rootRef = useRef(null);

  const avatarUrl = user?.avatar_url;
  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const save = async (nextAvatar) => {
    setBusy(true);
    setError("");
    try {
      await db.auth.updateAvatar(nextAvatar);
      onUpdated((prev) => ({ ...prev, avatar_url: nextAvatar }));
      setOpen(false);
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
      save(await toAvatarDataUrl(file));
    } catch (err) {
      setError(err.message || "Could not read that image");
      setBusy(false);
    }
  };

  return (
    <div className="sb-profile" ref={rootRef}>
      <button
        type="button"
        className="sb-avatar sb-avatar-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        title={user?.full_name || "User"}
      >
        {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
      </button>

      {open && (
        <div className="sb-profile-pop" role="menu">
          <div className="sb-profile-head">
            <b className="block truncate text-[13px] font-bold" style={{ color: "var(--sb-ink)" }}>
              {user?.full_name || "Signed in"}
            </b>
            <small className="block truncate text-[11px]" style={{ color: "var(--sb-muted)" }}>
              {user?.email || ""}
            </small>
          </div>

          <button
            type="button"
            role="menuitem"
            className="sb-profile-item"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Camera size={15} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
            <span>{busy ? "Saving…" : avatarUrl ? "Change photo" : "Upload photo"}</span>
          </button>

          {avatarUrl && (
            <button
              type="button"
              role="menuitem"
              className="sb-profile-item sb-profile-item--danger"
              onClick={() => save(null)}
              disabled={busy}
            >
              <Trash2 size={15} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
              <span>Remove photo</span>
            </button>
          )}

          {error && (
            <p className="px-2.5 pb-1 pt-1 text-[11px] leading-snug" role="alert" style={{ color: "#B23A2E" }}>
              {error}
            </p>
          )}

          <div className="my-1 h-px" style={{ background: "var(--sb-border)" }} />

          <button
            type="button"
            role="menuitem"
            className="sb-profile-item"
            onClick={() => db.auth.logout("/")}
          >
            <LogOut size={15} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
            <span>Sign out</span>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
            aria-label="Choose a profile photo"
          />
        </div>
      )}
    </div>
  );
}
