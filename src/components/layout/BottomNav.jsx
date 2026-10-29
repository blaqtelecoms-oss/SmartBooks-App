import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ArrowLeftRight, Upload, FileText, Menu } from "lucide-react";

// Four primary destinations plus a raised capture action and the full menu.
// Shared by both portals so the quick bar is identical everywhere.
const quickItems = [
  { label: "Home", path: "/", icon: LayoutDashboard },
  { label: "Transactions", path: "/transactions", icon: ArrowLeftRight },
  { label: "Upload", path: "/upload", icon: Upload, primary: true },
  { label: "Reports", path: "/reports", icon: FileText },
];

export default function BottomNav({ onOpenMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const items = quickItems;

  return (
    <nav className="sb-bottomnav" aria-label="Quick navigation">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            data-active={isActive ? "true" : "false"}
            aria-current={isActive ? "page" : undefined}
            className={`sb-bottomnav-item${item.primary ? " is-primary" : ""}`}
          >
            {item.primary ? (
              <span className="sb-bottomnav-fab">
                <Icon size={21} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </span>
            ) : (
              <span className="sb-bottomnav-icon">
                <Icon size={19} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
              </span>
            )}
            <span className="sb-bottomnav-label">{item.label}</span>
          </button>
        );
      })}
      <button type="button" onClick={onOpenMenu} className="sb-bottomnav-item" aria-label="Open full menu">
        <span className="sb-bottomnav-icon">
          <Menu size={19} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
        </span>
        <span className="sb-bottomnav-label">Menu</span>
      </button>
    </nav>
  );
}
