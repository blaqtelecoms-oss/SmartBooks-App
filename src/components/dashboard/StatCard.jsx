import React from "react";
import { Wallet, TrendingUp, Calculator, Receipt } from "lucide-react";

const PILL_STYLES = {
  green: "bg-[#e9f3ea] text-[#2D5A43]",
  red: "bg-[#fbe9e9] text-[#C25B5B]",
  gold: "bg-[#fbf1e1] text-[#B8915A]",
};

export default function StatCard({ label, value, icon: Icon, iconColor, iconBg, trend, pillType = "green" }) {
  const trendStr = `${trend >= 0 ? "+ " : "- "}${Math.abs(trend).toFixed(2)}%`;
  return (
    <div
      className="bg-white rounded-[14px] border border-[#e4ebe5] p-4"
      style={{ boxShadow: "0 1px 2px rgba(45,90,67,0.04)" }}
    >
      <div className="flex justify-between items-center text-[13px] font-medium">
        <span className="truncate">{label}</span>
        <div
          className="w-8 h-8 rounded-full grid place-items-center flex-none ml-2"
          style={{ background: iconBg, color: iconColor }}
        >
          {Icon && <Icon size={16} strokeWidth={1.6} />}
        </div>
      </div>
      <div className="text-[22px] font-semibold mt-3 mb-2 tracking-tight truncate">{value}</div>
      <div className="flex items-center gap-1.5 text-[12px] text-[#7A8E7E] flex-wrap">
        <span>Since Last Week</span>
        <span className={`text-[11px] font-semibold px-[6px] py-0.5 rounded-full ${PILL_STYLES[pillType]}`}>
          {trendStr}
        </span>
      </div>
    </div>
  );
}
