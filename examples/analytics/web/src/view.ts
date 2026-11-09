/**
 * Where the app is and what it shows, all in the location's hash so a view can be shared as a link:
 * the page, then the range, the comparison and the segment, `#/revenue?range=90d&compare=1&plan=team`.
 */

import type { RangePreset, TimeRangeValue } from '@winterop-com/sokkel-ui/dashboard/TimeRange'
import { useEffect, useState } from 'react'

import { DAY, PLANS, REGIONS, dateOfDay, dayFrom, dayOf, dayOfDate, isoDay, shortDay, startOf, type Plan, type Region } from './model'

export const PRESETS: RangePreset[] = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
    { id: 'mtd', label: 'Month to date' },
    { id: 'ytd', label: 'Year to date' },
    { id: '12m', label: 'Last 12 months' },
]

/** A range as the address writes it: a preset's id, or `2026-10-01..2026-10-31`. */
export type Range = { preset: string } | { from: number; to: number }

export interface View {
    path: string[]
    range: Range
    compare: boolean
    plan: Plan | 'all'
    region: Region | 'all'
    /** What else the address says, such as the saved view a listing opens on. */
    params: URLSearchParams
}

function readRange(text: string | null, fallback: string): Range {
    const custom = text === null ? null : /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(text)
    if (custom !== null) {
        const from = dayFrom(custom[1] ?? '')
        const to = dayFrom(custom[2] ?? '')
        if (Number.isFinite(from) && Number.isFinite(to) && from <= to) return { from, to }
    }
    const preset = text ?? fallback
    return { preset: PRESETS.some((one) => one.id === preset) ? preset : '30d' }
}

/** The view the hash names, with the person's defaults where it names none. */
export function readView(hash: string, defaults: { range: string; compare: boolean }): View {
    const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?')
    const params = new URLSearchParams(query)
    const plan = params.get('plan')
    const region = params.get('region')
    const compare = params.get('compare')
    return {
        path: path
            .split('/')
            .filter((part) => part !== '')
            .map(decodeURIComponent),
        range: readRange(params.get('range'), defaults.range),
        compare: compare === null ? defaults.compare : compare === '1',
        plan: (PLANS as readonly string[]).includes(plan ?? '') ? (plan as Plan) : 'all',
        region: (REGIONS as readonly string[]).includes(region ?? '') ? (region as Region) : 'all',
        params,
    }
}

const rangeText = (range: Range) => ('preset' in range ? range.preset : `${isoDay(range.from)}..${isoDay(range.to)}`)

/** The address of a page with the view's range, comparison and segment, and any other `extra` it names. */
export function hrefOf(view: View, path: string, extra: Record<string, string | null> = {}): string {
    const params = new URLSearchParams()
    params.set('range', rangeText(view.range))
    params.set('compare', view.compare ? '1' : '0')
    if (view.plan !== 'all') params.set('plan', view.plan)
    if (view.region !== 'all') params.set('region', view.region)
    for (const [key, value] of Object.entries(extra)) if (value !== null) params.set(key, value)
    return `#/${path.replace(/^\//, '')}?${params.toString()}`
}

/** The hash, followed as it changes. */
export function useHash(): string {
    const [hash, setHash] = useState(() => window.location.hash)
    useEffect(() => {
        const change = () => setHash(window.location.hash)
        window.addEventListener('hashchange', change)
        return () => window.removeEventListener('hashchange', change)
    }, [])
    return hash
}

/** Goes to an address made by `hrefOf`. */
export function go(href: string): void {
    window.location.hash = href.replace(/^#/, '')
}

/** The range for the picker: a preset, or the custom span as dates. */
export function pickerValue(range: Range): TimeRangeValue {
    return 'preset' in range ? { preset: range.preset } : { from: dateOfDay(range.from), to: dateOfDay(range.to) }
}

export function fromPicker(value: TimeRangeValue): Range {
    return 'preset' in value ? { preset: value.preset } : { from: dayOfDate(value.from), to: dayOfDate(value.to) }
}

/** One step along a chart's time axis: from and to in milliseconds, and its label. */
export interface Bucket {
    from: number
    to: number
    label: string
}

/** A stretch of time the figures are read over, cut into the steps its charts draw. */
export interface Span {
    from: number
    to: number
    /** Its first and last day. */
    first: number
    last: number
    /** How many days it covers. */
    days: number
    buckets: Bucket[]
    /** The size of its steps. */
    step: 'hour' | 'day' | 'week' | 'month'
}

const HOUR = 3_600_000

function cut(from: number, to: number, first: number, days: number): Pick<Span, 'buckets' | 'step'> {
    if (days <= 1) {
        const buckets: Bucket[] = []
        for (let hour = 0; hour < 24; hour += 1) {
            const start = from + hour * HOUR
            buckets.push({ from: start, to: start + HOUR, label: `${String(hour).padStart(2, '0')}:00` })
        }
        return { buckets, step: 'hour' }
    }
    const width = days <= 92 ? 1 : days <= 400 ? 7 : 30
    const buckets: Bucket[] = []
    for (let day = first; startOf(day) < to; day += width) {
        buckets.push({ from: startOf(day), to: Math.min(startOf(day + width), to), label: shortDay(day) })
    }
    return { buckets, step: width === 1 ? 'day' : width === 7 ? 'week' : 'month' }
}

/** The span a range covers at `now`; a range that reaches today ends at the moment. */
export function spanOf(range: Range, now: number): Span {
    const today = dayOf(now)
    let first: number
    let last: number
    if ('from' in range) {
        first = range.from
        last = Math.min(range.to, today)
    } else {
        const date = new Date(now)
        last = today
        first =
            range.preset === 'today'
                ? today
                : range.preset === '7d'
                  ? today - 6
                  : range.preset === '90d'
                    ? today - 89
                    : range.preset === '12m'
                      ? today - 364
                      : range.preset === 'mtd'
                        ? dayOfDate(new Date(date.getFullYear(), date.getMonth(), 1))
                        : range.preset === 'ytd'
                          ? dayOfDate(new Date(date.getFullYear(), 0, 1))
                          : today - 29
    }
    const days = last - first + 1
    const from = startOf(first)
    const to = last >= today ? now : startOf(last + 1)
    return { from, to, first, last, days, ...cut(from, startOf(last + 1), first, days) }
}

/** The span just before, as long, ending at the same moment of its day, for comparing with. */
export function previousOf(span: Span): Span {
    const shift = span.days * DAY
    const first = span.first - span.days
    const from = startOf(first)
    const to = span.to - shift
    return {
        ...span,
        from,
        to,
        first,
        last: span.last - span.days,
        buckets: span.buckets.map((bucket) => ({ ...bucket, from: bucket.from - shift, to: bucket.to - shift })),
    }
}

/** The range said for a reader: `Last 30 days`, `Oct 3 to Oct 17`. */
export function rangeName(range: Range): string {
    if ('preset' in range) return PRESETS.find((preset) => preset.id === range.preset)?.label ?? range.preset
    return `${shortDay(range.from)} to ${shortDay(range.to)}`
}
