import { CalendarRange, ChevronDown, RefreshCw } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'
import type { DateRange } from 'react-day-picker'

import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Spinner } from '../ui/spinner'

/** The calendar and its date library, fetched when the picker is first pointed at, focused or opened. */
const loadCalendar = () => import('../ui/calendar')
const Calendar = lazy(() => loadCalendar().then((module) => ({ default: module.Calendar })))
const prefetchCalendar = () => void loadCalendar()

/** A named range a dashboard covers: the last hour, the last 7 days. */
export interface RangePreset {
    id: string
    label: string
}

/** What a dashboard covers: a preset, or a custom span of days. */
export type TimeRangeValue = { preset: string } | { from: Date; to: Date }

export const DEFAULT_PRESETS: RangePreset[] = [
    { id: '1h', label: 'Last hour' },
    { id: '24h', label: 'Last 24 hours' },
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
]

/** A custom range said for a reader: `Oct 3 to Oct 17, 2026`. */
export function rangeLabel(from: Date, to: Date, locale = 'en-US'): string {
    const short = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
    const year = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' })
    return `${short.format(from)} to ${year.format(to)}`
}

/** The words a time range picker says; `range` writes a custom span for a reader. */
export interface TimeRangeWords {
    custom: string
    apply: string
    range: (from: Date, to: Date) => string
}

const TIME_RANGE_WORDS: TimeRangeWords = {
    custom: 'Custom range',
    apply: 'Apply',
    range: (from, to) => rangeLabel(from, to),
}

export interface TimeRangePickerProps {
    value: TimeRangeValue
    onChange: (value: TimeRangeValue) => void
    presets?: readonly RangePreset[]
    /** The month the calendar shows first. */
    defaultMonth?: Date
    /** The day the calendar marks as today; the clock's day when omitted. */
    today?: Date
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
 * with the Apply button. The calendar loads when the trigger is first pointed at or focused, with
 * a spinner in its place until it arrives.
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
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    words: given,
    className,
}: TimeRangePickerProps) {
    const words = { ...TIME_RANGE_WORDS, ...given }
    const [ownOpen, setOwnOpen] = useState(defaultOpen)
    const open = openProp ?? ownOpen
    const setOpen = (next: boolean) => {
        if (openProp === undefined) setOwnOpen(next)
        onOpenChange?.(next)
    }
    const chosenRef = useRef<HTMLButtonElement>(null)
    const [draft, setDraft] = useState<DateRange | undefined>('from' in value ? { from: value.from, to: value.to } : undefined)
    const label =
        'preset' in value
            ? (presets.find((preset) => preset.id === value.preset)?.label ?? value.preset)
            : words.range(value.from, value.to)
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn('gap-1.5', className)}
                        onPointerEnter={prefetchCalendar}
                        onFocus={prefetchCalendar}
                    />
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
                                        'flex h-8 w-full items-center rounded-md px-2 text-left text-sm outline-none hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid',
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
                    </Suspense>
                    <div className="flex justify-end border-t border-border p-2">
                        <Button
                            size="sm"
                            aria-disabled={draft?.from === undefined || draft.to === undefined || undefined}
                            className={cn((draft?.from === undefined || draft.to === undefined) && 'cursor-not-allowed opacity-50')}
                            onClick={() => {
                                if (draft?.from === undefined || draft.to === undefined) return
                                onChange({ from: draft.from, to: draft.to })
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
    seconds: (count: number) => string
}

const REFRESH_WORDS: RefreshWords = {
    refresh: 'Refresh',
    every: 'Refresh every',
    off: 'Off',
    seconds: (count) => (count < 60 ? `${count}s` : `${count / 60}m`),
}

export interface RefreshControlProps {
    onRefresh: () => void
    refreshing?: boolean
    /** Seconds between refreshes; 0 is never. */
    interval: number
    onIntervalChange: (seconds: number) => void
    /** When it last refreshed: `updated 2 min ago`. */
    updated?: string
    words?: Partial<RefreshWords>
}

/**
 * Refreshing a dashboard: a button that refreshes now and spins while it does, a menu choosing how
 * often it refreshes by itself, and when it last did, already written for a reader.
 */
export function RefreshControl({ onRefresh, refreshing = false, interval, onIntervalChange, updated, words: given }: RefreshControlProps) {
    const words = { ...REFRESH_WORDS, ...given }
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
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-l-none border-l border-border px-2 tabular-nums"
                                aria-label={words.every}
                            />
                        }
                    >
                        {interval === 0 ? words.off : words.seconds(interval)}
                        <ChevronDown className="text-muted-foreground" aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuRadioGroup value={String(interval)} onValueChange={(next) => onIntervalChange(Number(next))}>
                            {REFRESH_INTERVALS.map((seconds) => (
                                <DropdownMenuRadioItem key={seconds} value={String(seconds)}>
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
