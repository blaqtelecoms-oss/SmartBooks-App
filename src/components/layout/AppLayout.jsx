import React, { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import BottomNav from "./BottomNav";
import { Bell, Mail, Menu, Search } from "lucide-react";

const PAGE_TITLES = {
  "/": "Dashboard",
  "/companies": "Companies",
  "/transactions": "Transactions",
  "/upload": "Upload Statement",
  "/scan-receipt": "Scan Receipt",
  "/rules": "Allocation Rules",
  "/bank-rules": "Bank Rules",
  "/accounts": "Chart of Accounts",
  "/reports": "Reports",
  "/tax": "Tax",
  "/vat201": "VAT 201",
  "/aging": "Aging Reports",
  "/invoices": "Invoices",
  "/inventory": "Inventory",
  "/documents": "Receipts",
  "/team": "Team",
  "/audit": "Audit Log",
  "/assistant": "AI Assistant",
  "/settings": "Settings",
};

const readCollapsed = () => {
  try {
    return localStorage.getItem("smartbooks_sidebar_collapsed") === "true";
  } catch (e) {
    return false;
  }
};

const writeCollapsed = (value) => {
  try {
    localStorage.setItem("smartbooks_sidebar_collapsed", String(value));
  } catch (e) {
    /* storage unavailable — collapse state stays in memory */
  }
};

export default function AppLayout() {
  const [companies, setCompanies] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [portal, setPortal] = useState(null);
  const [unallocatedCount, setUnallocatedCount] = useState(0);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsed);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const searchRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(next);
      return next;
    });
  };

  useEffect(() => {
    setPortal(localStorage.getItem("smartbooks_portal") || "accountant");
    loadCompanies();
    loadUser();
  }, []);

  useEffect(() => {
    if (currentCompany) loadUnallocatedCount();
  }, [currentCompany]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const loadCompanies = async () => {
    try {
      const list = await db.entities.Company.list();
      setCompanies(list);
      if (list.length > 0) {
        const saved = localStorage.getItem("smartbooks_company_id");
        const found = list.find((c) => c.id === saved);
        setCurrentCompany(found || list[0]);
      }
    } catch (e) {}
  };

  const loadUnallocatedCount = async () => {
    try {
      const count = await db.entities.Transaction.count({
        company_id: currentCompany.id,
        status: "unallocated",
      });
      setUnallocatedCount(count);
    } catch (e) {}
  };

  const loadUser = async () => {
    try { setUser(await db.auth.me()); } catch (e) {}
  };

  const handleCompanyChange = (companyId) => {
    const company = companies.find((c) => c.id === companyId);
    if (company) {
      setCurrentCompany(company);
      localStorage.setItem("smartbooks_company_id", company.id);
    }
  };

  const pageTitle = PAGE_TITLES[location.pathname] || "Dashboard";
  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";
  const roleLabel = user?.role
    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  const matchingCompanies = searchQuery
    ? companies.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div className="sb-shell" data-collapsed={sidebarCollapsed ? "true" : "false"}>
      <Sidebar
        currentCompany={currentCompany}
        companies={companies}
        onCompanyChange={handleCompanyChange}
        unallocatedCount={unallocatedCount}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      <div className="sb-main">
        {/* Top bar */}
        <header className="sb-topbar">
          <button
            type="button"
            className="sb-menu-btn"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileNavOpen}
          >
            <Menu size={18} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </button>

          <p className="sb-label truncate min-w-0" aria-label="Current page">
            <span className="sb-topbar-brand">SmartBooks</span>
            <span style={{ opacity: 0.5 }}> / </span>
            {pageTitle}
          </p>

          {/* Search */}
          <div className="sb-search-wrap relative ml-auto w-full max-w-[420px]">
            <div className="sb-search">
              <Search size={16} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--sb-muted)" }} className="flex-none" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search transactions, companies, reports"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--sb-muted)]"
                style={{ border: 0, color: "var(--sb-ink)" }}
                aria-label="Search transactions, companies, reports"
              />
              <kbd
                className="hidden sm:inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold flex-none"
                style={{ background: "var(--sb-soft)", color: "var(--sb-muted)", border: "1px solid var(--sb-border)" }}
              >
                ⌘K
              </kbd>
            </div>
            {searchOpen && searchQuery && (
              <div
                className="absolute right-0 left-0 top-full z-50 mt-2 overflow-hidden rounded-[16px]"
                style={{ background: "var(--sb-card)", border: "1px solid var(--sb-border)", boxShadow: "0 12px 32px -12px rgba(11,31,26,0.25)" }}
              >
                {matchingCompanies.length > 0 && (
                  <div className="py-1.5">
                    <p className="sb-label px-3 py-1">Companies</p>
                    {matchingCompanies.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => { handleCompanyChange(c.id); navigate("/"); setSearchOpen(false); setSearchQuery(""); }}
                        className="block w-full cursor-pointer border-0 bg-transparent px-3 py-2.5 text-left text-[13px] font-medium hover:bg-[var(--sb-soft)]"
                        style={{ color: "var(--sb-ink)" }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="py-1.5" style={{ borderTop: matchingCompanies.length ? "1px solid var(--sb-border)" : 0 }}>
                  <button
                    type="button"
                    onMouseDown={() => { navigate("/transactions"); setSearchOpen(false); setSearchQuery(""); }}
                    className="block w-full cursor-pointer border-0 bg-transparent px-3 py-2.5 text-left text-[13px] font-medium hover:bg-[var(--sb-soft)]"
                    style={{ color: "var(--sb-ink)" }}
                  >
                    Search transactions for &ldquo;{searchQuery}&rdquo;
                  </button>
                  <button
                    type="button"
                    onMouseDown={() => { navigate("/reports"); setSearchOpen(false); setSearchQuery(""); }}
                    className="block w-full cursor-pointer border-0 bg-transparent px-3 py-2.5 text-left text-[13px] font-medium hover:bg-[var(--sb-soft)]"
                    style={{ color: "var(--sb-ink)" }}
                  >
                    Search reports for &ldquo;{searchQuery}&rdquo;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Icon buttons + avatar */}
          <div className="sb-topbar-actions flex items-center gap-2 flex-none">
            <button type="button" className="sb-icon-btn" aria-label="Notifications">
              <Bell size={17} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
              <span className="absolute right-2.5 top-2.5 h-[7px] w-[7px] rounded-full" style={{ background: "#D14343", boxShadow: "0 0 0 2px var(--sb-card)" }} />
            </button>
            <button type="button" className="sb-icon-btn sb-icon-btn--mail" aria-label="Messages">
              <Mail size={17} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
            </button>
            <div className="ml-1 hidden items-center gap-2.5 md:flex">
              <div className="sb-avatar" title={user?.full_name || "User"}>{initials}</div>
              <div className="leading-tight hidden xl:block">
                <b className="block text-[13px] font-bold" style={{ color: "var(--sb-ink)" }}>{user?.full_name || "User"}</b>
                <small className="text-[11px]" style={{ color: "var(--sb-muted)" }}>{roleLabel}</small>
              </div>
            </div>
            <div className="md:hidden">
              <div className="sb-avatar" title={user?.full_name || "User"}>{initials}</div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="sb-page flex-1 min-w-0">
          <Outlet context={{ currentCompany, companies, refreshCompanies: loadCompanies, user, portal, scale: 1 }} />
        </div>
      </div>

      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        currentCompany={currentCompany}
        companies={companies}
        onCompanyChange={handleCompanyChange}
        portal={portal}
        unallocatedCount={unallocatedCount}
        user={user}
      />

      <BottomNav onOpenMenu={() => setMobileNavOpen(true)} />
    </div>
  );
}
