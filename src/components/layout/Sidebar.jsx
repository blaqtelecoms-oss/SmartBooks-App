import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, ChevronLeft } from "lucide-react";
import { db } from "@/api/supabaseClient";
import Logo from "@/components/Logo";
import { navForPortal } from "./navConfig";

export default function Sidebar({ currentCompany, companies, onCompanyChange, unallocatedCount, collapsed, onToggleCollapse }) {
  const location = useLocation();
  const navItems = navForPortal();
  const vat = currentCompany?.vat_number;
  const fyEnd = currentCompany?.financial_year_end;

  return (
    <aside className="sb-sidebar" data-collapsed={collapsed ? "true" : "false"}>
      {/* a) Header row: logo mark + wordmark + collapse toggle */}
      <div className="sb-sidebar-header">
        <Logo size={36} collapsed={collapsed} dark />
        <button
          type="button"
          onClick={onToggleCollapse}
          className="sb-sidebar-toggle"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft size={18} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
        </button>
      </div>

      {/* b) Company selector box */}
      {!collapsed && currentCompany && (
        <div className="sb-company-box">
          {companies?.length > 1 ? (
            <div className="relative">
              <select
                value={currentCompany?.id || ""}
                onChange={(e) => onCompanyChange(e.target.value)}
                className="sb-company-select"
                aria-label="Select company"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronLeft
                size={13}
                className="absolute right-0 top-1/2 -translate-y-1/2 -rotate-90 pointer-events-none"
                style={{ color: "var(--sb-sidebar-text)" }}
              />
            </div>
          ) : (
            <p className="truncate text-[13px] font-bold text-white">{currentCompany.name}</p>
          )}
          {(vat || fyEnd) && (
            <p className="mt-1 truncate text-[11px]" style={{ color: "rgba(185,204,194,0.75)" }}>
              {vat ? `VAT ${vat}` : "No VAT number"}
              {fyEnd ? ` · FY ends ${String(fyEnd).slice(0, 3)}` : ""}
            </p>
          )}
        </div>
      )}

      {/* c) Navigation */}
      <nav className="sb-sidebar-nav" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              data-active={isActive ? "true" : "false"}
              className="sb-nav-item"
            >
              <span className="sb-nav-icon">
                <item.icon size={16} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </span>
              <span className="sb-nav-label truncate">{item.label}</span>
              {item.path === "/transactions" && unallocatedCount > 0 && (
                <span className="sb-nav-badge">{collapsed && unallocatedCount > 9 ? "9+" : unallocatedCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* d) Sign out pinned bottom */}
      <div className="sb-sidebar-signout">
        <button
          type="button"
          onClick={() => db.auth.logout("/")}
          title={collapsed ? "Sign Out" : undefined}
          className="sb-signout-btn"
        >
          <LogOut size={18} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="flex-none" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
