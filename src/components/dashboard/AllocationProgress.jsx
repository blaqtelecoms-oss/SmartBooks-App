import React from "react";

export default function AllocationProgress({ allocated, total, pct, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-[14px] border border-[#e4ebe5] p-5 h-[130px] animate-pulse" />
    );
  }

  return (
    <div className="bg-white rounded-[14px] border border-[#e4ebe5] p-5" style={{ boxShadow: "0 1px 2px rgba(45,90,67,0.04)" }}>
      <div className="flex justify-between items-start">
        <h3 className="text-[17px] font-semibold">Allocation Progress</h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7A8E7E" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="5" r="0.6" />
          <circle cx="12" cy="12" r="0.6" />
          <circle cx="12" cy="19" r="0.6" />
        </svg>
      </div>
      <p className="mt-4 text-[14px]">
        <b>{allocated}</b> allocated of{" "}
        <span className="text-[#7A8E7E]">{total} transactions</span>
      </p>
      <div className="h-[9px] rounded-[9px] bg-[#eef1ee] my-4 overflow-hidden">
        <div className="h-full rounded-[9px]" style={{ width: `${pct}%`, background: "#7FAE87" }} />
      </div>
      <div className="text-right text-[14px] font-semibold">{pct}%</div>
    </div>
  );
}