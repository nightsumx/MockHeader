import { cn } from '@/lib/utils'
import * as SwitchPrimitives from '@radix-ui/react-switch'
import * as React from 'react'

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--markloom-accent)] disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:bg-[var(--markloom-accent)] data-[state=unchecked]:bg-[var(--bg-active)]',
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className="pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform duration-300 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5"
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
