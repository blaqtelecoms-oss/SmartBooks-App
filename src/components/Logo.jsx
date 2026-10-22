import React from "react";

const LOGO_URL = "https://media.base44.com/images/public/6a3c67997aeed99647a6d554/797c44698_093aa55a-8113-42fa-a159-d69bfa09baad-removebg-preview.png";

export default function Logo({ size = 36, collapsed = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={LOGO_URL}
        alt="SmartBooks SA"
        className="rounded-xl flex-shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
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