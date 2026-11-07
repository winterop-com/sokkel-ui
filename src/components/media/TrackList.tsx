import { Play, Volume2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { formatTime } from './time'

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
}

/** The words the list says, each with an English default. */
export interface TrackListWords {
    play: (title: string) => string
    playing: string
}

const WORDS: TrackListWords = { play: (title) => `Play ${title}`, playing: 'Now playing' }

/**
 * A list of tracks or episodes: the number or a small picture, the title over an optional second
 * line, a quiet meta column, and the length in the code face at the end.
 *
 * The `current` row is marked for assistive technology and drawn in the accent ink, its number
 * replaced by a speaker while `playing` and by a play glyph while paused. `boxed`, the default,
 * draws the list in its own bordered surface; `plain` leaves it on the ground it is placed on,
 * as a side panel wants. `artwork` sets the picture's shape: square for covers, wide for video
 * frames. `actions` draws controls at each row's end, after the length.
 */
export function TrackList({
    tracks,
    current,
    playing = false,
    onPlay,
    actions,
    variant = 'boxed',
    artwork = 'square',
    className,
    words,
}: {
    tracks: readonly Track[]
    /** The id of the row that is playing or paused. */
    current?: string
    playing?: boolean
    onPlay?: (track: Track) => void
    actions?: (track: Track) => ReactNode
    variant?: 'boxed' | 'plain'
    artwork?: 'square' | 'wide'
    className?: string
    words?: Partial<TrackListWords>
}) {
    const said = { ...WORDS, ...words }
    return (
        <ol
            className={cn(
                '@container flex min-w-0 flex-col',
                variant === 'boxed' && 'overflow-hidden rounded-surface border border-border-strong bg-card',
                className,
            )}
        >
            {tracks.map((track) => {
                const now = track.id === current
                const label = typeof track.title === 'string' ? said.play(track.title) : undefined
                return (
                    <li
                        key={track.id}
                        className={cn(
                            'group/track flex min-w-0 items-center gap-1 pr-2',
                            variant === 'boxed' && 'border-b border-border last:border-b-0',
                            variant === 'plain' && 'rounded-control',
                            now && 'bg-secondary',
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
                            <span className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
                                {formatTime(track.duration)}
                            </span>
                        </button>
                        {actions !== undefined && <span className="flex shrink-0 items-center">{actions(track)}</span>}
                    </li>
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
