import React, { useState, useRef } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const Y_LABELS = [2000, 1500, 1000, 500, 200, 0];
const Y_TEXT = ["R2k", "R1.5k", "R1k", "R500", "R200", "R0"];

export default function CashFlowChart({ data, total, max, scale = 1, loading }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  const W = 760, H = 290, L = 48, B = 32, T = 8;
  const ph = H - B - T;
  const ymax = Math.max(max, 2000);
  const step = (W - L) / 12;

  const formatR = (v) => `R ${(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  const handleMouseMove = (e, i) => {
    const container = containerRef.current;
    if (!container) return;
    const r = container.getBoundingClientRect();
    const x = (e.clientX - r.left) / scale + 12;
    const y = (e.clientY - r.top) / scale - 70;
    setTooltip({
      i,
      x: Math.min(x, r.width / scale - 180),
      y: Math.max(y, 10),
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[14px] border border-[#e4ebe5] p-5" style={{ boxShadow: "0 1px 2px rgba(45,90,67,0.04)" }}>
        <div className="h-[290px] animate-pulse bg-[#e9f3ea] rounded" />
      </div>
    );
  }

  const totalPct = max > 0 ? ((total / max) * 100).toFixed(2) : "0.00";

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-[14px] border border-[#e4ebe5] p-5 relative"
      style={{ boxShadow: "0 1px 2px rgba(45,90,67,0.04)" }}
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-2.5">
        <div>
          <h3 className="text-[15px] font-medium">Cash flow for the last 12 months</h3>
          <div className="text-[32px] font-semibold tracking-tight flex items-center gap-2.5 mt-2">
            {formatR(total)}
            <span className="text-[12px] font-semibold px-[7px] py-0.5 rounded-full bg-[#e9f3ea] text-[#2D5A43]">
              + {totalPct} %
            </span>
          </div>
        </div>
        <div className="border border-[#e4ebe5] bg-white rounded-[8px] px-3 py-2 text-[13px] font-medium flex items-center gap-1.5 cursor-pointer">
          This Year
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[13px] text-[#5C7263] mt-3 justify-end pr-1.5">
        <span>
          <i className="inline-block w-[8px] h-[8px] rounded-sm mr-[5px]" style={{ background: "#7FAE87" }} />
          Income
        </span>
        <span>
          <i className="inline-block w-[8px] h-[8px] rounded-sm mr-[5px] border border-[#e4ebe5]" style={{ background: "#eef1ee" }} />
          Expense
        </span>
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-1 block" onMouseLeave={() => setTooltip(null)}>
        {Y_LABELS.map((v, i) => {
          const y = T + ph - (v / ymax) * ph;
          return (
            <text key={i} x="0" y={y + 4} fontSize="12" fill="#7A8E7E">
              {Y_TEXT[i]}
            </text>
          );
        })}
        {data.map((d, i) => {
          const x = L + i * step + step / 2;
          const w = 30;
          const h1 = (d.expense / ymax) * ph;
          const h2 = (d.income / ymax) * ph;
          return (
            <g key={i} style={{ cursor: "pointer" }} onMouseMove={(e) => handleMouseMove(e, i)}>
              <rect x={x - step / 2} y={0} width={step} height={H - B} fill="transparent" />
              <rect x={x - w / 2} y={T + ph - h1} width={w} height={h1} rx="5" fill="#eef1ee" />
              <rect x={x - w / 2} y={T + ph - h2} width={w} height={h2} rx="5" fill="#7FAE87" />
              <text x={x} y={H - 10} fontSize="13" fill="#7A8E7E" textAnchor="middle">
                {MONTHS[i]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-white border border-[#e4ebe5] rounded-[8px] px-3 py-2 text-[13px] z-5 whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}
        >
          <b className="block text-[14px] mb-1">
            {MONTHS[tooltip.i]} {new Date().getFullYear()}
          </b>
          <span className="text-[#7A8E7E] mr-2">Income</span>
          {formatR(data[tooltip.i].income)}
          <br />
          <span className="text-[#7A8E7E] mr-2">Expense</span>
          {formatR(data[tooltip.i].expense)}
        </div>
      )}
    </div>
  );
}