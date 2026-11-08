import { Play, Volume2 } from 'lucide-react'
import { Fragment, useRef, type ReactNode } from 'react'

import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { formatRemaining, formatTime } from '@winterop-com/sokkel-ui/media/time'
import { useFollow } from './use-follow'

/** One row of a track list. */
export interface Track {
    id: string
    title: ReactNode
    /** A second line under the title, such as the artist where it differs from the album's. */
    subtitle?: ReactNode
    /** The number at the row's start, such as the track's place on its album. */
    number?: ReactNode
    /** A picture at the row's start, in place of the number. */
    artwork?: ReactNode
    /** A quiet column before the length, such as the album; it folds away when the list is narrow. */
    meta?: ReactNode
    /** Length in seconds. */
    duration: number
    /** The disc of a set it is on, counted from 1; a list over more than one disc is headed by each. */
    disc?: number
}

/** The words the list says, each with an English default. */
export interface TrackListWords {
    play: (title: string) => string
    playing: string
    /** The head over a disc's tracks, such as "Disc 2". */
    disc: (disc: number) => string
}

const WORDS: TrackListWords = { play: (title) => `Play ${title}`, playing: 'Now playing', disc: (disc) => `Disc ${String(disc)}` }

/** Whether the tracks lie on more than one disc, a track without one being on the first. */
function manyDiscs(tracks: readonly Track[]): boolean {
    return new Set(tracks.map((track) => track.disc ?? 1)).size > 1
}

/** What the current row shows of how far it has played: the time left in place of its length, or a line along its foot. */
export type TrackProgress = 'left' | 'bar'

export interface TrackListProps {
    tracks: readonly Track[]
    /** The id of the row that is playing or paused. */
    current?: string
    playing?: boolean
    /** Seconds played into the current row, which `progress` shows. */
    position?: number
    progress?: TrackProgress
    /** Whether the current row is kept in view as it changes. */
    follow?: boolean
    onPlay?: (track: Track) => void
    /** A row's own controls, drawn at its end. */
    actions?: (track: Track) => ReactNode
    variant?: 'boxed' | 'plain'
    artwork?: 'square' | 'wide'
    className?: string
    words?: Partial<TrackListWords>
}

/**
 * A list of tracks or episodes: the number or a small picture, the title over an optional second
 * line, a quiet meta column, and the length in the code face at the end.
 *
 * The `current` row is marked for assistive technology and drawn in the accent ink, its number
 * replaced by a speaker while `playing` and by a play glyph while paused. `boxed`, the default,
 * draws the list in its own bordered surface; `plain` leaves it on the ground it is placed on,
 * as a side panel wants. `artwork` sets the picture's shape: square for covers, wide for video
 * frames. `actions` draws a row's own controls at its end, after the length, such as adding the
 * track to the queue and a `StarButton`; they stay in view rather than waiting for a hover, so a
 * starred row shows its star. Pointing at a row's track washes the whole row, its actions
 * included, so the row reads as the one a press plays.
 *
 * The current row is kept in view in the box that scrolls the list, or the page: brought to the
 * middle on the first draw and whenever it changes, only when it is out of view, and never while
 * the reader is scrolling or just after; `follow={false}` leaves the scrolling to the reader. With
 * the `position` played into it, `progress` shows how far the current row has played: `left` the
 * time still to play in place of its length, `bar` a line along its foot.
 *
 * An album of several discs gives each track its `disc`: the list then puts a head ("Disc 1",
 * "Disc 2") over the first track of each disc it reaches, in the order the tracks are given. A
 * list on one disc draws no head.
 */
export function TrackList({
    tracks,
    current,
    playing = false,
    position,
    progress,
    follow = true,
    onPlay,
    actions,
    variant = 'boxed',
    artwork = 'square',
    className,
    words,
}: TrackListProps) {
    const said = { ...WORDS, ...words }
    const row = useRef<HTMLLIElement | null>(null)
    useFollow(row, current, { enabled: follow && current !== undefined })
    const discs = manyDiscs(tracks)
    return (
        <ol
            className={cn(
                '@container flex min-w-0 flex-col',
                variant === 'boxed' && 'overflow-hidden rounded-surface border border-border-strong bg-card',
                className,
            )}
        >
            {tracks.map((track, index) => {
                const now = track.id === current
                const disc = track.disc ?? 1
                const opens = discs && (index === 0 || (tracks[index - 1].disc ?? 1) !== disc)
                const label = typeof track.title === 'string' ? said.play(track.title) : undefined
                const played = now && position !== undefined ? position : undefined
                const bar = progress === 'bar' && played !== undefined && track.duration > 0
                return (
                    <Fragment key={track.id}>
                        {opens && (
                            <li
                                role="presentation"
                                data-slot="track-list-disc"
                                className={cn(
                                    'pt-2.5 pr-2 pb-1.5',
                                    variant === 'boxed' ? 'border-b border-border pl-(--density-panel-pad)' : 'pl-2',
                                    index > 0 && variant === 'plain' && 'pt-4',
                                )}
                            >
                                <GroupLabel as="span">{said.disc(disc)}</GroupLabel>
                            </li>
                        )}
                        <li
                            ref={now ? row : undefined}
                            className={cn(
                                'flex min-w-0 items-center gap-1 pr-2',
                                bar && 'relative overflow-hidden',
                                variant === 'boxed' && 'border-b border-border last:border-b-0',
                                variant === 'plain' && 'rounded-control',
                                now ? 'bg-secondary' : onPlay !== undefined && 'has-[>button:hover]:bg-hover',
                            )}
                        >
                            <button
                                type="button"
                                aria-current={now || undefined}
                                aria-label={label}
                                onClick={onPlay === undefined ? undefined : () => onPlay(track)}
                                className={cn(
                                    'flex min-h-(--density-row) min-w-0 flex-1 items-center gap-3 py-1.5 text-left text-sm outline-none focus-visible:bg-hover',
                                    variant === 'boxed' ? 'pl-(--density-panel-pad)' : 'pl-2',
                                    onPlay !== undefined && 'cursor-pointer',
                                )}
                            >
                                <Lead track={track} now={now} playing={playing} shape={artwork} label={said.playing} />
                                <span className="min-w-0 flex-1">
                                    <span className={cn('block truncate', now ? 'font-medium text-primary-ink' : 'text-foreground')}>
                                        {track.title}
                                    </span>
                                    {track.subtitle !== undefined && (
                                        <span className="block truncate text-xs text-muted-foreground">{track.subtitle}</span>
                                    )}
                                </span>
                                {track.meta !== undefined && (
                                    <span className="hidden w-[28%] min-w-0 truncate text-sm text-muted-foreground @xl:block">
                                        {track.meta}
                                    </span>
                                )}
                                <span className="min-w-12 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
                                    {progress === 'left' && played !== undefined
                                        ? formatRemaining(played, track.duration)
                                        : formatTime(track.duration)}
                                </span>
                            </button>
                            {actions !== undefined && <span className="flex shrink-0 items-center gap-0.5 pl-1">{actions(track)}</span>}
                            {bar && (
                                <span
                                    aria-hidden
                                    data-slot="track-progress"
                                    className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary"
                                    style={{ transform: `scaleX(${String(Math.min(1, Math.max(0, played / track.duration)))})` }}
                                />
                            )}
                        </li>
                    </Fragment>
                )
            })}
        </ol>
    )
}

/** The row's start: its picture, or its number, or the playing mark in its place. */
function Lead({
    track,
    now,
    playing,
    shape,
    label,
}: {
    track: Track
    now: boolean
    playing: boolean
    shape: 'square' | 'wide'
    label: string
}) {
    const mark = playing ? <Volume2 className="size-3.5" aria-hidden /> : <Play className="size-3.5 fill-current" aria-hidden />
    if (track.artwork !== undefined) {
        return (
            <span
                className={cn(
                    'relative flex shrink-0 overflow-hidden rounded-mini bg-muted [&>svg]:block [&>svg]:size-full',
                    shape === 'wide' ? 'h-9 w-16' : 'size-9',
                )}
            >
                {track.artwork}
                {now && (
                    <span className="absolute inset-0 flex items-center justify-center bg-scrim text-terminal-foreground" title={label}>
                        {mark}
                    </span>
                )}
            </span>
        )
    }
    return (
        <span className="flex w-6 shrink-0 justify-end text-xs text-muted-foreground tabular-nums">
            {now ? (
                <span className="text-primary-ink" title={label}>
                    {mark}
                </span>
            ) : (
                track.number
            )}
        </span>
    )
}
