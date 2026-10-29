import React from "react";

/**
 * SmartBooks brand lock-up.
 * `dark` renders for the dark sidebar (white wordmark); default is for light surfaces.
 */
export default function Logo({ size = 36, collapsed = false, dark = false }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        className="rounded-[10px] flex-shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="36" height="36" rx="10" fill="#C8F169" />
        <rect x="9" y="19" width="3.4" height="7.5" rx="1.2" fill="#0B1F1A" />
        <rect x="16.3" y="14" width="3.4" height="12.5" rx="1.2" fill="#0B1F1A" />
        <rect x="23.6" y="10" width="3.4" height="16.5" rx="1.2" fill="#0B1F1A" />
      </svg>
      {!collapsed && (
        <div className="leading-none min-w-0">
          <h1
            className="text-[15px] tracking-tight truncate"
            style={{
              fontWeight: 800,
              color: dark ? "#FFFFFF" : "var(--sb-ink)",
            }}
          >
            SmartBooks
          </h1>
          <p
            className="mt-1 uppercase"
            style={{
              fontSize: "9px",
              letterSpacing: "0.18em",
              fontWeight: 700,
              color: dark ? "rgba(185,204,194,0.7)" : "var(--sb-muted)",
            }}
          >
            South Africa
          </p>
        </div>
      )}
    </div>
  );
}
