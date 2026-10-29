import React from "react";
import { cn } from "@/lib/utils";

/**
 * "Smart Books" pill wordmark from the brand artwork:
 * "Smart" in green on white, "Books" in white on green.
 */
export default function Wordmark({ size = 15, onDark = false, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-full border font-extrabold leading-none tracking-tight",
        onDark ? "border-white/25" : "border-[#27A54C]/25",
        className
      )}
      style={{ fontSize: `${size}px` }}
    >
      <span className="bg-white text-[#27A54C]" style={{ padding: "0.42em 0.4em 0.42em 0.72em" }}>
        Smart
      </span>
      <span className="bg-[#27A54C] text-white" style={{ padding: "0.42em 0.72em 0.42em 0.4em" }}>
        Books
      </span>
    </span>
  );
}
