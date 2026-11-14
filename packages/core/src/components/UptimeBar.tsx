import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { STATUS_CSS } from '../lib/status'
import { useStatus } from './StatusProvider'

/** One day of a thing's record. */
export interface UptimeDay {
    /** The day, `YYYY-MM-DD`. */
    date: string
    /** The share of the day it was up, from 0 to 1, or null when nothing was measured. */
    uptime: number | null
    /** The state the day is drawn in, one the status map knows; by its uptime when left out. */
    status?: string
    /** What happened that day, said in the readout while the day is pointed at: its incidents. */
    note?: ReactNode
}

export interface UptimeBarWords {
    /** The uptime over the days shown, given it written. */
    uptime: (percent: string) => string
    /** Under the first day shown, given how many days before today it is. */
    since: (days: number) => string
    /** Under the last day. */
    today: string
    /** A day with nothing measured. */
    noData: string
}

const WORDS: UptimeBarWords = {
    uptime: (percent) => `${percent} uptime`,
    since: (days) => `${String(days)} days ago`,
    today: 'Today',
    noData: 'No data',
}

export interface UptimeBarProps {
    /** The days, oldest first, the last one today. */
    days: readonly UptimeDay[]
    /** What the record is of, for a screen reader: `api, the last 90 days`. */
    label: string
    /** The narrowest a day is drawn, in pixels: in a box too narrow for every day at this width, the oldest give way. */
    minBarWidth?: number
    /** How an uptime is written: `99.95%` by default. */
    format?: (uptime: number) => string
    /** How a day is written in the readout: `Nov 3, 2026` by default. */
    formatDay?: (date: string) => string
    /** Called with the day pressed, or chosen with Enter, such as to list its incidents. */
    onSelect?: (day: UptimeDay) => void
    words?: Partial<UptimeBarWords>
    className?: string
}

/** The gap between two days, in pixels: `gap-px` below. */
const GAP = 1

const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

/** A `YYYY-MM-DD` day written as `Nov 3, 2026`. */
export function formatUptimeDay(date: string): string {
    const when = new Date(`${date}T00:00:00Z`)
    return Number.isNaN(when.getTime()) ? date : DAY.format(when)
}

/** An uptime written to two decimals: `0.99951` is `99.95%`. */
export function formatUptime(uptime: number): string {
    return `${(Math.floor(uptime * 10_000) / 100).toFixed(2)}%`
}

/** The color a day is drawn in by its uptime alone: all of it good, a little lost a warning, more critical. */
export function uptimeColor(uptime: number | null): string {
    if (uptime === null) return 'color-mix(in oklab, var(--muted-foreground) 22%, var(--card))'
    if (uptime >= 0.999) return STATUS_CSS.good
    if (uptime >= 0.99) return STATUS_CSS.warning
    return STATUS_CSS.critical
}

/** The share of the measured days' time that was up, or null when none was measured. */
export function overallUptime(days: readonly UptimeDay[]): number | null {
    const measured = days.filter((day) => day.uptime !== null)
    if (measured.length === 0) return null
    return measured.reduce((sum, day) => sum + (day.uptime ?? 0), 0) / measured.length
}

/** How many days of `minBarWidth` fit a room `width` pixels wide, at least one. */
export function daysThatFit(width: number, minBarWidth: number): number {
    return Math.max(1, Math.floor((width + GAP) / (minBarWidth + GAP)))
}

/**
 * A thing's record over the last days as a row of bars, one a day, oldest at the left and today at
 * the right: a service's uptime on a status page. A day is drawn in its state's color from the
 * status map, or by its uptime when it has no state (good, a warning when a little was lost,
 * critical past that), and a day with nothing measured is left quiet. Under the bars the first day
 * shown says how long ago it was, the last says today, and between them the uptime over the days
 * shown; pointing at a day, or moving to it with the arrows, puts its date, its uptime and its note
 * there instead. A box too narrow for every day at `minBarWidth` shows the latest that fit.
 */
export function UptimeBar({
    days,
    label,
    minBarWidth = 3,
    format = formatUptime,
    formatDay = formatUptimeDay,
    onSelect,
    words: given,
    className,
}: UptimeBarProps) {
    const words = { ...WORDS, ...given }
    const strip = useRef<HTMLDivElement>(null)
    const [fit, setFit] = useState(days.length)
    const [active, setActive] = useState<number | null>(null)

    useLayoutEffect(() => {
        const node = strip.current
        if (node === null) return
        const measure = () => setFit(daysThatFit(node.clientWidth, minBarWidth))
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(measure)
        observer.observe(node)
        return () => observer.disconnect()
    }, [minBarWidth])

    const shown = useMemo(() => days.slice(Math.max(0, days.length - fit)), [days, fit])
    const overall = useMemo(() => overallUptime(shown), [shown])
    const pointed = active === null ? undefined : shown[active]

    const move = (event: KeyboardEvent<HTMLDivElement>) => {
        const last = shown.length - 1
        const from = active ?? last
        const to =
            event.key === 'ArrowLeft'
                ? Math.max(0, from - 1)
                : event.key === 'ArrowRight'
                  ? Math.min(last, from + 1)
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? last
                      : undefined
        if (to !== undefined) {
            event.preventDefault()
            setActive(to)
        } else if (event.key === 'Enter' && pointed !== undefined) onSelect?.(pointed)
    }

    return (
        <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <div
                ref={strip}
                role="img"
                aria-label={overall === null ? label : `${label}: ${words.uptime(format(overall))}`}
                tabIndex={0}
                className="flex h-7 gap-px rounded-mini outline-none focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid"
                onKeyDown={move}
                onBlur={() => setActive(null)}
                onPointerLeave={() => setActive(null)}
            >
                {shown.map((day, index) => (
                    <UptimeDayBar
                        key={day.date}
                        day={day}
                        active={index === active}
                        onPoint={() => setActive(index)}
                        onPress={onSelect === undefined ? undefined : () => onSelect(day)}
                    />
                ))}
            </div>
            <div className="flex items-baseline gap-3 text-xs text-muted-foreground tabular-nums">
                <span className="shrink-0">{words.since(shown.length - 1)}</span>
                <span aria-live="polite" className="min-w-0 flex-1 truncate text-center">
                    {pointed !== undefined ? (
                        <>
                            <span className="text-foreground">{formatDay(pointed.date)}</span>
                            {' · '}
                            {pointed.uptime === null ? words.noData : format(pointed.uptime)}
                            {pointed.note !== undefined && <> · {pointed.note}</>}
                        </>
                    ) : overall === null ? (
                        words.noData
                    ) : (
                        words.uptime(format(overall))
                    )}
                </span>
                <span className="shrink-0">{words.today}</span>
            </div>
        </div>
    )
}

function UptimeDayBar({ day, active, onPoint, onPress }: { day: UptimeDay; active: boolean; onPoint: () => void; onPress?: () => void }) {
    const look = useStatus(day.status ?? '')
    const color = day.status === undefined ? uptimeColor(day.uptime) : look.css
    return (
        <span
            aria-hidden
            data-active={active || undefined}
            className={cn(
                'min-w-0 flex-1 rounded-mini transition-opacity data-active:opacity-60',
                onPress !== undefined && 'cursor-pointer',
            )}
            style={{ background: color }}
            onPointerEnter={onPoint}
            onPointerDown={onPoint}
            onClick={onPress}
        />
    )
}
