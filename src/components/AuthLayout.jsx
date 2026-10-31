import React from "react";
import { cn } from "@/lib/utils";

/**
 * Centred auth card. `wide` gives the card a desktop-sized shell for content
 * that lays out sideways (the portal choice); it stays narrow on small screens.
 */
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children, wide = false }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 sm:px-5 sm:py-10">
      <div className={cn("w-full", wide ? "max-w-md lg:max-w-4xl" : "max-w-md")}>
        <div className="text-center mb-6 sm:mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-3.5 sm:w-14 sm:h-14 sm:mb-4">
            <Icon className="w-6 h-6 text-primary-foreground sm:w-7 sm:h-7" aria-hidden="true" />
          </div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2 text-[13.5px] sm:text-sm">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-[22px] shadow-sm border border-border p-4 sm:rounded-2xl sm:p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
