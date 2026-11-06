import { useState } from 'react'

/**
 * The size of a panel that resizes. Given `size`, the caller holds it and hears every change in
 * `onSizeChange`; otherwise the panel holds it itself, at `rest` until the first drag. `rest` is a
 * number of pixels or a CSS length; a reset returns an uncontrolled panel to it, and a controlled
 * one to `rest` when it is a number, else to `fallback`. `style` is the value for the panel's
 * width or height.
 */
export function usePanelSize({
    size,
    onSizeChange,
    rest,
    fallback,
    min,
    max,
}: {
    size: number | undefined
    onSizeChange: ((size: number) => void) | undefined
    rest: number | string | undefined
    fallback: number
    min: number
    max: number
}) {
    const [own, setOwn] = useState<number | undefined>(undefined)
    const held = size !== undefined
    const clamp = (value: number) => Math.round(Math.min(max, Math.max(min, value)))
    const current = held ? size : own
    return {
        /** The size in pixels, or undefined while an uncontrolled panel rests at a CSS length. */
        size: current ?? (typeof rest === 'number' ? rest : undefined),
        style: current ?? rest,
        /** Whether a drag can change the size: not when it is held without a handler. */
        changeable: !held || onSizeChange !== undefined,
        set: (next: number) => {
            if (!held) setOwn(next)
            onSizeChange?.(next)
        },
        reset: () => {
            if (held) onSizeChange?.(clamp(typeof rest === 'number' ? rest : fallback))
            else {
                setOwn(undefined)
                if (typeof rest === 'number') onSizeChange?.(clamp(rest))
            }
        },
    }
}
