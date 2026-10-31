import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-brand-2)] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--sb-ink)] text-[var(--sb-card)] shadow-sm hover:bg-[var(--sb-brand)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-[var(--sb-border)] bg-[var(--sb-card)] text-[var(--sb-ink)] shadow-sm hover:border-[var(--sb-ink)]",
        secondary:
          "bg-[var(--sb-soft)] text-[var(--sb-ink)] shadow-sm hover:bg-[var(--sb-border)]",
        ghost: "hover:bg-[var(--sb-soft)] hover:text-[var(--sb-ink)]",
        link: "text-[var(--sb-brand-2)] underline-offset-4 hover:underline",
        accent: "bg-[var(--sb-lime)] text-[#0b1f1a] hover:brightness-95",
      },
      size: {
        // Roomier touch targets on phones, the original density from sm up
        default: "h-10 px-5 py-2 sm:h-9 sm:px-4",
        sm: "h-9 px-3.5 text-xs sm:h-8 sm:px-3",
        lg: "h-11 px-6 text-[13.5px] sm:h-10 sm:text-[13px]",
        icon: "h-10 w-10 sm:h-9 sm:w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
