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
    <div className="fixed inset-0 overflow-hidden sb-frame-body p-2.5 flex justify-center">
      <div
        className="w-full max-w-[1400px] flex flex-col bg-[rgba(255,255,255,0.45)] rounded-[28px] p-[14px]"
        style={{ boxShadow: "0 20px 60px rgba(45,90,67,0.12)" }}
      >
        <div className="grid grid-rows-[minmax(0,1fr)] bg-[#fbfdfb] rounded-[18px] overflow-hidden flex-1 min-h-0" style={{ gridTemplateColumns: `${sidebarCollapsed ? 68 : 218}px 1fr`, transition: 'grid-template-columns 0.3s ease-in-out' }}>
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
          <div className="flex flex-col min-w-0 min-h-0 overflow-hidden">
            {/* Header */}
            <header className="h-[68px] border-b border-[#e4ebe5] flex items-center gap-[18px] px-6 flex-none bg-[#fbfdfb]">
              <h1 className="text-[19px] font-semibold min-w-[150px] text-[#1A2E22] tracking-tight">{pageTitle}</h1>

              {/* Search */}
              <div className="flex-[0_1_460px] mx-auto relative">
                <div className="flex items-center gap-[9px] border border-[#e4ebe5] bg-white rounded-full px-[15px] py-2.5 text-[#7A8E7E] transition-colors focus-within:border-[#4A7C5E] focus-within:bg-white">
                  <Search size={18} strokeWidth={1.6} />
                  <input
                    type="text"
                    placeholder="Search transactions, companies, reports"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                    className="border-0 outline-0 bg-transparent w-full text-[14px] text-[#1A2E22] font-inherit"
                  />
                </div>
                {searchOpen && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#e4ebe5] rounded-[10px] z-50 overflow-hidden" style={{ boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}>
                    {matchingCompanies.length > 0 && (
                      <div className="py-1.5">
                        <p className="text-[12px] font-semibold text-[#7A8E7E] px-3 py-1 uppercase">Companies</p>
                        {matchingCompanies.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => { handleCompanyChange(c.id); navigate("/"); setSearchOpen(false); setSearchQuery(""); }}
                            className="block w-full text-left px-3 py-2.5 text-[14px] text-[#1A2E22] hover:bg-[#e9f3ea] border-0 bg-transparent cursor-pointer"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="py-1.5" style={{ borderTop: matchingCompanies.length ? "1px solid #e4ebe5" : 0 }}>
                      <button
                        type="button"
                        onMouseDown={() => { navigate("/transactions"); setSearchOpen(false); setSearchQuery(""); }}
                        className="block w-full text-left px-3 py-2.5 text-[14px] text-[#1A2E22] hover:bg-[#e9f3ea] border-0 bg-transparent cursor-pointer"
                      >
                        Search transactions for &ldquo;{searchQuery}&rdquo;
                      </button>
                      <button
                        type="button"
                        onMouseDown={() => { navigate("/reports"); setSearchOpen(false); setSearchQuery(""); }}
                        className="block w-full text-left px-3 py-2.5 text-[14px] text-[#1A2E22] hover:bg-[#e9f3ea] border-0 bg-transparent cursor-pointer"
                      >
                        Search reports for &ldquo;{searchQuery}&rdquo;
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Icon buttons */}
              <button className="w-[38px] h-[38px] border border-[#e4ebe5] bg-white rounded-[10px] grid place-items-center text-[#1A2E22] hover:border-[#4A7C5E] hover:bg-[#f0f7f1] transition-colors relative cursor-pointer">
                <Bell size={18} strokeWidth={1.6} />
                <span className="absolute top-[8px] right-2.5 w-1.5 h-1.5 rounded-full bg-[#C25B5B]" />
              </button>
              <button className="w-[38px] h-[38px] border border-[#e4ebe5] bg-white rounded-[10px] grid place-items-center text-[#1A2E22] hover:border-[#4A7C5E] hover:bg-[#f0f7f1] transition-colors cursor-pointer">
                <Mail size={18} strokeWidth={1.6} />
              </button>

              {/* User chip */}
              <div className="flex items-center gap-[9px] pl-2 border-l border-[#e4ebe5]">
                <div className="w-[34px] h-[34px] rounded-full grid place-items-center text-white font-semibold text-[13px]" style={{ background: "linear-gradient(135deg, #6BA17E, #2D5A43)" }}>
                  {initials}
                </div>
                <div>
                  <b className="block text-[14px] font-semibold text-[#1A2E22]">{user?.full_name || "User"}</b>
                  <small className="text-[#7A8E7E] text-[12px]">{roleLabel}</small>
                </div>
              </div>
            </header>

            {/* Content scroll area */}
            <div className="sb-content-scroll overflow-y-auto flex-1 min-h-0" style={{ padding: "16px" }}>
              <Outlet context={{ currentCompany, companies, refreshCompanies: loadCompanies, user, portal, scale: 1 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}