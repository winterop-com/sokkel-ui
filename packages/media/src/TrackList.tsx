'use client'

import { Play, Volume2 } from 'lucide-react'
import * as React from 'react'
import { Fragment, lazy, memo, Suspense, useRef, useState, type ComponentProps, type ComponentType, type ReactNode, type Ref } from 'react'

import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { Link } from '@winterop-com/sokkel-ui/Link'
import { formatRemaining, formatTime } from '@winterop-com/sokkel-ui/media/time'
import { useWords, type WordMessages, type WordsPart } from '@winterop-com/sokkel-ui/lib/words'
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

export const TRACK_LIST_WORDS: TrackListWords = {
    play: (title) => `Play ${title}`,
    playing: 'Now playing',
    disc: (disc) => `Disc ${String(disc)}`,
}

/** Where a catalog holds a track list's words, and the arguments its phrases name. */
export const TRACK_LIST_PART: WordsPart<TrackListWords> = {
    id: 'trackList',
    words: TRACK_LIST_WORDS,
    args: { play: 'title', disc: 'disc' },
}

/** A track list's phrases as ICU messages in English, for the catalog. */
export const TRACK_LIST_MESSAGES: WordMessages<TrackListWords> = { play: 'Play {title}', disc: 'Disc {disc}' }

/** Whether the tracks lie on more than one disc, a track without one being on the first. */
function manyDiscs(tracks: readonly Track[]): boolean {
    return new Set(tracks.map((track) => track.disc ?? 1)).size > 1
}

/** A list longer than this draws only the rows in view, and a few around them, unless `windowed` says otherwise. */
export const TRACK_WINDOW_FROM = 200

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
    /** Draws each row's element in place of a plain `li`, given its props, as a list that drags does to make its rows draggable. */
    row?: ComponentType<TrackRowProps>
    /**
     * Makes a row a link to its own page, such as an episode's or a song's, drawn through the app's
     * `LinkProvider`; a track it gives no address stays a row that plays. With `onPlay` too, the
     * row's number or picture is the button that plays it.
     */
    href?: (track: Track) => string | undefined
    /**
     * Whether only the rows in view are drawn, and a few around them, for a list of thousands; by
     * default once the list is longer than `TRACK_WINDOW_FROM`. The current row and the one with the
     * focus are always drawn.
     */
    windowed?: boolean
    className?: string
    words?: Partial<TrackListWords>
}

/** What a list's `row` is given: the `li`'s own props, and the track it holds with its place. */
export type TrackRowProps = ComponentProps<'li'> & { track: Track; index: number }

function PlainRow({ track: _track, index: _index, ...props }: TrackRowProps) {
    return <li {...props} />
}

/** The rows a windowed list draws before its window has loaded, as on the server. */
const FIRST_ROWS = 40

/** A windowed list's window, fetched the first time a list is windowed. */
const Windowed = lazy(() => import('./track-window').then((module) => ({ default: module.windowedTrackList(React) })))

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
 *
 * `href` makes a row a link to its own page, such as an episode's: a press on the row opens it,
 * and with `onPlay` its number or picture is a button of its own that plays it, as `MediaCard`'s
 * cover links and its play button plays.
 *
 * A list longer than `TRACK_WINDOW_FROM` rows, or any with `windowed`, draws only the rows in view
 * of the box that scrolls it (or the page) and a few either side, each at its place, so a library of
 * thousands scrolls as lightly as an album; the current row and the focused one are always drawn, so
 * following and the keyboard keep their row. The window loads the first time a list is windowed, so
 * a short list never fetches it.
 *
 * A row draws again only when what it shows changes, so a `position` reported many times a second
 * draws the current row alone; `onPlay`, `actions`, `href` and `row` kept the same between draws
 * (made once, or with `useCallback`) keep it that way.
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
    row: Row = PlainRow,
    href,
    windowed = tracks.length > TRACK_WINDOW_FROM,
    className,
    words,
}: TrackListProps) {
    const said = useWords(TRACK_LIST_PART, words)
    const followed = useRef<HTMLLIElement | null>(null)
    // Keyed on the row being there too, so rows that arrive after `current` still bring it into view.
    const listed = current !== undefined && tracks.some((track) => track.id === current)
    // A windowed list follows once its window has measured its rows, so the current row is where it will stay.
    const [measured, setMeasured] = useState(false)
    useFollow(followed, listed ? current : undefined, { enabled: follow && listed && (!windowed || measured) })
    const discs = manyDiscs(tracks)
    /** The row at `index`, drawn by `Drawn`; drawn by the list.s own row, it is under its disc.s head, which the window draws itself. */
    const rowAt = (index: number, Drawn = Row) => {
        const track = tracks[index]
        const now = track.id === current
        const disc = track.disc ?? 1
        const opens = Drawn === Row && discs && (index === 0 || (tracks[index - 1].disc ?? 1) !== disc)
        return (
            <TrackRow
                key={track.id}
                track={track}
                index={index}
                now={now}
                playing={now && playing}
                played={now ? position : undefined}
                progress={progress}
                disc={opens ? said.disc(disc) : undefined}
                label={typeof track.title === 'string' ? said.play(track.title) : undefined}
                playingLabel={said.playing}
                variant={variant}
                artwork={artwork}
                Row={Drawn}
                onPlay={onPlay}
                link={href?.(track)}
                actions={actions}
                followed={now ? followed : undefined}
            />
        )
    }
    const box = cn(
        '@container flex min-w-0 flex-col',
        variant === 'boxed' && 'overflow-hidden rounded-surface border border-border-strong bg-card',
        className,
    )
    const plain = <ol className={box}>{(windowed ? tracks.slice(0, FIRST_ROWS) : tracks).map((_, index) => rowAt(index))}</ol>
    // A windowed list draws its first rows until its window is here.
    return windowed ? (
        <Suspense fallback={plain}>
            <Windowed
                tracks={tracks}
                current={current}
                onMeasured={setMeasured}
                rowAt={rowAt}
                headAt={(index, top) => (
                    <DiscHead key={-1 - index} index={index} variant={variant} top={top}>
                        {said.disc(tracks[index].disc ?? 1)}
                    </DiscHead>
                )}
                Row={Row}
                className={box}
            />
        </Suspense>
    ) : (
        plain
    )
}

interface TrackRowDrawProps {
    track: Track
    index: number
    now: boolean
    playing: boolean
    played: number | undefined
    progress: TrackProgress | undefined
    /** The disc's head drawn over the row, when it is the first of its disc. */
    disc: string | undefined
    label: string | undefined
    playingLabel: string
    variant: 'boxed' | 'plain'
    artwork: 'square' | 'wide'
    Row: ComponentType<TrackRowProps>
    onPlay: ((track: Track) => void) | undefined
    /** The row's own page, with `href`. */
    link: string | undefined
    actions: ((track: Track) => ReactNode) | undefined
    followed: Ref<HTMLLIElement> | undefined
}

/** One track's row, with the disc's head over it when it opens one; drawn again only when what it shows changes. */
const TrackRow = memo(function TrackRow({
    track,
    index,
    now,
    playing,
    played,
    progress,
    disc,
    label,
    playingLabel,
    variant,
    artwork,
    Row,
    onPlay,
    link,
    actions,
    followed,
}: TrackRowDrawProps) {
    const bar = progress === 'bar' && played !== undefined && track.duration > 0
    const play = onPlay === undefined ? undefined : () => onPlay(track)
    const pad = variant === 'boxed' ? 'pl-(--density-panel-pad)' : 'pl-2'
    const lead = <Lead track={track} now={now} playing={playing} shape={artwork} label={playingLabel} />
    const body = (
        <>
            <span className="min-w-0 flex-1">
                <span className={cn('block truncate', now ? 'font-medium text-primary-ink' : 'text-foreground')}>{track.title}</span>
                {track.subtitle !== undefined && <span className="block truncate text-xs text-muted-foreground">{track.subtitle}</span>}
            </span>
            {track.meta !== undefined && (
                <span className="hidden w-[28%] min-w-0 truncate text-sm text-muted-foreground @xl:block">{track.meta}</span>
            )}
            <span className="min-w-12 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
                {progress === 'left' && played !== undefined ? formatRemaining(played, track.duration) : formatTime(track.duration)}
            </span>
        </>
    )
    const button = (
        <button
            type="button"
            aria-current={now || undefined}
            aria-label={label}
            onClick={play}
            className={cn(TRACK_BODY, pad, play !== undefined && 'cursor-pointer')}
        >
            {lead}
            {body}
        </button>
    )
    return (
        <Fragment>
            {disc !== undefined && (
                <DiscHead index={index} variant={variant}>
                    {disc}
                </DiscHead>
            )}
            <Row
                track={track}
                index={index}
                ref={followed}
                className={cn(
                    'flex min-w-0 items-center gap-1 pr-2',
                    bar && 'relative overflow-hidden',
                    variant === 'boxed' && 'border-b border-border last:border-b-0',
                    variant === 'plain' && 'rounded-control',
                    now ? 'bg-secondary' : (onPlay !== undefined || link !== undefined) && 'has-[>:is(a,button):hover]:bg-hover',
                )}
            >
                {link === undefined ? (
                    button
                ) : (
                    <>
                        {play === undefined ? (
                            <span className={cn('flex shrink-0 items-center self-stretch', pad)}>{lead}</span>
                        ) : (
                            <button
                                type="button"
                                aria-label={label}
                                onClick={play}
                                className={cn(
                                    'flex shrink-0 cursor-pointer items-center self-stretch outline-none focus-visible:bg-hover',
                                    pad,
                                )}
                            >
                                {lead}
                            </button>
                        )}
                        <Link href={link} aria-current={now || undefined} draggable={false} className={cn(TRACK_BODY, 'pl-2')}>
                            {body}
                        </Link>
                    </>
                )}
                {actions !== undefined && <span className="flex shrink-0 items-center gap-0.5 pl-1">{actions(track)}</span>}
                {bar && (
                    <span
                        aria-hidden
                        data-slot="track-progress"
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary"
                        style={{ transform: `scaleX(${String(Math.min(1, Math.max(0, played / track.duration)))})` }}
                    />
                )}
            </Row>
        </Fragment>
    )
})

/** A disc's head over its first track, at `top` in a windowed list. */
function DiscHead({ index, variant, top, children }: { index: number; variant: 'boxed' | 'plain'; top?: number; children: ReactNode }) {
    return (
        <li
            role="presentation"
            data-slot="track-list-disc"
            className={cn(
                'pt-2.5 pr-2 pb-1.5',
                variant === 'boxed' ? 'border-b border-border pl-(--density-panel-pad)' : 'pl-2',
                index > 0 && variant === 'plain' && 'pt-4',
            )}
            style={top === undefined ? undefined : { position: 'absolute', left: 0, right: 0, top }}
        >
            <GroupLabel as="span">{children}</GroupLabel>
        </li>
    )
}

/** A row's body, the button that plays it or a linked row's link. */
const TRACK_BODY =
    'flex min-h-(--density-row) min-w-0 flex-1 items-center gap-3 py-1.5 text-left text-sm outline-none focus-visible:bg-hover'

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
