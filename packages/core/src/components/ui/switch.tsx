'use client'

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { INVALID_EDGE } from '../../lib/issue-edge'
import { cn } from '../../lib/utils'

export type SwitchProps = SwitchPrimitive.Root.Props & {
    size?: 'sm' | 'default'
}

function Switch({ className, size = 'default', ...props }: SwitchProps) {
    return (
        <SwitchPrimitive.Root
            data-slot="switch"
            data-size={size}
            className={cn(
                'peer group/switch relative inline-flex shrink-0 items-center rounded-control border border-transparent transition-all outline-none group-has-[:focus-visible]/field-label:border-transparent group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid data-[size=default]:h-switch-height data-[size=default]:w-switch-width data-[size=sm]:h-switch-height-sm data-[size=sm]:w-switch-width-sm data-checked:bg-primary data-unchecked:bg-input dark:data-unchecked:bg-input/80 data-disabled:cursor-not-allowed data-disabled:opacity-disabled',
                INVALID_EDGE,
                className,
            )}
            {...props}
        >
            <SwitchPrimitive.Thumb
                data-slot="switch-thumb"
                className="pointer-events-none block rounded-thumb bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] dark:data-checked:bg-primary-foreground group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 dark:data-unchecked:bg-foreground"
            />
        </SwitchPrimitive.Root>
    )
}

export { Switch }
