import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { useEffect, useRef, useState } from 'react'

import { cn } from '../../lib/cn'
import type { MediaRange } from './time'

/** Where a media slider is drawn: on the app's own surface, or over a picture. */
export type MediaSliderTone = 'surface' | 'overlay'

const TRACK: Record<MediaSliderTone, string> = {
    surface: 'bg-muted',
    overlay: 'bg-terminal-foreground/25',
}

const LOADED: Record<MediaSliderTone, string> = {
    surface: 'bg-border-strong',
    overlay: 'bg-terminal-foreground/45',
}

const THUMB: Record<MediaSliderTone, string> = {
    surface: 'border-primary bg-background',
    overlay: 'border-terminal-foreground bg-terminal-foreground',
}

export interface MediaSliderProps {
    value: number
    max: number
    onChange: (value: number) => void
    /** The value under the pointer while dragging, and `null` once the drag ends. */
    onScrub?: (value: number | null) => void
    /** The slider's accessible name. */
    label: string
    /** What a screen reader says for a value. */
    valueText?: (value: number) => string
    /** Loaded stretches, in the slider's units. */
    buffered?: readonly MediaRange[]
    step?: number
    largeStep?: number
    tone?: MediaSliderTone
    disabled?: boolean
    className?: string
}

/**
 * A horizontal slider for a media position or a level, with loaded stretches drawn under the
 * played part. The arrow keys step by `step`, Page Up and Page Down by `largeStep`, and Home and
 * End go to either end.
 *
 * While the thumb is dragged the slider shows the dragged value and reports it through
 * `onScrub`; `onChange` is called once, when the drag is let go, so a playing source is not asked
 * to seek on every pointer move. A key press is reported through `onChange` at once.
 *
 * A slider mounted where it has no width (inside a box hidden until there is room) is drawn
 * afresh once it has some, since the slider measures its thumb only when it mounts.
 */
export function MediaSlider({
    value,
    max,
    onChange,
    onScrub,
    label,
    valueText,
    buffered,
    step = 1,
    largeStep = 10,
    tone = 'surface',
    disabled = false,
    className,
}: MediaSliderProps) {
    const [scrub, setScrub] = useState<number | null>(null)
    const [drawn, setDrawn] = useState(0)
    const box = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        const element = box.current
        if (element === null || typeof ResizeObserver === 'undefined') return
        let wide = element.getBoundingClientRect().width > 0
        const observer = new ResizeObserver(([entry]) => {
            const now = (entry?.contentRect.width ?? 0) > 0
            if (now && !wide) setDrawn((count) => count + 1)
            wide = now
        })
        observer.observe(element)
        return () => observer.disconnect()
    }, [])
    const top = max > 0 ? max : 1
    const shown = Math.min(top, Math.max(0, scrub ?? (Number.isFinite(value) ? value : 0)))
    const settle = (next: number | null) => {
        setScrub(next)
        onScrub?.(next)
    }
    return (
        <div ref={box} className={cn('w-full', className)}>
            <SliderPrimitive.Root
                key={drawn}
                data-slot="media-slider"
                className="w-full"
                value={shown}
                min={0}
                max={top}
                step={step}
                largeStep={largeStep}
                disabled={disabled || max <= 0}
                thumbAlignment="edge"
                onValueChange={(next, details) => {
                    if (details.reason === 'keyboard') onChange(next)
                    else settle(next)
                }}
                onValueCommitted={(next, details) => {
                    if (details.reason === 'keyboard') return
                    onChange(next)
                    settle(null)
                }}
            >
                <SliderPrimitive.Control className="group/media-slider relative flex h-4 w-full cursor-pointer touch-none items-center select-none data-disabled:cursor-default data-disabled:opacity-50">
                    <SliderPrimitive.Track className={cn('relative h-1 w-full overflow-hidden rounded-mini select-none', TRACK[tone])}>
                        {buffered?.map((range) => (
                            <span
                                key={`${String(range.start)}-${String(range.end)}`}
                                aria-hidden
                                className={cn('absolute inset-y-0', LOADED[tone])}
                                style={{
                                    left: `${String((Math.max(0, range.start) / top) * 100)}%`,
                                    width: `${String((Math.max(0, Math.min(top, range.end) - Math.max(0, range.start)) / top) * 100)}%`,
                                }}
                            />
                        ))}
                        <SliderPrimitive.Indicator className="relative h-full bg-primary select-none" />
                    </SliderPrimitive.Track>
                    <SliderPrimitive.Thumb
                        aria-label={label}
                        getAriaValueText={valueText === undefined ? undefined : (_, raw) => valueText(raw)}
                        className={cn(
                            'relative block size-3 shrink-0 rounded-full border ring-ring/50 transition-[color,box-shadow,scale] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 data-disabled:hidden',
                            THUMB[tone],
                        )}
                    />
                </SliderPrimitive.Control>
            </SliderPrimitive.Root>
        </div>
    )
}
