import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { createContext, useContext, useEffect, useState } from 'react'

import { FINGER_HIT, takesFinger } from '../../lib/finger'
import { tapTip } from '../../lib/tap-tip'
import { cn } from '../../lib/utils'

/** How long a tooltip waits under a resting pointer, in milliseconds; keyboard focus shows it at once. */
export const TOOLTIP_DELAY = 500

/** The delay a provider gives the tooltips inside it, and the library's own outside one. */
const Delay = createContext(TOOLTIP_DELAY)

export type TooltipProviderProps = TooltipPrimitive.Provider.Props

/** Tooltips that share one wait: once one has shown, its neighbors show at once. */
function TooltipProvider({ delay = TOOLTIP_DELAY, ...props }: TooltipProviderProps) {
    return (
        <Delay value={delay}>
            <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />
        </Delay>
    )
}

/** What a trigger tells its tooltip when a press ends on it, given the tooltip takes a tap. */
const Tap = createContext<((pointerType: string) => void) | null>(null)

export type TooltipProps = TooltipPrimitive.Root.Props & {
    /**
     * A tap by touch or pen on the trigger shows the tooltip too, for a trigger a tap does nothing
     * else with, such as a shut button saying why. It stays up for `tip-hold` (`TIP_HOLD`), until the
     * next press anywhere, or until a tap on the trigger again.
     */
    tap?: boolean
}

/**
 * A tooltip: shown under a resting pointer and on keyboard focus, and with `tap` on a tap by a
 * finger or a pen, which have no hover. It holds whether it is open itself, or as `open` says.
 */
function Tooltip({ tap = false, open, defaultOpen = false, onOpenChange, ...props }: TooltipProps) {
    const [held, setHeld] = useState(defaultOpen)
    const [taps] = useState(() => tapTip(setHeld))
    useEffect(() => taps.stop, [taps])
    const shown = open ?? held
    return (
        <Tap value={tap ? (pointerType) => taps.press(pointerType, shown) : null}>
            <TooltipPrimitive.Root
                data-slot="tooltip"
                open={shown}
                onOpenChange={(next, details) => {
                    if (!taps.allows(next, details.reason)) return details.cancel()
                    onOpenChange?.(next, details)
                    if (details.isCanceled) return
                    setHeld(next)
                    if (!next) taps.stop()
                }}
                {...props}
            />
        </Tap>
    )
}

export type TooltipTriggerProps = TooltipPrimitive.Trigger.Props

/**
 * A trigger takes a finger-sized hit area on a phone, drawn by the tooltip or given as a `render`
 * element that allows it (`takesFinger`). It waits `TOOLTIP_DELAY` under a resting pointer, or its
 * provider's delay, with or without a provider. In a tooltip that takes a tap, it tells the tooltip
 * of a press ending on it on `pointerup`, which a shut button still hears where Base UI's button
 * drops its own press and click.
 */
function TooltipTrigger({ className, delay, ...props }: TooltipTriggerProps) {
    const shared = useContext(Delay)
    const tap = useContext(Tap)
    const finger = takesFinger(props.render, className)
    return (
        <TooltipPrimitive.Trigger
            data-slot="tooltip-trigger"
            delay={delay ?? shared}
            className={finger ? cn(FINGER_HIT, className) : className}
            {...props}
            onPointerUp={(event) => {
                props.onPointerUp?.(event)
                tap?.(event.pointerType)
            }}
        />
    )
}

export type TooltipContentProps = TooltipPrimitive.Popup.Props &
    Pick<TooltipPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'> &
    Pick<TooltipPrimitive.Portal.Props, 'container'>

function TooltipContent({
    className,
    side = 'top',
    sideOffset = 4,
    align = 'center',
    alignOffset = 0,
    container,
    children,
    ...props
}: TooltipContentProps) {
    return (
        <TooltipPrimitive.Portal container={container}>
            <TooltipPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                side={side}
                sideOffset={sideOffset}
                className="isolate z-popover"
            >
                <TooltipPrimitive.Popup
                    data-slot="tooltip-content"
                    className={cn(
                        'z-popover inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-popover **:data-[slot=kbd]:rounded-sm data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                        className,
                    )}
                    {...props}
                >
                    {children}
                    <TooltipPrimitive.Arrow className="z-popover size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-mini bg-foreground fill-foreground data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
                </TooltipPrimitive.Popup>
            </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
    )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
