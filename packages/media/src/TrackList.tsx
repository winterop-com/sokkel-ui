import { Play, Volume2 } from 'lucide-react'
import {
    Fragment,
    memo,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type ComponentProps,
    type ComponentType,
    type FocusEvent,
    type ReactNode,
    type Ref,
} from 'react'

import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { Link } from '@winterop-com/sokkel-ui/Link'
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

/** A list longer than this draws only the rows in view, and a few around them, unless `windowed` says otherwise. */
export const TRACK_WINDOW_FROM = 200

/** Rows drawn above and below those in view, so a quick scroll never shows an empty stretch. */
const OVERSCAN = 12

/** The nearest box around `element` that scrolls, or none for the page. */
function scrollerOf(element: HTMLElement): HTMLElement | null {
    for (let node = element.parentElement; node !== null; node = node.parentElement) {
        const overflow = getComputedStyle(node).overflowY
        if (overflow === 'auto' || overflow === 'scroll') return node
    }
    return null
}

/**
 * Where each row of a windowed list starts, in pixels from the list's top, with the disc's head over
 * a row that opens one, and the list's whole height: rows `row` tall and heads `head` tall.
 */
export function trackTops(heads: readonly boolean[], row: number, head: number): { tops: number[]; height: number } {
    const tops: number[] = []
    let at = 0
    for (const opens of heads) {
        tops.push(at)
        at += (opens ? head : 0) + row
    }
    return { tops, height: at }
}

/** The rows a windowed list draws for a view from `start`, `height` tall: those in it and `OVERSCAN` either side. */
export function trackRange(tops: readonly number[], start: number, height: number): { first: number; last: number } {
    // The last row starting at or above the view's top, found by halving.
    let low = 0
    let high = tops.length - 1
    while (low < high) {
        const middle = Math.ceil((low + high) / 2)
        if (tops[middle] <= start) low = middle
        else high = middle - 1
    }
    let last = low
    while (last < tops.length && tops[last] < start + height) last++
    return { first: Math.max(0, low - OVERSCAN), last: Math.min(tops.length, last + OVERSCAN) }
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
 * following and the keyboard keep their row.
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
    const said = { ...WORDS, ...words }
    const followed = useRef<HTMLLIElement | null>(null)
    const list = useRef<HTMLOListElement | null>(null)
    const currentAt = current === undefined ? -1 : tracks.findIndex((track) => track.id === current)
    const discs = manyDiscs(tracks)
    const heads = useMemo(
        () => tracks.map((track, index) => discs && (index === 0 || (tracks[index - 1].disc ?? 1) !== (track.disc ?? 1))),
        [tracks, discs],
    )

    // Windowed, the rows are placed by a row's and a head's measured heights, and drawn for the view of the box around the list.
    const [sizes, setSizes] = useState({ row: 48, head: 36, measured: false })
    // Keyed on the row being there too, so rows that arrive after `current` still bring it into view;
    // a windowed list follows once its rows are measured, so the current row is where it will stay.
    const listed = currentAt !== -1
    useFollow(followed, listed ? current : undefined, { enabled: follow && listed && (!windowed || sizes.measured) })
    const [view, setView] = useState({ start: 0, height: 800 })
    const [focusAt, setFocusAt] = useState(-1)
    const measureNow = useRef<() => void>(() => undefined)
    useLayoutEffect(() => {
        const element = list.current
        if (!windowed || element === null) return
        const box = scrollerOf(element)
        const measure = () => {
            const row = element.querySelector<HTMLElement>(':scope > [data-track-index]')?.offsetHeight ?? 0
            const head = element.querySelector<HTMLElement>(':scope > [data-slot="track-list-disc"]')?.offsetHeight ?? 0
            setSizes((now) => {
                const next = { row: row > 0 ? row : now.row, head: head > 0 ? head : now.head, measured: now.measured || row > 0 }
                return next.row === now.row && next.head === now.head && next.measured === now.measured ? now : next
            })
            const top = box === null ? 0 : box.getBoundingClientRect().top
            const next = { start: top - element.getBoundingClientRect().top, height: box === null ? window.innerHeight : box.clientHeight }
            setView((now) => (now.start === next.start && now.height === next.height ? now : next))
        }
        measureNow.current = measure
        let frame = 0
        const later = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(measure)
        }
        measure()
        const target = box ?? window
        target.addEventListener('scroll', later, { passive: true })
        window.addEventListener('resize', later)
        const observer = new ResizeObserver(later)
        observer.observe(box ?? document.documentElement)
        return () => {
            cancelAnimationFrame(frame)
            target.removeEventListener('scroll', later)
            window.removeEventListener('resize', later)
            observer.disconnect()
        }
    }, [windowed])
    const placed = useMemo(() => (windowed ? trackTops(heads, sizes.row, sizes.head) : undefined), [windowed, heads, sizes.row, sizes.head])
    const range = placed === undefined ? { first: 0, last: tracks.length } : trackRange(placed.tops, view.start, view.height)
    // The current row and the focused one stay drawn in their places, wherever the view is.
    const kept = [currentAt, focusAt].filter((at) => at >= 0 && at < tracks.length && (at < range.first || at >= range.last))
    const shown = [...new Set([...kept, ...Array.from({ length: range.last - range.first }, (_, offset) => range.first + offset)])].sort(
        (a, b) => a - b,
    )
    const focusIn = (event: FocusEvent<HTMLOListElement>) => {
        if (!windowed || !(event.target instanceof Element)) return
        const at = Number(event.target.closest('[data-track-index]')?.getAttribute('data-track-index') ?? -1)
        setFocusAt(at)
        // A row the focus reached has been scrolled into view already: the rows past it are drawn at once, so the next key finds them.
        measureNow.current()
    }
    const focusOut = (event: FocusEvent<HTMLOListElement>) => {
        if (windowed && !(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setFocusAt(-1)
    }
    return (
        <ol
            ref={list}
            onFocus={focusIn}
            onBlur={focusOut}
            className={cn(
                '@container flex min-w-0 flex-col',
                placed !== undefined && 'relative',
                variant === 'boxed' && 'overflow-hidden rounded-surface border border-border-strong bg-card',
                className,
            )}
            style={placed === undefined ? undefined : { height: placed.height }}
        >
            {shown.map((index) => {
                const track = tracks[index]
                const now = index === currentAt
                return (
                    <TrackRow
                        key={track.id}
                        track={track}
                        index={index}
                        last={index === tracks.length - 1}
                        top={placed?.tops[index]}
                        headHeight={sizes.head}
                        now={now}
                        playing={now && playing}
                        played={now ? position : undefined}
                        progress={progress}
                        disc={heads[index] ? said.disc(track.disc ?? 1) : undefined}
                        label={typeof track.title === 'string' ? said.play(track.title) : undefined}
                        playingLabel={said.playing}
                        variant={variant}
                        artwork={artwork}
                        Row={Row}
                        onPlay={onPlay}
                        href={href}
                        actions={actions}
                        followed={now ? followed : undefined}
                    />
                )
            })}
        </ol>
    )
}

interface TrackRowDrawProps {
    track: Track
    index: number
    /** Whether it is the list's last row, which draws no rule under it. */
    last: boolean
    /** Where a windowed list places the row (its disc's head over it), in pixels from the list's top. */
    top: number | undefined
    /** The height of a disc's head, which a windowed row opening a disc is placed under. */
    headHeight: number
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
    href: ((track: Track) => string | undefined) | undefined
    actions: ((track: Track) => ReactNode) | undefined
    followed: Ref<HTMLLIElement> | undefined
}

/** One track's row, with the disc's head over it when it opens one; drawn again only when what it shows changes. */
const TrackRow = memo(function TrackRow({
    track,
    index,
    last,
    top,
    headHeight,
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
    href,
    actions,
    followed,
}: TrackRowDrawProps) {
    const bar = progress === 'bar' && played !== undefined && track.duration > 0
    const placed = top !== undefined
    const link = href?.(track)
    const play = onPlay === undefined ? undefined : () => onPlay(track)
    const pad = variant === 'boxed' ? 'pl-(--density-panel-pad)' : 'pl-2'
    const lead = <Lead track={track} now={now} playing={playing} shape={artwork} label={playingLabel} />
    const words = (
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
    const body = 'flex min-h-(--density-row) min-w-0 flex-1 items-center gap-3 py-1.5 text-left text-sm outline-none focus-visible:bg-hover'
    return (
        <Fragment>
            {disc !== undefined && (
                <li
                    role="presentation"
                    data-slot="track-list-disc"
                    className={cn(
                        'pt-2.5 pr-2 pb-1.5',
                        placed && 'absolute inset-x-0',
                        variant === 'boxed' ? 'border-b border-border pl-(--density-panel-pad)' : 'pl-2',
                        index > 0 && variant === 'plain' && 'pt-4',
                    )}
                    style={placed ? { top } : undefined}
                >
                    <GroupLabel as="span">{disc}</GroupLabel>
                </li>
            )}
            <Row
                track={track}
                index={index}
                ref={followed}
                data-track-index={index}
                className={cn(
                    'flex min-w-0 items-center gap-1 pr-2',
                    bar && 'relative overflow-hidden',
                    placed && 'absolute inset-x-0',
                    variant === 'boxed' && !last && 'border-b border-border',
                    variant === 'plain' && 'rounded-control',
                    now
                        ? 'bg-secondary'
                        : (onPlay !== undefined || link !== undefined) && 'has-[>a:hover]:bg-hover has-[>button:hover]:bg-hover',
                )}
                style={placed ? { top: top + (disc === undefined ? 0 : headHeight) } : undefined}
            >
                {link === undefined ? (
                    <button
                        type="button"
                        aria-current={now || undefined}
                        aria-label={label}
                        onClick={play}
                        className={cn(body, pad, onPlay !== undefined && 'cursor-pointer')}
                    >
                        {lead}
                        {words}
                    </button>
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
                        <Link href={link} aria-current={now || undefined} draggable={false} className={cn(body, 'pl-2')}>
                            {words}
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
