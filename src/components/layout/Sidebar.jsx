import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building2, Upload, BookOpen, FileText, Calculator,
  Shield, Settings, MessageSquare, Users, ArrowLeftRight, Receipt,
  Wand2, ScanLine, LogOut, PanelLeftClose, PanelLeftOpen, ChevronRight,
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
  const expandedWidth = 218;
  const collapsedWidth = 68;

  return (
    <aside
      className="border-r border-[#e4ebe5] flex flex-col min-h-0 overflow-hidden flex-none transition-[width] duration-300 ease-out relative"
      style={{ width: collapsed ? collapsedWidth : expandedWidth, background: "#fbfdfb", flexShrink: 0 }}
    >
      {/* Brand + collapse toggle */}
      <div className="flex items-center gap-[9px] px-4 pt-4 pb-3 border-b border-[#e4ebe5] h-[64px] flex-none">
        {collapsed ? (
          <div className="flex items-center justify-center w-full">
            <Logo size={32} />
          </div>
        ) : (
          <>
            <Logo size={30} />
            <button
              onClick={onToggleCollapse}
              className="ml-auto w-[34px] h-[34px] rounded-[9px] grid place-items-center text-[#5C7263] bg-[#e9f3ea] hover:bg-[#d6ebd9] hover:text-[#2D5A43] transition-colors border border-[#e4ebe5] cursor-pointer flex-none"
              title="Collapse menu"
            >
              <PanelLeftClose size={18} strokeWidth={1.8} />
            </button>
          </>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={onToggleCollapse}
          className="mx-auto mt-2 w-[40px] h-[40px] rounded-[10px] grid place-items-center text-[#5C7263] bg-[#e9f3ea] hover:bg-[#d6ebd9] hover:text-[#2D5A43] transition-colors border border-[#e4ebe5] cursor-pointer"
          title="Expand menu"
        >
          <PanelLeftOpen size={20} strokeWidth={1.8} />
        </button>
      )}

      {/* Company selector — accountant portal only */}
      {!isBusiness && companies?.length > 0 && !collapsed && (
        <div className="px-3 pt-3 flex-none">
          <div className="relative">
            <select
              value={currentCompany?.id || ""}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="w-full text-[13px] px-3 py-2.5 rounded-[10px] border border-[#e4ebe5] bg-[#f4f7f3] text-[#1A2E22] focus:outline-none focus:border-[#4A7C5E] cursor-pointer appearance-none font-medium pr-8"
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronRight size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-[#7A8E7E] pointer-events-none" />
          </div>
        </div>
      )}

      {/* Collapsed company icon */}
      {!isBusiness && companies?.length > 0 && collapsed && (
        <div className="px-2 pt-3 flex justify-center flex-none">
          <div className="w-[36px] h-[36px] rounded-[10px] bg-[#d6ebd9] grid place-items-center text-[#2D5A43] font-bold text-[13px]" title={currentCompany?.name}>
            {(currentCompany?.name || "C").charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Business name — single business */}
      {isBusiness && currentCompany && !collapsed && (
        <div className="px-3 pt-3 flex-none">
          <div className="w-full text-[13px] px-3 py-2.5 rounded-[10px] border border-[#e4ebe5] bg-[#f4f7f3] text-[#1A2E22] font-medium truncate">
            {currentCompany.name}
          </div>
        </div>
      )}

      {isBusiness && currentCompany && collapsed && (
        <div className="px-2 pt-3 flex justify-center flex-none">
          <div className="w-[36px] h-[36px] rounded-[10px] bg-[#d6ebd9] grid place-items-center text-[#2D5A43] font-bold text-[13px]" title={currentCompany.name}>
            {currentCompany.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Nav — scrollable */}
      <nav className="sb-nav-scroll min-h-0 flex-1 py-3 px-2.5 flex flex-col gap-0.5 mt-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center rounded-[9px] text-[14px] font-medium flex-none transition-all duration-200 relative ${
                collapsed ? "justify-center px-0 py-2.5 mx-auto w-[40px] h-[40px]" : "gap-[11px] px-[11px] py-2.5"
              } ${
                isActive
                  ? "bg-[#d6ebd9] text-[#2D5A43] font-semibold"
                  : "text-[#5C7263] hover:bg-[#e9f3ea] hover:text-[#2D5A43]"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[20px] rounded-r-full bg-[#4A7C5E]" />
              )}
              <item.icon
                size={20}
                strokeWidth={1.6}
                className={`flex-none transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-[#4A7C5E]" : ""}`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.label === "Transactions" && unallocatedCount > 0 && (
                <span className="ml-auto text-[11px] bg-[#4A7C5E] text-white rounded-full px-[7px] py-0.5 font-semibold min-w-[20px] text-center">
                  {unallocatedCount}
                </span>
              )}
              {collapsed && item.label === "Transactions" && unallocatedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-[16px] h-[16px] bg-[#4A7C5E] text-white rounded-full text-[10px] font-semibold grid place-items-center">
                  {unallocatedCount > 9 ? "9+" : unallocatedCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className={`flex-none border-t border-[#e4ebe5] mt-1 ${collapsed ? "pt-2 px-2 flex justify-center" : "pt-2.5 mx-3"}`}>
        <button
          onClick={() => db.auth.logout("/")}
          title={collapsed ? "Sign Out" : undefined}
          className={`flex items-center rounded-[9px] text-[14px] font-medium text-[#5C7263] hover:text-[#C25B5B] hover:bg-[#fbe9e9] transition-colors border-0 bg-transparent cursor-pointer ${
            collapsed ? "justify-center w-[40px] h-[40px] mx-auto" : "gap-2 w-full px-3 py-2.5"
          }`}
        >
          <LogOut size={18} strokeWidth={1.6} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
