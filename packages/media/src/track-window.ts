import type * as ReactModule from 'react'
import type { ComponentType, FocusEvent, ReactNode } from 'react'

import type { Track, TrackRowProps } from './TrackList'

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

/** Whether each track opens a disc's head: the first of each disc, on a list over more than one disc. */
export function discHeads(tracks: readonly Track[]): boolean[] {
    const many = new Set(tracks.map((track) => track.disc ?? 1)).size > 1
    return tracks.map((track, index) => many && (index === 0 || (tracks[index - 1].disc ?? 1) !== (track.disc ?? 1)))
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

export interface WindowedTrackListProps {
    tracks: readonly Track[]
    current: string | undefined
    /** Called once the rows are measured and placed, from when the current row can be followed. */
    onMeasured: (measured: boolean) => void
    /** Draws the row at an index with a row element other than the list.s own, without its disc.s head. */
    rowAt: (index: number, Row: ComponentType<TrackRowProps>) => ReactNode
    /** Draws the disc's head over the row at an index, at `top`. */
    headAt: (index: number, top: number) => ReactNode
    Row: ComponentType<TrackRowProps>
    className: string
}

/**
 * Makes the windowed track list with the page's own React (`R`): a list drawn in part, only the rows
 * in view of the box that scrolls it (or the page) and `OVERSCAN` either side, each placed by a
 * row's and a disc head's measured heights, the current row and the focused one always drawn.
 * `TrackList` loads this module the first time a list is windowed and draws the rows and heads; the
 * module imports nothing at all, so loading it later splits none of the page's start into chunks.
 */
export function windowedTrackList(R: typeof ReactModule): ComponentType<WindowedTrackListProps> {
    const h = R.createElement
    /** Where each drawn row goes, and the app's own row element, for `PlacedRow`. */
    const Placing = R.createContext<{ top: (index: number) => number; Row: ComponentType<TrackRowProps> } | null>(null)

    /** A list's row element placed at its row's top, marked with its place for the focus to be kept. */
    function PlacedRow({ style, ...props }: TrackRowProps) {
        const placing = R.useContext(Placing)
        return h(placing?.Row ?? 'li', {
            ...props,
            'data-track-index': props.index,
            style: { ...style, position: 'absolute', left: 0, right: 0, top: placing?.top(props.index) },
        } as TrackRowProps)
    }

    return function WindowedTrackList({ tracks, current, onMeasured, rowAt, headAt, Row, className }: WindowedTrackListProps) {
        const list = R.useRef<HTMLOListElement | null>(null)
        const heads = R.useMemo(() => discHeads(tracks), [tracks])
        const currentAt = current === undefined ? -1 : tracks.findIndex((track) => track.id === current)
        const [sizes, setSizes] = R.useState({ row: 48, head: 36, measured: false })
        const [view, setView] = R.useState({ start: 0, height: 800 })
        const [focusAt, setFocusAt] = R.useState(-1)
        const measureNow = R.useRef<() => void>(() => undefined)
        const measured = sizes.measured
        R.useEffect(() => {
            onMeasured(measured)
        }, [measured, onMeasured])
        R.useLayoutEffect(() => {
            const element = list.current
            if (element === null) return
            const box = scrollerOf(element)
            const measure = () => {
                const row = element.querySelector<HTMLElement>(':scope > [data-track-index]')?.offsetHeight ?? 0
                const head = element.querySelector<HTMLElement>(':scope > [data-slot="track-list-disc"]')?.offsetHeight ?? 0
                setSizes((now) => {
                    const next = { row: row > 0 ? row : now.row, head: head > 0 ? head : now.head, measured: now.measured || row > 0 }
                    return next.row === now.row && next.head === now.head && next.measured === now.measured ? now : next
                })
                const top = box === null ? 0 : box.getBoundingClientRect().top
                const next = {
                    start: top - element.getBoundingClientRect().top,
                    height: box === null ? window.innerHeight : box.clientHeight,
                }
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
        }, [])
        const placed = R.useMemo(() => trackTops(heads, sizes.row, sizes.head), [heads, sizes.row, sizes.head])
        const placing = R.useMemo(
            () => ({ top: (index: number) => placed.tops[index] + (heads[index] ? sizes.head : 0), Row }),
            [placed, heads, sizes.head, Row],
        )
        const range = trackRange(placed.tops, view.start, view.height)
        // The current row and the focused one stay drawn in their places, wherever the view is.
        const kept = [currentAt, focusAt].filter((at) => at >= 0 && at < tracks.length && (at < range.first || at >= range.last))
        const shown = [
            ...new Set([...kept, ...Array.from({ length: range.last - range.first }, (_, offset) => range.first + offset)]),
        ].sort((a, b) => a - b)
        const focusIn = (event: FocusEvent<HTMLOListElement>) => {
            if (!(event.target instanceof Element)) return
            setFocusAt(Number(event.target.closest('[data-track-index]')?.getAttribute('data-track-index') ?? -1))
            // A row the focus reached has been scrolled into view already: the rows past it are drawn at once, so the next key finds them.
            measureNow.current()
        }
        const focusOut = (event: FocusEvent<HTMLOListElement>) => {
            if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setFocusAt(-1)
        }
        return h(
            Placing.Provider,
            { value: placing },
            h(
                'ol',
                { ref: list, onFocus: focusIn, onBlur: focusOut, className, style: { position: 'relative', height: placed.height } },
                shown.flatMap((index) => [heads[index] && headAt(index, placed.tops[index]), rowAt(index, PlacedRow)]),
            ),
        )
    }
}
