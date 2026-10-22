import React from "react";
import { Wallet, TrendingUp, Calculator, Receipt } from "lucide-react";

const PILL_STYLES = {
  green: "bg-[#e9f3ea] text-[#2D5A43]",
  red: "bg-[#fbe9e9] text-[#C25B5B]",
  gold: "bg-[#fbf1e1] text-[#B8915A]",
};

export default function StatCard({ label, value, icon: Icon, iconColor, iconBg, trend, pillType = "green" }) {
  const trendStr = `${trend >= 0 ? "+ " : "- "}${Math.abs(trend).toFixed(2)} %`;
  return (
    <div
      className="bg-white rounded-[14px] border border-[#e4ebe5] p-5"
      style={{ boxShadow: "0 1px 2px rgba(45,90,67,0.04)" }}
    >
      <div className="flex justify-between items-center text-[14px] font-medium">
        <span>{label}</span>
        <div
          className="w-9 h-9 rounded-full grid place-items-center"
          style={{ background: iconBg, color: iconColor }}
        >
          {Icon && <Icon size={18} strokeWidth={1.6} />}
        </div>
      </div>
      <div className="text-[28px] font-semibold mt-4 mb-3 tracking-tight">{value}</div>
      <div className="flex gap-[7px] items-center text-[13px] text-[#7A8E7E]">
        Since Last Week
        <span className={`text-[12px] font-semibold px-[7px] py-0.5 rounded-full ${PILL_STYLES[pillType]}`}>
          {trendStr}
        </span>
      </div>
    </div>
  );
}