'use client'

import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import {
    TRACK_AFFILIATIONS,
    TRACK_COLORS,
    TRACK_NAMES_PART,
    type TrackAffiliation,
    type TrackKind,
    type TrackNameWords,
} from '../lib/tracks'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import { Chip, type ChipTone } from './Chip'
import { Dot } from './Dot'
import { Freshness, type FreshnessThresholds, type FreshnessTime, type FreshnessWords } from './Freshness'
import { TrackGlyph } from './TrackGlyph'

export type { TrackAffiliation, TrackKind } from '../lib/tracks'

/** A state a track is in, as a chip: a word, or a word in a tone ("Simulated", "Live" in good). */
export type TrackState = string | { label: string; tone?: ChipTone }

export interface TrackCardWords {
    /** The affiliation chip's name when it opens a menu, given the affiliation's name. */
    changeAffiliation: (affiliation: string) => string
}

export const TRACK_CARD_WORDS: TrackCardWords = {
    changeAffiliation: (affiliation) => `Affiliation: ${affiliation}. Change`,
}

/** Where a catalog holds a track card's words, and the arguments its phrases name. */
export const TRACK_CARD_PART: WordsPart<TrackCardWords> = {
    id: 'trackCard',
    words: TRACK_CARD_WORDS,
    args: { changeAffiliation: 'affiliation' },
}

/** A track card's phrases as ICU messages in English, for the catalog. */
export const TRACK_CARD_MESSAGES: WordMessages<TrackCardWords> = {
    changeAffiliation: 'Affiliation: {affiliation}. Change',
}

export interface TrackCardProps {
    /** What the track is called. */
    name: string
    /** Its id, in the code face after the name; left out where the name is the id. */
    code?: string
    kind: TrackKind
    affiliation: TrackAffiliation
    /** Which way it is going, which turns its glyph. */
    heading?: number
    /** A picture of it at the card's start: an image's address or a node. */
    thumbnail?: string | ReactNode
    /** Chips for the states it is in, after its affiliation ("Simulated", "Live"). */
    states?: readonly TrackState[]
    /** One quiet line of what it is doing, such as its speed and heading. */
    detail?: ReactNode
    /** When it was last heard from, said as its freshness at the head's end; left out, no freshness is drawn. */
    updatedAt?: FreshnessTime | null
    /** The moment its freshness counts from; without it, the shared clock. */
    now?: FreshnessTime
    /** Where its freshness turns stale and lost. */
    freshness?: Partial<FreshnessThresholds>
    /** Makes the affiliation chip a menu of the affiliations, calling this with the one chosen. */
    onAffiliationChange?: (affiliation: TrackAffiliation) => void
    /** Makes the whole card one control, as picking the track on a map does. */
    onSelect?: () => void
    /** Draws the card as the one chosen. */
    selected?: boolean
    /** `false` draws it without its edge, ground and padding, as a row of a list that draws its own. */
    framed?: boolean
    words?: Partial<TrackCardWords & TrackNameWords & FreshnessWords>
    className?: string
}

/**
 * One track, densely: its kind's glyph in its affiliation's color and turned to its heading, its name
 * and id, its freshness at the head's end, and under them its affiliation as a chip (a menu of the
 * affiliations with `onAffiliationChange`), the states it is in as chips and a quiet line of detail.
 * A thumbnail may lead it. Given `onSelect` the whole card is a control, its chips still their own;
 * `framed={false}` drops the card's own edge for a list row, as `TrackRoster` draws it.
 */
export function TrackCard({
    name,
    code,
    kind,
    affiliation,
    heading,
    thumbnail,
    states,
    detail,
    updatedAt,
    now,
    freshness,
    onAffiliationChange,
    onSelect,
    selected = false,
    framed = true,
    words: given,
    className,
}: TrackCardProps) {
    const own = useWords(TRACK_CARD_PART)
    const names = useWords(TRACK_NAMES_PART)
    const words = { ...own, ...names, ...given }
    const affiliationName = words[affiliation]
    const mark = <Dot color={TRACK_COLORS[affiliation]} size="md" />
    return (
        <article
            data-slot="track-card"
            data-selected={selected || undefined}
            data-affiliation={affiliation}
            className={cn(
                'relative flex min-w-0 gap-2.5 text-sm text-card-foreground',
                framed && 'rounded-surface border border-border bg-card p-2.5',
                framed && onSelect !== undefined && 'hover:bg-hover',
                framed && selected && 'border-primary ring-1 ring-primary',
                className,
            )}
        >
            {onSelect !== undefined && (
                <button
                    type="button"
                    aria-pressed={selected}
                    onClick={onSelect}
                    data-slot="track-card-cover"
                    className="absolute inset-0 z-0 cursor-pointer rounded-surface outline-none focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid"
                >
                    <span className="sr-only">{name}</span>
                </button>
            )}
            {thumbnail !== undefined && (
                <div
                    data-slot="track-card-thumbnail"
                    className="pointer-events-none size-10 shrink-0 overflow-hidden rounded-control bg-muted [&>*]:size-full [&>img]:object-cover"
                >
                    {typeof thumbnail === 'string' ? <img src={thumbnail} alt="" /> : thumbnail}
                </div>
            )}
            <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1">
                <div data-slot="track-card-head" className="flex min-w-0 items-center gap-2">
                    <TrackGlyph kind={kind} affiliation={affiliation} heading={heading} size="md" label words={words} />
                    <span className="min-w-0 truncate font-medium">{name}</span>
                    {code !== undefined && code !== name && (
                        <span className="min-w-0 shrink-[2] truncate font-mono text-xs text-muted-foreground">{code}</span>
                    )}
                    {updatedAt !== undefined && (
                        <Freshness at={updatedAt} now={now} thresholds={freshness} words={words} className="ms-auto ps-1" />
                    )}
                </div>
                <div data-slot="track-card-chips" className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="pointer-events-auto relative z-1 flex min-w-0">
                        <Chip
                            icon={mark}
                            menu={
                                onAffiliationChange === undefined
                                    ? undefined
                                    : TRACK_AFFILIATIONS.map((each) => ({
                                          label: words[each],
                                          icon: <Dot color={TRACK_COLORS[each]} size="md" />,
                                          onSelect: () => {
                                              if (each !== affiliation) onAffiliationChange(each)
                                          },
                                      }))
                            }
                            selectLabel={onAffiliationChange === undefined ? undefined : words.changeAffiliation(affiliationName)}
                        >
                            {affiliationName}
                        </Chip>
                    </span>
                    {states?.map((state) => {
                        const label = typeof state === 'string' ? state : state.label
                        return (
                            <Chip key={label} tone={typeof state === 'string' ? 'outline' : (state.tone ?? 'outline')}>
                                {label}
                            </Chip>
                        )
                    })}
                    {detail !== undefined && <span className="min-w-0 truncate text-xs text-muted-foreground tabular-nums">{detail}</span>}
                </div>
            </div>
        </article>
    )
}
