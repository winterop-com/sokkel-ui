'use client'

import { CalendarRange, ChevronDown, Pause, Play, RefreshCw } from 'lucide-react'
import { lazy, Suspense, useId, useRef, useState } from 'react'
import type { DateRange } from 'react-day-picker'

import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Spinner } from '../ui/spinner'
import { useLocale, useWords, type WordMessages, type WordsPart } from '../../lib/words'

/** The calendar and its date library, fetched when the picker is first pointed at, focused or opened. */
const loadCalendar = () => import('../ui/calendar')
const Calendar = lazy(() => loadCalendar().then((module) => ({ default: module.Calendar })))
/** The fields a custom range's times are typed in, fetched with the calendar by a picker that takes times. */
const loadTimes = () => import('./range-times')
const RangeTimes = lazy(() => loadTimes().then((module) => ({ default: module.RangeTimes })))

/** A named range a dashboard covers: the last hour, the last 7 days. */
export interface RangePreset {
    id: string
    label: string
}

/** What a dashboard covers: a preset, or a custom span of days, or of moments when the picker takes times. */
export type TimeRangeValue = { preset: string } | { from: Date; to: Date }

export const DEFAULT_PRESETS: RangePreset[] = [
    { id: '1h', label: 'Last hour' },
    { id: '24h', label: 'Last 24 hours' },
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
]

const atMidnight = (date: Date) => date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0

/**
 * A custom range said for a reader: `Oct 3 to Oct 17, 2026`, and with its times where either end is
 * not at midnight, on a 24 or a 12-hour clock: `Oct 3, 09:00 to Oct 17, 2026, 17:30`, or
 * `Oct 3, 2026, 09:00 to 17:30` within one day.
 */
export function rangeLabel(from: Date, to: Date, locale = 'en-US', clock: 12 | 24 = 24): string {
    const short = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
    const year = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' })
    if (atMidnight(from) && atMidnight(to)) return `${short.format(from)} to ${year.format(to)}`
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: clock === 24 ? 'h23' : 'h12' })
    if (from.toDateString() === to.toDateString()) return `${year.format(from)}, ${time.format(from)} to ${time.format(to)}`
    return `${short.format(from)}, ${time.format(from)} to ${year.format(to)}, ${time.format(to)}`
}

/** A moment's time of day on the wall clock, `HH:mm`. */
export function timeOfDay(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** A day at a time of day, `HH:mm` or `HH:mm:ss`, on the wall clock. */
export function atTime(day: Date, time: string): Date {
    const [hours = 0, minutes = 0, seconds = 0] = time.split(':').map(Number)
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, seconds)
}

/** Whether two ranges cover the same: the same preset, or a custom span of the same days. */
export function sameRange(a: TimeRangeValue, b: TimeRangeValue): boolean {
    if ('preset' in a || 'preset' in b) return 'preset' in a && 'preset' in b && a.preset === b.preset
    return a.from.getTime() === b.from.getTime() && a.to.getTime() === b.to.getTime()
}

const draftOf = (value: TimeRangeValue): DateRange | undefined => ('from' in value ? { from: value.from, to: value.to } : undefined)

/** The times a custom range starts and ends at: a custom value's own, or the whole of its days. */
const timesOf = (value: TimeRangeValue): [string, string] =>
    'from' in value ? [timeOfDay(value.from), timeOfDay(value.to)] : ['00:00', '23:59']

/** The words a time range picker says; `range` writes a custom span for a reader. */
export interface TimeRangeWords {
    custom: string
    apply: string
    /** The fields a custom range's times are typed in, with `times`. */
    start: string
    end: string
    range: (from: Date, to: Date) => string
}

export const TIME_RANGE_WORDS: Omit<TimeRangeWords, 'range'> = {
    custom: 'Custom range',
    apply: 'Apply',
    start: 'Start time',
    end: 'End time',
}

/** Where a catalog holds a time range picker's words; `range` writes a span in the locale. */
export const TIME_RANGE_PART: WordsPart<Omit<TimeRangeWords, 'range'>> = { id: 'timeRange', words: TIME_RANGE_WORDS }

export interface TimeRangePickerProps {
    value: TimeRangeValue
    onChange: (value: TimeRangeValue) => void
    presets?: readonly RangePreset[]
    /** The month the calendar shows first. */
    defaultMonth?: Date
    /** The day the calendar marks as today; the clock's day when omitted. */
    today?: Date
    /**
     * Whether a custom range takes a time of day at each end, typed or picked in two fields under
     * the calendar; whole days from midnight to midnight when off.
     */
    times?: boolean
    /** The clock the times are written on: 24-hour (`14:30`) or 12-hour (`2:30 PM`). */
    clock?: 12 | 24
    /** Whether the popover is open, held from outside with `onOpenChange`. */
    open?: boolean
    /** Whether the popover starts open when `open` is not given. */
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    words?: Partial<TimeRangeWords>
    className?: string
}

/**
 * The range a dashboard covers: a trigger naming the current range, opening a list of presets
 * beside a calendar for a custom span. Choosing a preset applies it at once; a custom span applies
 * with the Apply button. With `times`, a custom span starts and ends at a time of day, typed or
 * picked under the calendar (the whole of its days, `00:00` to `23:59`, until one is changed), and
 * Apply waits for an end after the start. The calendar loads when the trigger is first pointed at
 * or focused, with a spinner in its place until it arrives.
 *
 * Left to itself the popover opens and closes on its own, starting at `defaultOpen`; `open` with
 * `onOpenChange` holds it from outside.
 */
export function TimeRangePicker({
    value,
    onChange,
    presets = DEFAULT_PRESETS,
    defaultMonth,
    today,
    times = false,
    clock = 24,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    words: given,
    className,
}: TimeRangePickerProps) {
    const own = useWords(TIME_RANGE_PART)
    const locale = useLocale()
    const words: TimeRangeWords = { ...own, range: (from, to) => rangeLabel(from, to, locale, clock), ...given }
    const id = useId()
    const prefetch = () => {
        void loadCalendar()
        if (times) void loadTimes()
    }
    const [ownOpen, setOwnOpen] = useState(defaultOpen)
    const open = openProp ?? ownOpen
    const setOpen = (next: boolean) => {
        if (openProp === undefined) setOwnOpen(next)
        onOpenChange?.(next)
    }
    const chosenRef = useRef<HTMLButtonElement>(null)
    const [draft, setDraft] = useState<DateRange | undefined>(() => draftOf(value))
    const [[start, end], setTimes] = useState<[string, string]>(() => timesOf(value))
    // A range changed from outside replaces the span being picked; an equal one built afresh does not.
    const [basis, setBasis] = useState(value)
    if (!sameRange(basis, value)) {
        setBasis(value)
        setDraft(draftOf(value))
        setTimes(timesOf(value))
    }
    const picked =
        draft?.from === undefined || draft.to === undefined
            ? null
            : times
              ? { from: atTime(draft.from, start), to: atTime(draft.to, end) }
              : { from: draft.from, to: draft.to }
    const ready = picked !== null && (!times || picked.from < picked.to)
    const label =
        'preset' in value
            ? (presets.find((preset) => preset.id === value.preset)?.label ?? value.preset)
            : words.range(value.from, value.to)
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button variant="outline" size="sm" className={cn('gap-1.5', className)} onPointerEnter={prefetch} onFocus={prefetch} />
                }
            >
                <CalendarRange aria-hidden />
                {label}
                <ChevronDown className="text-muted-foreground" aria-hidden />
            </PopoverTrigger>
            <PopoverContent align="end" initialFocus={chosenRef} className="flex w-auto flex-row gap-0 p-0">
                <ul className="flex w-40 flex-col gap-0.5 border-r border-border p-1.5">
                    {presets.map((preset) => {
                        const chosen = 'preset' in value && value.preset === preset.id
                        return (
                            <li key={preset.id}>
                                <button
                                    ref={chosen ? chosenRef : undefined}
                                    type="button"
                                    aria-pressed={chosen}
                                    onClick={() => {
                                        onChange({ preset: preset.id })
                                        setOpen(false)
                                    }}
                                    className={cn(
                                        'flex h-8 w-full items-center rounded-md px-2 text-left text-sm outline-none hover:bg-hover focus-visible:outline-focus focus-visible:outline-ring focus-visible:outline-solid',
                                        chosen && 'bg-secondary font-medium',
                                    )}
                                >
                                    {preset.label}
                                </button>
                            </li>
                        )
                    })}
                </ul>
                <div className="flex flex-col max-sm:hidden">
                    <p className="px-3 pt-2.5 text-xs font-medium text-muted-foreground">{words.custom}</p>
                    <Suspense
                        fallback={
                            <div className="flex h-72 w-106 items-center justify-center">
                                <Spinner className="text-muted-foreground" />
                            </div>
                        }
                    >
                        <Calendar
                            mode="range"
                            numberOfMonths={2}
                            defaultMonth={defaultMonth}
                            today={today}
                            selected={draft}
                            onSelect={setDraft}
                        />
                        {times && <RangeTimes id={id} start={start} end={end} clock={clock} words={words} onChange={setTimes} />}
                    </Suspense>
                    <div className="flex justify-end border-t border-border p-2">
                        <Button
                            size="sm"
                            aria-disabled={!ready || undefined}
                            className={cn(!ready && 'cursor-not-allowed opacity-disabled')}
                            onClick={() => {
                                if (picked === null || !ready) return
                                onChange(picked)
                                setOpen(false)
                            }}
                        >
                            {words.apply}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

/** How often a dashboard refreshes itself, in seconds; 0 is never. */
export const REFRESH_INTERVALS = [0, 10, 30, 60, 300] as const

/** The words a refresh control says; `seconds` writes an interval. */
export interface RefreshWords {
    refresh: string
    every: string
    off: string
    /** The pause button's label while refreshing by itself runs, and while it is paused. */
    pause: string
    resume: string
    seconds: (count: number) => string
}

export const REFRESH_WORDS: RefreshWords = {
    refresh: 'Refresh',
    every: 'Refresh every',
    off: 'Off',
    pause: 'Pause',
    resume: 'Resume',
    seconds: (count) => (count < 60 ? `${count}s` : `${count / 60}m`),
}

/** Where a catalog holds a refresh control's words. */
export const REFRESH_PART: WordsPart<RefreshWords> = { id: 'refresh', words: REFRESH_WORDS }

/** A refresh control's phrases as ICU messages in English, for the catalog. */
export const REFRESH_MESSAGES: WordMessages<RefreshWords> = {
    seconds: null,
}

export interface RefreshControlProps {
    onRefresh: () => void
    refreshing?: boolean
    /** Seconds between refreshes; 0 is never. */
    interval: number
    onIntervalChange: (seconds: number) => void
    /** The intervals the menu offers, in seconds, 0 for never; `REFRESH_INTERVALS` when omitted. */
    intervals?: readonly number[]
    /**
     * Whether refreshing by itself is paused, keeping the interval for when it resumes. Given with
     * `onPausedChange`, a pause button stands between the refresh and the menu while an interval is set.
     */
    paused?: boolean
    onPausedChange?: (paused: boolean) => void
    /** When it last refreshed: `updated 2 min ago`. */
    updated?: string
    words?: Partial<RefreshWords>
}

/**
 * Refreshing a dashboard: a button that refreshes now and spins while it does, a menu choosing how
 * often it refreshes by itself, which closes on a choice, and when it last did, already written for
 * a reader. With
 * `onPausedChange`, a pause button holds the refreshing a while without losing the interval, as
 * while reading a moment of a live dashboard. `useRefresh` runs the app's refresh on the interval
 * and pause the control sets, and gives it `onRefresh` and `refreshing`.
 */
export function RefreshControl({
    onRefresh,
    refreshing = false,
    interval,
    onIntervalChange,
    intervals = REFRESH_INTERVALS,
    paused = false,
    onPausedChange,
    updated,
    words: given,
}: RefreshControlProps) {
    const words = useWords(REFRESH_PART, given)
    const pausable = onPausedChange !== undefined && interval > 0
    return (
        <div className="flex items-center gap-2">
            {updated !== undefined && <span className="text-xs text-muted-foreground max-sm:hidden">{updated}</span>}
            <div className="flex items-center rounded-control border border-border">
                <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-r-none"
                    aria-label={words.refresh}
                    title={words.refresh}
                    onClick={onRefresh}
                >
                    <RefreshCw className={cn(refreshing && 'animate-spin')} aria-hidden />
                </Button>
                {pausable && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-none border-l border-border"
                        aria-label={paused ? words.resume : words.pause}
                        aria-pressed={paused}
                        title={paused ? words.resume : words.pause}
                        onClick={() => onPausedChange(!paused)}
                    >
                        {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
                    </Button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    'rounded-l-none border-l border-border px-2 tabular-nums',
                                    pausable && paused && 'text-muted-foreground',
                                )}
                                aria-label={words.every}
                            />
                        }
                    >
                        {interval === 0 ? words.off : words.seconds(interval)}
                        <ChevronDown className="text-muted-foreground" aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuRadioGroup value={String(interval)} onValueChange={(next) => onIntervalChange(Number(next))}>
                            {intervals.map((seconds) => (
                                <DropdownMenuRadioItem key={seconds} value={String(seconds)} closeOnClick>
                                    {seconds === 0 ? words.off : words.seconds(seconds)}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
