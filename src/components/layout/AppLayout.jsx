import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import Sidebar from "./Sidebar";
import { Bell, Mail, Search } from "lucide-react";

const PAGE_TITLES = {
  "/": "Dashboard",
  "/companies": "Companies",
  "/transactions": "Transactions",
  "/upload": "Upload Statement",
  "/scan-receipt": "Scan Receipt",
  "/rules": "Allocation Rules",
  "/accounts": "Chart of Accounts",
  "/reports": "Reports",
  "/tax": "Tax",
  "/documents": "Documents",
  "/team": "Team",
  "/audit": "Audit Log",
  "/assistant": "AI Assistant",
  "/settings": "Settings",
};

export default function AppLayout() {
  const [companies, setCompanies] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [portal, setPortal] = useState(null);
  const [unallocatedCount, setUnallocatedCount] = useState(0);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("smartbooks_sidebar_collapsed") === "true";
  });
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("smartbooks_sidebar_collapsed", String(next));
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

  const loadCompanies = async () => {
    try {
      const list = await db.entities.Company.list();
      setCompanies(list);
      if (list.length > 0) {
        const saved = localStorage.getItem("smartbooks_company_id");
        const found = list.find(c => c.id === saved);
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
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setCurrentCompany(company);
      localStorage.setItem("smartbooks_company_id", company.id);
    }
  };

  const pageTitle = PAGE_TITLES[location.pathname] || "Dashboard";
  const initials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";
  const roleLabel = user?.role
    ? user.role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : "";

  const matchingCompanies = searchQuery
    ? companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div className="fixed inset-0 overflow-hidden sb-frame-body flex justify-center" style={{ padding: "10px", background: "#eef2ee" }}>
      <div
        className="w-full max-w-[1440px] flex flex-col bg-white rounded-[24px] overflow-hidden flex-1"
        style={{ boxShadow: "0 8px 40px rgba(26,46,34,0.10)" }}
      >
        <div className="flex flex-1 min-h-0">
          <Sidebar
            currentCompany={currentCompany}
            companies={companies}
            onCompanyChange={handleCompanyChange}
            portal={portal}
            unallocatedCount={unallocatedCount}
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
          />

          {/* Main */}
          <div className="flex flex-col min-w-0 flex-1 min-h-0 overflow-hidden">
            {/* Header */}
            <header className="h-[68px] border-b border-[#eaeef0] flex items-center gap-4 px-6 flex-none bg-white">
              <h1 className="text-[20px] font-bold text-[#1A2E22] tracking-tight min-w-[140px]">{pageTitle}</h1>

              {/* Search */}
              <div className="flex-[0_1_420px] mx-auto relative">
                <div className="flex items-center gap-2.5 bg-[#f4f7f5] rounded-[12px] px-4 py-2.5 transition-all duration-200 focus-within:bg-white focus-within:shadow-[0_0_0_2px_#4A7C5E33]">
                  <Search size={17} strokeWidth={1.8} className="text-[#9aa8a0]" />
                  <input
                    type="text"
                    placeholder="Search transactions, companies, reports"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                    className="border-0 outline-0 bg-transparent w-full text-[14px] text-[#1A2E22] font-medium placeholder:text-[#9aa8a0]"
                  />
                </div>
                {searchOpen && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#eaeef0] rounded-[12px] z-50 overflow-hidden" style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}>
                    {matchingCompanies.length > 0 && (
                      <div className="py-1.5">
                        <p className="text-[11px] font-semibold text-[#9aa8a0] px-3 py-1 uppercase tracking-wide">Companies</p>
                        {matchingCompanies.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => { handleCompanyChange(c.id); navigate("/"); setSearchOpen(false); setSearchQuery(""); }}
                            className="block w-full text-left px-3 py-2.5 text-[14px] text-[#1A2E22] hover:bg-[#f0f7f1] border-0 bg-transparent cursor-pointer font-medium"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="py-1.5" style={{ borderTop: matchingCompanies.length ? "1px solid #eaeef0" : 0 }}>
                      <button
                        type="button"
                        onMouseDown={() => { navigate("/transactions"); setSearchOpen(false); setSearchQuery(""); }}
                        className="block w-full text-left px-3 py-2.5 text-[14px] text-[#1A2E22] hover:bg-[#f0f7f1] border-0 bg-transparent cursor-pointer font-medium"
                      >
                        Search transactions for &ldquo;{searchQuery}&rdquo;
                      </button>
                      <button
                        type="button"
                        onMouseDown={() => { navigate("/reports"); setSearchOpen(false); setSearchQuery(""); }}
                        className="block w-full text-left px-3 py-2.5 text-[14px] text-[#1A2E22] hover:bg-[#f0f7f1] border-0 bg-transparent cursor-pointer font-medium"
                      >
                        Search reports for &ldquo;{searchQuery}&rdquo;
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Icon buttons */}
              <button className="w-[40px] h-[40px] bg-[#f4f7f5] rounded-[12px] grid place-items-center text-[#5C7263] hover:bg-[#e9f3ea] hover:text-[#2D5A43] transition-colors relative cursor-pointer border-0">
                <Bell size={18} strokeWidth={1.7} />
                <span className="absolute top-2.5 right-2.5 w-[7px] h-[7px] rounded-full bg-[#C25B5B] ring-2 ring-white" />
              </button>
              <button className="w-[40px] h-[40px] bg-[#f4f7f5] rounded-[12px] grid place-items-center text-[#5C7263] hover:bg-[#e9f3ea] hover:text-[#2D5A43] transition-colors cursor-pointer border-0">
                <Mail size={18} strokeWidth={1.7} />
              </button>

              {/* User chip */}
              <div className="flex items-center gap-2.5 pl-3 ml-1 border-l border-[#eaeef0]">
                <div className="w-[36px] h-[36px] rounded-full grid place-items-center text-white font-bold text-[13px]" style={{ background: "linear-gradient(135deg, #6BA17E, #2D5A43)" }}>
                  {initials}
                </div>
                <div className="leading-tight">
                  <b className="block text-[14px] font-semibold text-[#1A2E22]">{user?.full_name || "User"}</b>
                  <small className="text-[#9aa8a0] text-[12px]">{roleLabel}</small>
                </div>
              </div>
            </header>

            {/* Content scroll area */}
            <div className="sb-content-scroll overflow-y-auto flex-1 min-h-0" style={{ padding: "20px", background: "#f9fbf9" }}>
              <Outlet context={{ currentCompany, companies, refreshCompanies: loadCompanies, user, portal, scale: 1 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
