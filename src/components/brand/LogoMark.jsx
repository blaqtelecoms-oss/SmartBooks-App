import React from "react";
import { cn } from "@/lib/utils";

/**
 * SmartBooks icon, matching the brand artwork: a white rounded tile with an open
 * book (navy left page, green right page) and three green bars rising from it.
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
      {/* rising bars behind the book */}
      <rect x="13.2" y="17.8" width="3.3" height="8.4" rx="1.65" fill="#27A54C" />
      <rect x="18.35" y="12.8" width="3.3" height="13.4" rx="1.65" fill="#27A54C" />
      <rect x="23.5" y="16.2" width="3.3" height="10" rx="1.65" fill="#27A54C" />
      {/* open book: navy left page, green right page */}
      <path d="M7.6 26.6c0-1.13.92-2.05 2.05-2.05h9.05v8.2H9.65c-1.13 0-2.05-.92-2.05-2.05z" fill="#13293D" />
      <path d="M32.4 26.6c0-1.13-.92-2.05-2.05-2.05H21.3v8.2h9.05c1.13 0 2.05-.92 2.05-2.05z" fill="#27A54C" />
    </svg>
  );
}
