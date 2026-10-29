import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    (<input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-[12px] border border-[var(--sb-border)] bg-[var(--sb-card)] px-3 py-1 text-[13px] text-[var(--sb-ink)] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--sb-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-brand-2)] focus-visible:border-[var(--sb-brand-2)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }
