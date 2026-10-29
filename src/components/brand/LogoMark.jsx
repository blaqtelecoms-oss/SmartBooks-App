import React from "react";
import { cn } from "@/lib/utils";

/**
 * SmartBooks icon: a white rounded tile holding an open book (navy left page,
 * green right page) with three rising green bars. Matches the supplied artwork.
 */
export default function LogoMark({ size = 36, className, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : "true"}
    >
      <rect x="0.5" y="0.5" width="39" height="39" rx="11" fill="#FFFFFF" stroke="rgba(19,41,61,0.12)" />
      {/* rising bars */}
      <rect x="13" y="15.4" width="3.2" height="6.2" rx="1.4" fill="#27A54C" />
      <rect x="18.4" y="11.6" width="3.2" height="10" rx="1.4" fill="#27A54C" />
      <rect x="23.8" y="14" width="3.2" height="7.6" rx="1.4" fill="#27A54C" />
      {/* open book */}
      <rect x="8" y="21.6" width="11.4" height="10" rx="1.8" fill="#13293D" />
      <rect x="20.6" y="21.6" width="11.4" height="10" rx="1.8" fill="#27A54C" />
    </svg>
  );
}
