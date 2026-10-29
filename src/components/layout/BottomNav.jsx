import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ArrowLeftRight, Upload, Sparkles, ScanLine } from "lucide-react";

const accountantItems = [
  { label: "Home", path: "/", icon: LayoutDashboard },
  { label: "Transactions", path: "/transactions", icon: ArrowLeftRight },
  { label: "Upload", path: "/upload", icon: Upload },
  { label: "Assistant", path: "/assistant", icon: Sparkles },
];

const businessItems = [
  { label: "Home", path: "/", icon: LayoutDashboard },
  { label: "Scan", path: "/scan-receipt", icon: ScanLine },
  { label: "Transactions", path: "/transactions", icon: ArrowLeftRight },
  { label: "Assistant", path: "/assistant", icon: Sparkles },
];

export default function BottomNav({ portal }) {
  const location = useLocation();
  const navigate = useNavigate();
  const items = portal === "business" ? businessItems : accountantItems;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-[#DDE6DF] flex items-center justify-around"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const active = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 py-2 px-4 flex-1 transition-colors ${
              active ? "text-[#2D5A43]" : "text-[#7A8E7E]"
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}