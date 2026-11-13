import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { Children, isValidElement, type ReactNode } from 'react'

import { FINGER_HIT, takesFinger } from '../../lib/finger'
import { cn } from '../../lib/utils'
import { Spinner } from './spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded-control border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:translate-y-0 aria-invalid:border-destructive aria-invalid:focus-visible:ring-3 aria-invalid:focus-visible:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:focus-visible:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground not-aria-disabled:hover:bg-primary/80',
                outline:
                    'border-border bg-background not-aria-disabled:hover:bg-hover not-aria-disabled:hover:text-foreground aria-expanded:bg-hover aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:aria-expanded:bg-hover',
                secondary:
                    'bg-secondary text-secondary-foreground not-aria-disabled:hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
                ghost: 'not-aria-disabled:hover:bg-hover not-aria-disabled:hover:text-foreground aria-expanded:bg-hover aria-expanded:text-foreground',
                destructive:
                    'bg-destructive/10 text-destructive not-aria-disabled:hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:not-aria-disabled:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
                link: 'text-primary underline-offset-4 not-aria-disabled:hover:underline',
            },
            size: {
                default:
                    'h-(--density-control) gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 max-md:min-h-finger',
                xs: "h-(--density-control-xs) gap-1 rounded-[min(var(--control-radius),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-control has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
                sm: "h-(--density-control-sm) gap-1 rounded-[min(var(--control-radius),12px)] px-2.5 text-xs in-data-[slot=button-group]:rounded-control has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 max-md:min-h-finger [&_svg:not([class*='size-'])]:size-3.5",
                lg: 'h-(--density-control-lg) gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 max-md:min-h-finger',
                icon: 'size-(--density-control) max-md:min-h-finger max-md:min-w-finger',
                'icon-xs':
                    "size-(--density-control-xs) rounded-[min(var(--control-radius),10px)] in-data-[slot=button-group]:rounded-control [&_svg:not([class*='size-'])]:size-3",
                'icon-sm':
                    'size-(--density-control-sm) rounded-[min(var(--control-radius),12px)] in-data-[slot=button-group]:rounded-control max-md:min-h-finger max-md:min-w-finger',
                'icon-lg': 'size-(--density-control-lg) max-md:min-h-finger max-md:min-w-finger',
            },
            /** The critical tint under the pointer, on any variant, for a button that destroys. */
            destructiveHover: {
                true: 'not-aria-disabled:hover:bg-critical/10 not-aria-disabled:hover:text-critical-ink',
                false: '',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
            destructiveHover: false,
        },
    },
)

/** A busy button keeps its look while it ignores presses. */
const BUSY = 'cursor-progress! opacity-100!'

/** The sizes drawn smaller than a finger on a phone, which take a finger's hit area there instead of its height. */
const SMALL = new Set(['xs', 'icon-xs'])

/** The spinner at the size of the icons a button of each size draws. */
const SPINNER: Record<string, string | undefined> = { xs: 'size-3', 'icon-xs': 'size-3', sm: 'size-3.5' }

export type ButtonProps = ButtonPrimitive.Props &
    VariantProps<typeof buttonVariants> & {
        /** Why the button cannot be pressed now; given, the button is disabled and shows it. */
        reason?: ReactNode
        /** Which side the reason opens on. */
        reasonSide?: 'top' | 'bottom' | 'left' | 'right'
        /** Work a press started is under way: a spinner in place of a leading icon, or before the label, and presses ignored until it ends. */
        busy?: boolean
    }

/**
 * A button. `reason` disables it and says why: the reason shows on hover and on focus, and the
 * button stays in the tab order so a keyboard reaches the reason too. `busy` says the work a press
 * started is under way: a spinner takes the place of a leading icon (an icon-only button's icon), or
 * comes before the label, the label stays, and the button is shut, `aria-busy` and `aria-disabled`,
 * keeping its focus and its look while it ignores presses. `destructiveHover` gives any variant the
 * critical tint under the pointer, for a button that destroys but should not shout until pointed at.
 */
function Button({
    className,
    variant = 'default',
    size = 'default',
    reason,
    reasonSide = 'top',
    disabled,
    focusableWhenDisabled,
    busy = false,
    destructiveHover = false,
    children,
    ...props
}: ButtonProps) {
    const held = reason !== undefined && reason !== null && reason !== false
    const parts = busy ? Children.toArray(children) : []
    // The spinner stands in for a leading icon: an element before the label, or an icon-only button's icon.
    const lead = isValidElement(parts[0]) && (parts.length > 1 || size?.startsWith('icon') === true)
    const finger = SMALL.has(size ?? 'default') && takesFinger(props.render, className)
    const button = (
        <ButtonPrimitive
            data-slot="button"
            data-button-size={size ?? 'default'}
            className={cn(buttonVariants({ variant, size, destructiveHover }), finger && FINGER_HIT, className, busy && BUSY)}
            disabled={held || busy || disabled}
            focusableWhenDisabled={held || busy || focusableWhenDisabled}
            aria-busy={busy || undefined}
            {...props}
        >
            {busy ? (
                <>
                    <Spinner aria-hidden role={undefined} aria-label={undefined} className={SPINNER[size ?? 'default']} />
                    {lead ? parts.slice(1) : parts}
                </>
            ) : (
                children
            )}
        </ButtonPrimitive>
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
