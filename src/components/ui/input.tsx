import { cn } from '@/lib/utils'
import * as React from 'react'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-8 w-full rounded-md bg-[var(--bg-hover)] px-2.5 text-sm text-[var(--text-a)] placeholder:text-[var(--text-c)] focus:outline focus:outline-2 focus:outline-[var(--markloom-accent)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
