import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, LogOut, ChevronDown } from "lucide-react";
import { db } from "@/api/supabaseClient";
import Logo from "@/components/Logo";
import { navGroupsFor } from "./navConfig";

/**
 * Slide-in navigation for phones and portrait tablets.
 * Groups the same destinations the desktop sidebar shows, plus the company
 * switcher and account row so nothing is lost when the sidebar is hidden.
 */
export default function MobileNav({
  open,
  onClose,
  currentCompany,
  companies,
  onCompanyChange,
  portal,
  unallocatedCount,
  user,
}) {
  const location = useLocation();
  const isBusiness = portal === "business";
  const groups = navGroupsFor();
  const vat = currentCompany?.vat_number;
  const fyEnd = currentCompany?.financial_year_end;

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";
  const roleLabel = user?.role
    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : portal === "business" ? "Business" : "Accountant";

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <div className="sb-drawer-root" data-open={open ? "true" : "false"} aria-hidden={!open}>
      <button
        type="button"
        className="sb-drawer-backdrop"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />

      <aside className="sb-drawer" role="dialog" aria-modal="true" aria-label="Main menu">
        <div className="sb-drawer-head">
          <Logo size={34} dark />
          <button type="button" className="sb-drawer-close" aria-label="Close menu" onClick={onClose}>
            <X size={17} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </button>
        </div>

        {currentCompany && (
          <div className="sb-drawer-company">
            <p className="sb-drawer-eyebrow">Active company</p>
            {companies?.length > 1 ? (
              <div className="relative">
                <select
                  value={currentCompany.id || ""}
                  onChange={(e) => onCompanyChange(e.target.value)}
                  className="sb-company-select"
                  aria-label="Select company"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--sb-sidebar-text)" }}
                />
              </div>
            ) : (
              <p className="truncate text-[14px] font-bold text-white">{currentCompany.name}</p>
            )}
            {(vat || fyEnd) && (
              <p className="mt-1 truncate text-[11px]" style={{ color: "rgba(185,204,194,0.7)" }}>
                {vat ? `VAT ${vat}` : "No VAT number"}
                {fyEnd ? ` · FY ends ${String(fyEnd).slice(0, 3)}` : ""}
              </p>
            )}
          </div>
        )}

        <div className="sb-drawer-body">
          {groups.map((group) => (
            <div key={group.label} className="sb-drawer-group">
              <p className="sb-drawer-group-label">{group.label}</p>
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    data-active={isActive ? "true" : "false"}
                    className="sb-drawer-link"
                  >
                    <item.icon size={18} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="flex-none" />
                    <span className="truncate">{item.label}</span>
                    {item.path === "/transactions" && unallocatedCount > 0 && (
                      <span className="sb-drawer-badge">{unallocatedCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="sb-drawer-foot">
          <div className="sb-drawer-account">
            <span className="sb-avatar" aria-hidden="true">
              {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initials}
            </span>
            <div className="min-w-0 leading-tight">
              <b className="block truncate text-[13px] font-bold text-white">{user?.full_name || "Signed in"}</b>
              <small className="text-[11px]" style={{ color: "rgba(185,204,194,0.7)" }}>{roleLabel}</small>
            </div>
          </div>
          <button type="button" onClick={() => db.auth.logout("/")} className="sb-signout-btn">
            <LogOut size={17} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="flex-none" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
