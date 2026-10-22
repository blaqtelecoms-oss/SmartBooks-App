import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building2, Upload, BookOpen, FileText, Calculator,
  Shield, Settings, MessageSquare, Users, ArrowLeftRight, Receipt,
  Wand2, ScanLine, LogOut, PanelLeftClose, PanelLeftOpen, ChevronDown,
} from "lucide-react";
import { db } from "@/api/supabaseClient";
import Logo from "@/components/Logo";

const accountantNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Companies", icon: Building2, path: "/companies" },
  { label: "Transactions", icon: ArrowLeftRight, path: "/transactions" },
  { label: "Upload", icon: Upload, path: "/upload" },
  { label: "Allocation Rules", icon: Wand2, path: "/rules" },
  { label: "Chart of Accounts", icon: BookOpen, path: "/accounts" },
  { label: "Reports", icon: FileText, path: "/reports" },
  { label: "Tax", icon: Calculator, path: "/tax" },
  { label: "Documents", icon: Receipt, path: "/documents" },
  { label: "Team", icon: Users, path: "/team" },
  { label: "Audit Log", icon: Shield, path: "/audit" },
  { label: "AI Assistant", icon: MessageSquare, path: "/assistant" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const businessNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Scan Receipt", icon: ScanLine, path: "/scan-receipt" },
  { label: "Transactions", icon: ArrowLeftRight, path: "/transactions" },
  { label: "Upload Statement", icon: Upload, path: "/upload" },
  { label: "Tax", icon: Calculator, path: "/tax" },
  { label: "Receipts", icon: Receipt, path: "/documents" },
  { label: "Reports", icon: FileText, path: "/reports" },
  { label: "AI Assistant", icon: MessageSquare, path: "/assistant" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function Sidebar({ currentCompany, companies, onCompanyChange, portal, unallocatedCount, collapsed, onToggleCollapse }) {
  const location = useLocation();
  const isBusiness = portal === "business";
  const navItems = isBusiness ? businessNav : accountantNav;
  const expandedWidth = 244;
  const collapsedWidth = 72;

  return (
    <aside
      className="flex flex-col min-h-0 overflow-hidden flex-none transition-[width] duration-300 ease-out relative"
      style={{
        width: collapsed ? collapsedWidth : expandedWidth,
        background: "linear-gradient(180deg, #1a2e22 0%, #243d2e 100%)",
        flexShrink: 0,
      }}
    >
      {/* Brand header */}
      <div className="flex items-center h-[64px] flex-none px-4 border-b border-white/10">
        {collapsed ? (
          <div className="flex items-center justify-center w-full">
            <Logo size={34} />
          </div>
        ) : (
          <>
            <Logo size={34} />
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={onToggleCollapse}
                className="w-[30px] h-[30px] rounded-[8px] grid place-items-center text-white/50 hover:text-white hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer"
                title="Collapse menu"
              >
                <PanelLeftClose size={17} strokeWidth={1.8} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={onToggleCollapse}
          className="mx-auto mt-2.5 w-[40px] h-[40px] rounded-[10px] grid place-items-center text-white/40 hover:text-white hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer"
          title="Expand menu"
        >
          <PanelLeftOpen size={18} strokeWidth={1.8} />
        </button>
      )}

      {/* Company selector */}
      {!collapsed && (
        <div className="px-3 pt-3 flex-none">
          {!isBusiness && companies?.length > 0 && (
            <div className="relative">
              <select
                value={currentCompany?.id || ""}
                onChange={(e) => onCompanyChange(e.target.value)}
                className="w-full text-[13px] px-3 py-2.5 rounded-[10px] bg-white/8 text-white font-medium cursor-pointer appearance-none pr-8 border border-white/10 focus:outline-none focus:border-white/25 transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id} style={{ color: "#1A2E22", background: "#fff" }}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
          )}
          {isBusiness && currentCompany && (
            <div className="w-full text-[13px] px-3 py-2.5 rounded-[10px] text-white font-medium truncate border border-white/10" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
              {currentCompany.name}
            </div>
          )}
        </div>
      )}

      {/* Collapsed company initial */}
      {collapsed && (
        <div className="px-2 pt-3 flex justify-center flex-none">
          <div
            className="w-[40px] h-[40px] rounded-[12px] grid place-items-center text-white font-bold text-[14px] border border-white/10"
            style={{ background: "linear-gradient(135deg, #4A7C5E, #2D5A43)" }}
            title={currentCompany?.name}
          >
            {(currentCompany?.name || "C").charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="sb-nav-scroll min-h-0 flex-1 py-3 flex flex-col gap-1 mt-2 overflow-y-auto overflow-x-hidden">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center text-[13.5px] font-medium flex-none transition-all duration-200 relative rounded-[10px] ${
                collapsed
                  ? "justify-center mx-auto w-[44px] h-[44px]"
                  : "gap-[12px] px-3 py-[10px] mx-2"
              } ${
                isActive
                  ? "text-white"
                  : "text-white/55 hover:text-white"
              }`}
              style={isActive ? { background: "rgba(74,124,94,0.35)" } : {}}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[22px] rounded-r-full bg-[#7BB997]" style={{ left: collapsed ? '-2px' : '0' }} />
              )}
              <item.icon
                size={20}
                strokeWidth={1.7}
                className={`flex-none transition-all duration-200 ${isActive ? "text-[#9EDBB4]" : "group-hover:scale-110"}`}
              />
              {!collapsed && <span className="truncate tracking-tight">{item.label}</span>}
              {!collapsed && item.label === "Transactions" && unallocatedCount > 0 && (
                <span className="ml-auto text-[11px] bg-[#7BB997] text-[#1a2e22] rounded-full px-[7px] py-0.5 font-bold min-w-[20px] text-center">
                  {unallocatedCount}
                </span>
              )}
              {collapsed && item.label === "Transactions" && unallocatedCount > 0 && (
                <span className="absolute top-1 right-1 w-[17px] h-[17px] bg-[#7BB997] text-[#1a2e22] rounded-full text-[10px] font-bold grid place-items-center">
                  {unallocatedCount > 9 ? "9+" : unallocatedCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className={`flex-none border-t border-white/10 mt-1 ${collapsed ? "pt-2 px-2 flex justify-center" : "pt-2.5 mx-3"}`}>
        <button
          onClick={() => db.auth.logout("/")}
          title={collapsed ? "Sign Out" : undefined}
          className={`flex items-center rounded-[10px] text-[13.5px] font-medium text-white/50 hover:text-[#ff9e9e] transition-colors border-0 bg-transparent cursor-pointer ${
            collapsed ? "justify-center w-[44px] h-[44px] mx-auto" : "gap-[12px] w-full px-3 py-[10px]"
          }`}
        >
          <LogOut size={19} strokeWidth={1.7} className="flex-none" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
