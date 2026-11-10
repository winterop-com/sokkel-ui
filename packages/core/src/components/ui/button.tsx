import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import type { ReactNode } from 'react'

import { cn } from '../../lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded-control border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:translate-y-0 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground not-aria-disabled:hover:bg-primary/80',
                outline:
                    'border-border bg-background not-aria-disabled:hover:bg-hover not-aria-disabled:hover:text-foreground aria-expanded:bg-hover aria-expanded:text-foreground dark:border-input dark:bg-input/30',
                secondary:
                    'bg-secondary text-secondary-foreground not-aria-disabled:hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
                ghost: 'not-aria-disabled:hover:bg-hover not-aria-disabled:hover:text-foreground aria-expanded:bg-hover aria-expanded:text-foreground',
                destructive:
                    'bg-destructive/10 text-destructive not-aria-disabled:hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:not-aria-disabled:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
                link: 'text-primary underline-offset-4 not-aria-disabled:hover:underline',
            },
            size: {
                default: 'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
                xs: "h-6 gap-1 rounded-[min(var(--control-radius),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-control has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
                sm: "h-7 gap-1 rounded-[min(var(--control-radius),12px)] px-2.5 text-xs in-data-[slot=button-group]:rounded-control has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
                lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
                icon: 'size-8',
                'icon-xs':
                    "size-6 rounded-[min(var(--control-radius),10px)] in-data-[slot=button-group]:rounded-control [&_svg:not([class*='size-'])]:size-3",
                'icon-sm': 'size-7 rounded-[min(var(--control-radius),12px)] in-data-[slot=button-group]:rounded-control',
                'icon-lg': 'size-9',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
)

export type ButtonProps = ButtonPrimitive.Props &
    VariantProps<typeof buttonVariants> & {
        /** Why the button cannot be pressed now; given, the button is disabled and shows it. */
        reason?: ReactNode
        /** Which side the reason opens on. */
        reasonSide?: 'top' | 'bottom' | 'left' | 'right'
    }

/**
 * A button. `reason` disables it and says why: the reason shows on hover and on focus, and the
 * button stays in the tab order so a keyboard reaches the reason too.
 */
function Button({
    className,
    variant = 'default',
    size = 'default',
    reason,
    reasonSide = 'top',
    disabled,
    focusableWhenDisabled,
    ...props
}: ButtonProps) {
    const held = reason !== undefined && reason !== null && reason !== false
    const button = (
        <ButtonPrimitive
            data-slot="button"
            data-button-size={size ?? 'default'}
            className={cn(buttonVariants({ variant, size, className }))}
            disabled={held || disabled}
            focusableWhenDisabled={held || focusableWhenDisabled}
            {...props}
        />
    )
    if (!held) return button
    return (
        <Tooltip>
            <TooltipTrigger render={button} />
            <TooltipContent side={reasonSide}>{reason}</TooltipContent>
        </Tooltip>
    )
}

export { Button, buttonVariants }
