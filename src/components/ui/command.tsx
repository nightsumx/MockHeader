import { cn } from '@/lib/utils'
import { Command as CommandPrimitive } from 'cmdk'
import * as React from 'react'

const Command = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    shouldFilter={false}
    loop
    className={cn('relative flex w-full min-w-0 flex-col overflow-visible bg-transparent', className)}
    {...props}
  />
))
Command.displayName = 'Command'

const CommandInput = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Input
    ref={ref}
    className={cn('field h-7 w-full text-[14px] outline-none placeholder:text-[var(--text-c)]', className)}
    {...props}
  />
))
CommandInput.displayName = 'CommandInput'

const CommandList = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      'absolute top-full left-0 z-20 mt-0.5 max-h-56 min-w-[220px] overflow-auto rounded-md bg-[var(--bg-page)] py-0.5 shadow-lg ring-1 ring-[var(--line)]',
      className,
    )}
    {...props}
  />
))
CommandList.displayName = 'CommandList'

const CommandItem = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'px-3 py-1.5 text-[13px] text-[var(--text-a)] data-[selected=true]:bg-[#1976d2] data-[selected=true]:text-white',
      className,
    )}
    {...props}
  />
))
CommandItem.displayName = 'CommandItem'

export { Command, CommandInput, CommandItem, CommandList }
