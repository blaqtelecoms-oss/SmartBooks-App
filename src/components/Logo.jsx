import React from "react";

export default function Logo({ size = 36, collapsed = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        className="rounded-xl flex-shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="64" height="64" rx="14" fill="#2D5A43" />
        <path d="M18 16h22a4 4 0 0 1 4 4v28a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2z" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
        <path d="M22 24h14M22 30h14M22 36h10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="44" cy="44" r="8" fill="#4A7C5E" stroke="#fff" strokeWidth="2.5" />
        <path d="M44 40v8M40 44h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {!collapsed && (
        <div className="leading-none">
          <h1 className="text-[15px] font-semibold text-[#1A2E22] tracking-tight">
            Smart<span className="text-[#2D5A43]">Books</span>
          </h1>
          <p className="text-[10px] text-[#7A8E7E] mt-0.5 tracking-wide uppercase">South Africa</p>
        </div>
      )}
    </div>
  );
}
