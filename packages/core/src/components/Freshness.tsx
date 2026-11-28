'use client'

import { useState } from 'react'

import { useClock } from '../hooks/use-clock'
import { cn } from '../lib/cn'
import { useLocale, useWords, type WordMessages, type WordsPart } from '../lib/words'
import { Dot } from './Dot'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** How fresh a reading is: just in, a while ago, getting old, or too old to trust. */
export type FreshnessState = 'live' | 'recent' | 'stale' | 'lost'

/** Where a reading moves from one state to the next, in milliseconds of age. */
export interface FreshnessThresholds {
    /** Younger than this it is live: 5 seconds by default. */
    live: number
    /** From this age it is stale, drawn quieter: a minute by default. */
    stale: number
    /** From this age it is lost, drawn in the warning tone: five minutes by default. */
    lost: number
}

export const FRESHNESS_THRESHOLDS: FreshnessThresholds = { live: 5 * SECOND, stale: MINUTE, lost: 5 * MINUTE }

export interface FreshnessWords {
    /** Said while a reading is live. */
    live: string
    /** Said where there has been no reading at all. */
    never: string
    seconds: (count: number) => string
    minutes: (count: number) => string
    hours: (count: number) => string
    days: (count: number) => string
    /** The mark's tooltip: when the last reading came, the time spelled out. */
    updated: (time: string) => string
}

export const FRESHNESS_WORDS: FreshnessWords = {
    live: 'Live',
    never: 'No data',
    seconds: (count) => `${count.toLocaleString('en-US')} s ago`,
    minutes: (count) => `${count.toLocaleString('en-US')} min ago`,
    hours: (count) => `${count.toLocaleString('en-US')} h ago`,
    days: (count) => `${count.toLocaleString('en-US')} d ago`,
    updated: (time) => `Updated ${time}`,
}

/** Where a catalog holds a freshness mark's words, and the arguments its phrases name. */
export const FRESHNESS_PART: WordsPart<FreshnessWords> = {
    id: 'freshness',
    words: FRESHNESS_WORDS,
    args: { seconds: 'count', minutes: 'count', hours: 'count', days: 'count', updated: 'time' },
}

/** A freshness mark's phrases as ICU messages in English, for the catalog. */
export const FRESHNESS_MESSAGES: WordMessages<FreshnessWords> = {
    seconds: '{count, number} s ago',
    minutes: '{count, number} min ago',
    hours: '{count, number} h ago',
    days: '{count, number} d ago',
    updated: 'Updated {time}',
}

/** A reading's state at an age, by the thresholds; no reading at all is lost. */
export function freshnessOf(age: number | null, thresholds: FreshnessThresholds = FRESHNESS_THRESHOLDS): FreshnessState {
    if (age === null || !Number.isFinite(age)) return 'lost'
    if (age < thresholds.live) return 'live'
    if (age < thresholds.stale) return 'recent'
    if (age < thresholds.lost) return 'stale'
    return 'lost'
}

/** An age in words: live under the live threshold, then the largest whole unit it holds, "3 s ago", "2 min ago". */
export function freshnessText(
    age: number | null,
    words: FreshnessWords = FRESHNESS_WORDS,
    live: number = FRESHNESS_THRESHOLDS.live,
): string {
    if (age === null || !Number.isFinite(age)) return words.never
    const past = Math.max(age, 0)
    if (past < live) return words.live
    if (past < MINUTE) return words.seconds(Math.floor(past / SECOND))
    if (past < HOUR) return words.minutes(Math.floor(past / MINUTE))
    if (past < DAY) return words.hours(Math.floor(past / HOUR))
    return words.days(Math.floor(past / DAY))
}

/** How often a mark at this age reads the clock again: each second under a minute, every five under an hour, then each minute. */
export function freshnessTick(age: number): number {
    if (age < MINUTE) return SECOND
    if (age < HOUR) return 5 * SECOND
    return MINUTE
}

const INK: Record<FreshnessState, string> = {
    live: 'text-good-ink',
    recent: 'text-muted-foreground',
    stale: 'text-faint',
    lost: 'text-warning-ink',
}

/** The dot before the words: pulsing while live, hollow and faint once stale, in the warning tone once lost. */
const DOT: Partial<Record<FreshnessState, string>> = { live: 'var(--good)', stale: 'var(--faint)', lost: 'var(--warning)' }

/** A time: a `Date`, milliseconds since the epoch, or an ISO 8601 text. */
export type FreshnessTime = Date | number | string

function msOf(time: FreshnessTime | null | undefined): number | null {
    if (time === null || time === undefined) return null
    const ms = time instanceof Date ? time.getTime() : typeof time === 'number' ? time : Date.parse(time)
    return Number.isNaN(ms) ? null : ms
}

export interface FreshnessProps {
    /** When the last reading came; null or left out where none has. */
    at?: FreshnessTime | null
    /** The moment to count from; without it, a clock shared by every mark. */
    now?: FreshnessTime
    /** Where it turns from live to recent, stale and lost; any left out keep their defaults. */
    thresholds?: Partial<FreshnessThresholds>
    /** A dot before the words while live (pulsing), stale (hollow) or lost; on by default. */
    dot?: boolean
    words?: Partial<FreshnessWords>
    /** The locale the tooltip's time is spelled in. */
    locale?: string
    /** The zone the tooltip's time is spelled in. */
    timeZone?: string
    className?: string
}

/**
 * How fresh a reading is, as a console says it of a track or a sensor: "Live" while it is just in,
 * then "3 s ago", "2 min ago", drawn quieter once it is stale and in the warning tone once it is lost,
 * with the time of the reading in its tooltip. Without `now` it reads the time from a clock every
 * mark shares, a single timer however many marks a list draws, each second while a reading is under
 * a minute old and less often after; a story or a list that holds its own clock passes `now`.
 */
export function Freshness({
    at,
    now: given,
    thresholds: partial,
    dot = true,
    words: givenWords,
    locale,
    timeZone,
    className,
}: FreshnessProps) {
    const words = useWords(FRESHNESS_PART, givenWords)
    const providerLocale = useLocale()
    const thresholds = { ...FRESHNESS_THRESHOLDS, ...partial }
    const when = msOf(at)
    const fixed = msOf(given)
    // The clock it reads, shared with every mark that reads as often.
    const [period, setPeriod] = useState(() => freshnessTick(when === null ? Infinity : Date.now() - when))
    const clock = useClock(fixed === null && when !== null ? period : null)
    const now = fixed ?? clock?.getTime() ?? Date.now()
    const age = when === null ? null : now - when
    if (fixed === null && age !== null && freshnessTick(age) !== period) setPeriod(freshnessTick(age))
    const state = freshnessOf(age, thresholds)
    const text = freshnessText(age, words, thresholds.live)
    const color = DOT[state]
    const title =
        when === null
            ? undefined
            : words.updated(
                  new Intl.DateTimeFormat(locale ?? providerLocale, {
                      dateStyle: age !== null && age >= DAY ? 'medium' : undefined,
                      timeStyle: 'medium',
                      timeZone,
                  }).format(when),
              )
    return (
        <span
            data-slot="freshness"
            data-state={state}
            title={title}
            className={cn('inline-flex items-center gap-1.5 text-xs whitespace-nowrap tabular-nums', INK[state], className)}
        >
            {dot && color !== undefined && (
                <Dot color={color} size="sm" outline={state === 'stale'} className={cn(state === 'live' && 'animate-live')} />
            )}
            {when === null ? text : <time dateTime={new Date(when).toISOString()}>{text}</time>}
        </span>
    )
}
