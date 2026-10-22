import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building2, Upload, BookOpen, FileText, Calculator,
  Shield, Settings, MessageSquare, Users, ArrowLeftRight, Receipt,
  Wand2, ScanLine, LogOut,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
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

export default function Sidebar({ currentCompany, companies, onCompanyChange, portal, unallocatedCount }) {
  const location = useLocation();
  const isBusiness = portal === "business";
  const navItems = isBusiness ? businessNav : accountantNav;

  return (
    <aside className="border-r border-[#e4ebe5] flex flex-col pb-3.5 bg-[#fbfdfb] min-h-0 overflow-hidden">
      {/* Brand */}
      <div className="flex items-center gap-[9px] px-5 pt-5 pb-[18px] border-b border-[#e4ebe5] h-[64px] flex-none">
        <Logo size={32} />
      </div>

      {/* Company selector — accountant portal only */}
      {!isBusiness && companies?.length > 0 && (
        <div className="px-3 pt-3 flex-none">
          <select
            value={currentCompany?.id || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            className="w-full text-[14px] px-3 py-2.5 rounded-[9px] border border-[#e4ebe5] bg-[#f4f7f3] text-[#1A2E22] focus:outline-none focus:border-[#4A7C5E] cursor-pointer"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Business name — single business */}
      {isBusiness && currentCompany && (
        <div className="px-3 pt-3 flex-none">
          <div className="w-full text-[14px] px-3 py-2.5 rounded-[9px] border border-[#e4ebe5] bg-[#f4f7f3] text-[#1A2E22] font-medium truncate">
            {currentCompany.name}
          </div>
        </div>
      )}

      {/* Nav — scrollable */}
      <nav className="sb-nav-scroll min-h-0 flex-1 py-3 px-2.5 flex flex-col gap-0.5">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-[11px] px-[11px] py-2.5 rounded-[9px] text-[15px] font-medium flex-none transition-colors ${
                isActive
                  ? "bg-[#d6ebd9] text-[#2D5A43] font-semibold"
                  : "text-[#5C7263] hover:bg-[#e9f3ea]"
              }`}
            >
              <item.icon size={20} strokeWidth={1.6} className="flex-none" />
              <span>{item.label}</span>
              {item.label === "Transactions" && unallocatedCount > 0 && (
                <span className="ml-auto text-[12px] bg-[#d6ebd9] text-[#2D5A43] rounded-full px-[7px] py-0.5 font-semibold">
                  {unallocatedCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="mx-3 mt-2 flex-none">
        <button
          onClick={() => base44.auth.logout("/")}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-[9px] text-[14px] font-medium text-[#5C7263] hover:text-[#C25B5B] hover:bg-[#fbe9e9] transition-colors border-0 bg-transparent cursor-pointer"
        >
          <LogOut size={18} strokeWidth={1.6} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}