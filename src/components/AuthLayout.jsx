import React from "react";
import { cn } from "@/lib/utils";

/**
 * Centred auth card. `wide` gives the card a desktop-sized shell for content
 * that lays out sideways (the portal choice); it stays narrow on small screens.
 */
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children, wide = false }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-5 py-10 sm:px-4">
      <div className={cn("w-full", wide ? "max-w-md lg:max-w-4xl" : "max-w-md")}>
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
