import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // min-h-0 keeps the slim track: the app's mobile rule stretches every button to 44px.
      // The ::before area keeps the full 44px touch target without a fat pill.
      "peer relative inline-flex h-[22px] min-h-0 w-[38px] shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-colors duration-200 ease-out before:absolute before:-inset-y-[11px] before:inset-x-0 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-card)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--sb-brand)] data-[state=unchecked]:bg-[#D9E0DB]",
      className
    )}
    {...props}
    ref={ref}>
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(11,31,26,0.28)] transition-transform duration-200 ease-out data-[state=checked]:translate-x-[16px] data-[state=unchecked]:translate-x-0"
      )} />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
