import React from "react";
import lockup from "@/assets/smartbooks-logo.png";
import iconMark from "@/assets/smartbooks-icon.png";

/**
 * SmartBooks brand lock-up, rendered from the supplied artwork itself.
 * `dark` is for the dark sidebar; `collapsed` shows the icon tile only.
 */
export default function Logo({ size = 36, collapsed = false, dark = false }) {
  if (collapsed) {
    return (
      <img
        src={iconMark}
        alt="Smart Books"
        className="flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <img
        src={lockup}
        alt="Smart Books"
        className="w-auto max-w-full object-contain object-left"
        style={{ height: size }}
      />
      <p
        className="uppercase"
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
  );
}
