import React from "react";
import LogoMark from "@/components/brand/LogoMark";
import Wordmark from "@/components/brand/Wordmark";

/**
 * SmartBooks brand lock-up.
 * `dark` renders for the dark sidebar (light wordmark); default is for light surfaces.
 */
export default function Logo({ size = 36, collapsed = false, dark = false }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <LogoMark size={size} />
      {!collapsed && (
        <div className="flex min-w-0 flex-col gap-1.5">
          <Wordmark size={14} onDark={dark} className="self-start" />
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
      )}
    </div>
  );
}
