import { useEffect, useRef, useState, type ReactNode } from 'react'

import { useReducedMotion } from '../hooks/use-reduced-motion'
import { cn } from '../lib/cn'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import { Dot } from './Dot'

/** How loud an alert is: something broke, something to watch, something recovered, news, or background. */
export type AlertTickerTone = 'critical' | 'warning' | 'good' | 'info' | 'quiet'

/** One alert of a ticker. */
export interface AlertTickerItem {
    id: string
    /** What happened, on one line; cut with an ellipsis where the strip is too narrow. */
    text: ReactNode
    /** `info` by default. */
    tone?: AlertTickerTone
    /** When it happened, drawn quietly after the text: `14:28`, or a `RelativeTime`. */
    when?: ReactNode
    /** Drawn after the dot, before the text. */
    icon?: ReactNode
}

export interface AlertTickerWords {
    /** Said where there are no alerts. */
    empty: string
    /** Which alert is shown, at the strip's end: its place, counted from one, and how many there are. */
    position: (index: number, count: number) => string
}

export const ALERT_TICKER_WORDS: AlertTickerWords = {
    empty: 'No alerts',
    position: (index, count) => `${index.toLocaleString('en-US')} of ${count.toLocaleString('en-US')}`,
}

/** Where a catalog holds an alert ticker's words, and the arguments its phrases name. */
export const ALERT_TICKER_PART: WordsPart<AlertTickerWords> = {
    id: 'alertTicker',
    words: ALERT_TICKER_WORDS,
    args: { position: 'index count' },
}

/** An alert ticker's phrases as ICU messages in English, for the catalog. */
export const ALERT_TICKER_MESSAGES: WordMessages<AlertTickerWords> = {
    position: '{index, number} of {count, number}',
}

/** Each tone's dot as a CSS color. */
const DOT: Record<AlertTickerTone, string> = {
    critical: 'var(--critical)',
    warning: 'var(--warning)',
    good: 'var(--good)',
    info: 'var(--info)',
    quiet: 'var(--faint)',
}

/** The item a ticker of `count` items shows at an index: the index itself, the last item when it is past the end, none (-1) when there are no items. */
export function alertTickerShown(index: number, count: number): number {
    if (count <= 0) return -1
    if (!Number.isFinite(index)) return 0
    return Math.min(Math.max(Math.trunc(index), 0), count - 1)
}

/** The item after the one shown, the first again after the last. */
export function alertTickerNext(index: number, count: number): number {
    if (count <= 0) return -1
    return (alertTickerShown(index, count) + 1) % count
}

export interface AlertTickerProps {
    /** The alerts, the latest first. */
    items: readonly AlertTickerItem[]
    /** What the strip shows, for a screen reader. */
    label: string
    /** How long each alert is shown, in milliseconds; 5000 by default. */
    interval?: number
    /** Holds the alert shown, as a wall that is being read wants. */
    paused?: boolean
    /** The alert shown, held by the app, counted from zero. */
    index?: number
    /** The alert shown first, counted from zero; the first by default. */
    defaultIndex?: number
    /** Called with the next alert's index each time the ticker moves on. */
    onIndexChange?: (index: number) => void
    /** Makes the alert shown a button, calling this with its id. */
    onSelect?: (id: string) => void
    words?: Partial<AlertTickerWords>
    className?: string
}

/**
 * The latest alerts in one strip, one row tall, one at a time: a dot in the alert's tone (pulsing
 * for a critical one), its words cut with an ellipsis, when it happened, and its place among the
 * alerts at the end. It moves to the next alert every `interval`, the new one sliding in, and
 * starts over after the last. It holds still while `paused`, while the pointer is over it or focus
 * is in it, where motion is reduced, and with one alert or none. With `onSelect` the alert shown is
 * a button.
 */
export function AlertTicker({
    items,
    label,
    interval = 5000,
    paused = false,
    index: given,
    defaultIndex = 0,
    onIndexChange,
    onSelect,
    words: givenWords,
    className,
}: AlertTickerProps) {
    const words = useWords(ALERT_TICKER_PART, givenWords)
    const reduced = useReducedMotion()
    const [own, setOwn] = useState(defaultIndex)
    // The pointer over it and focus in it each hold it; it moves on only once neither does.
    const [hovered, setHovered] = useState(false)
    const [focused, setFocused] = useState(false)
    const held = hovered || focused
    // The first alert shown stands still; each one after it, and a new alert taking its place, slides in.
    const [moved, setMoved] = useState(false)
    const count = items.length
    const shown = alertTickerShown(given ?? own, count)
    const item = shown < 0 ? undefined : items[shown]
    const [last, setLast] = useState(item?.id)
    if (last !== item?.id) {
        setLast(item?.id)
        setMoved(true)
    }
    const changed = useRef(onIndexChange)
    useEffect(() => {
        changed.current = onIndexChange
    })
    const still = paused || held || reduced || count < 2 || !(interval > 0)
    useEffect(() => {
        if (still) return undefined
        const timer = setTimeout(() => {
            const next = alertTickerNext(shown, count)
            setOwn(next)
            changed.current?.(next)
        }, interval)
        return () => clearTimeout(timer)
    }, [still, shown, count, interval])
    const tone = item?.tone ?? 'info'
    const line = item !== undefined && (
        <>
            <Dot color={DOT[tone]} size="md" outline={tone === 'quiet'} className={cn(tone === 'critical' && 'animate-live')} />
            {item.icon !== undefined && (
                <span className="flex shrink-0 items-center [&_svg:not([class*='size-'])]:size-4">{item.icon}</span>
            )}
            <span className="min-w-0 truncate">{item.text}</span>
        </>
    )
    const slide = moved && 'animate-in duration-base ease-motion fade-in-0 slide-in-from-bottom-2'
    return (
        <section
            aria-label={label}
            data-slot="alert-ticker"
            data-tone={item === undefined ? undefined : tone}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={(event) => setFocused(event.currentTarget.contains(event.relatedTarget))}
            className={cn(
                'flex h-10 min-w-0 shrink-0 items-center gap-3 overflow-hidden rounded-surface border border-border-strong bg-card px-3 text-sm text-card-foreground',
                className,
            )}
        >
            {item === undefined ? (
                <span data-slot="alert-ticker-empty" className="min-w-0 flex-1 truncate text-muted-foreground">
                    {words.empty}
                </span>
            ) : onSelect === undefined ? (
                <span key={item.id} data-slot="alert-ticker-item" className={cn('flex min-w-0 flex-1 items-center gap-2', slide)}>
                    {line}
                </span>
            ) : (
                <button
                    key={item.id}
                    type="button"
                    data-slot="alert-ticker-item"
                    onClick={() => onSelect(item.id)}
                    className={cn(
                        'flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-chip text-start outline-none hover:text-foreground focus-visible:outline-focus focus-visible:outline-offset-focus-inset focus-visible:outline-ring focus-visible:outline-solid',
                        slide,
                    )}
                >
                    {line}
                </button>
            )}
            {item?.when !== undefined && (
                <span data-slot="alert-ticker-when" className="shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                    {item.when}
                </span>
            )}
            {count > 1 && (
                <span data-slot="alert-ticker-position" className="shrink-0 text-xs whitespace-nowrap text-faint tabular-nums">
                    {words.position(shown + 1, count)}
                </span>
            )}
        </section>
    )
}
