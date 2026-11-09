import { GripVertical } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { TrackList, type Track, type TrackListProps, type TrackListWords } from './TrackList'

export type { Track } from './TrackList'

/** The words a reorderable list says beyond a track list's, each with an English default. */
export interface ReorderableTrackListWords extends TrackListWords {
    /** The grip's name: what a drag or the arrow keys on it move. */
    move: (title: string) => string
    /** Said to a screen reader once a row is moved, with its new place counted from 1. */
    moved: (title: string, place: number, count: number) => string
}

const WORDS: Pick<ReorderableTrackListWords, 'move' | 'moved'> = {
    move: (title) => `Move ${title}`,
    moved: (title, place, count) => `${title} moved to ${String(place)} of ${String(count)}`,
}

export interface ReorderableTrackListProps extends Omit<TrackListProps, 'words'> {
    /** Moves the track at `from` to `to`, both indexes into `tracks`; the list draws the order it is given. */
    onMove: (from: number, to: number) => void
    words?: Partial<ReorderableTrackListWords>
}

/** How close to a scroller's edge, in pixels, a dragged row scrolls it. */
const EDGE = 48
/** The most a scroller moves on one frame while a row is held at its edge, in pixels. */
const STEP = 14
/** What the held row wears while it is dragged: lifted over the rest. */
const LIFTED = ['relative', 'z-10', 'bg-card', 'shadow-md']

/** How far the row at `index` moves aside, in rows, while the row at `from` is held over `to`. */
export function shiftOf(index: number, from: number, to: number): -1 | 0 | 1 {
    if (index === from) return 0
    if (from < to && index > from && index <= to) return -1
    if (to < from && index >= to && index < from) return 1
    return 0
}

/**
 * Where the held row lands: the index among the rows whose middles its own middle has passed,
 * given each row's top and height in the list, the row held and how far it has moved.
 */
export function landingOf(rows: readonly { top: number; height: number }[], from: number, offset: number): number {
    const held = rows[from]
    if (held === undefined) return from
    const middle = held.top + held.height / 2 + offset
    let to = 0
    rows.forEach((row, index) => {
        if (index !== from && row.top + row.height / 2 < middle) to += 1
    })
    return to
}

/** The nearest box around `element` that scrolls, or the page. */
function scrollerOf(element: HTMLElement): HTMLElement {
    for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
        const { overflowY } = getComputedStyle(parent)
        if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) return parent
    }
    return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

/**
 * A track list the listener puts in their own order, such as a playlist or what a queue plays
 * next: a `TrackList` whose rows each end in a grip after their own `actions`. Dragging the grip
 * lifts the row and moves the rest aside to show where it lands, scrolling the box around it at
 * its edges; letting go calls `onMove(from, to)`, and Escape puts it back. With the grip focused,
 * the up and down arrows move the row one place, the focus following it, and a screen reader is
 * told its new place. It draws no disc heads, an order of one's own having no discs.
 */
export function ReorderableTrackList({ tracks, onMove, actions, words: given, ...list }: ReorderableTrackListProps) {
    const words = { ...WORDS, ...given }
    const grips = useRef(new Map<string, HTMLButtonElement>())
    const [said, setSaid] = useState('')
    // The track whose grip had the focus as it moved, to hand the focus back once it is drawn in its new place.
    const refocus = useRef<string | null>(null)
    useLayoutEffect(() => {
        if (refocus.current === null) return
        grips.current.get(refocus.current)?.focus()
        refocus.current = null
    })

    const titleOf = (track: Track) => (typeof track.title === 'string' ? track.title : '')

    const move = (from: number, to: number) => {
        const track = tracks[from]
        if (track === undefined || to === from || to < 0 || to >= tracks.length) return
        refocus.current = document.activeElement === grips.current.get(track.id) ? track.id : null
        onMove(from, to)
        setSaid(words.moved(titleOf(track), to + 1, tracks.length))
    }

    // The drag moves the rows by their styles alone, so a pointer's move draws nothing through React.
    const start = (event: PointerEvent<HTMLButtonElement>, from: number) => {
        const grip = event.currentTarget
        const element = grip.closest('ol')
        if (event.button !== 0 || element === null) return
        event.preventDefault()
        grip.setPointerCapture(event.pointerId)
        const rows = [...element.children] as HTMLElement[]
        const held = rows[from]
        if (held === undefined) return
        const top = element.getBoundingClientRect().top
        const boxes = rows.map((row) => {
            const box = row.getBoundingClientRect()
            return { top: box.top - top, height: box.height }
        })
        const lift = boxes[from]?.height ?? 0
        const scroller = scrollerOf(element)
        const startY = event.clientY
        let pointerY = startY
        let frame = 0
        let landing = from
        held.classList.add(...LIFTED)
        const draw = () => {
            const offset = pointerY - element.getBoundingClientRect().top - (startY - top)
            landing = landingOf(boxes, from, offset)
            rows.forEach((row, index) => {
                if (index === from) row.style.transform = `translateY(${String(offset)}px)`
                else {
                    row.style.transition = 'transform 150ms ease'
                    row.style.transform = `translateY(${String(shiftOf(index, from, landing) * lift)}px)`
                }
            })
        }
        // Held near the scroller's edge, the row scrolls it, a little more each frame the nearer it is.
        const edge = () => {
            const box = scroller === document.documentElement ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect()
            const by =
                pointerY < box.top + EDGE
                    ? -Math.ceil(((box.top + EDGE - pointerY) / EDGE) * STEP)
                    : pointerY > box.bottom - EDGE
                      ? Math.ceil(((pointerY - box.bottom + EDGE) / EDGE) * STEP)
                      : 0
            if (by !== 0) {
                scroller.scrollTop += by
                draw()
            }
            frame = requestAnimationFrame(edge)
        }
        const follow = (next: globalThis.PointerEvent) => {
            pointerY = next.clientY
            draw()
        }
        const finish = (keep: boolean) => {
            cancelAnimationFrame(frame)
            grip.removeEventListener('pointermove', follow)
            grip.removeEventListener('pointerup', up)
            grip.removeEventListener('pointercancel', cancel)
            window.removeEventListener('keydown', escape, true)
            held.classList.remove(...LIFTED)
            for (const row of rows) {
                row.style.transform = ''
                row.style.transition = ''
            }
            if (keep) move(from, landing)
        }
        const up = () => finish(true)
        const cancel = () => finish(false)
        const escape = (key: globalThis.KeyboardEvent) => {
            if (key.key !== 'Escape') return
            key.preventDefault()
            key.stopPropagation()
            finish(false)
        }
        grip.addEventListener('pointermove', follow)
        grip.addEventListener('pointerup', up)
        grip.addEventListener('pointercancel', cancel)
        window.addEventListener('keydown', escape, true)
        frame = requestAnimationFrame(edge)
        draw()
    }

    const keyed = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const to = event.key === 'ArrowUp' ? index - 1 : event.key === 'ArrowDown' ? index + 1 : undefined
        if (to === undefined || event.altKey || event.metaKey || event.ctrlKey) return
        event.preventDefault()
        move(index, to)
    }

    const places = new Map(tracks.map((track, index) => [track.id, index]))
    return (
        <>
            <TrackList
                {...list}
                tracks={tracks.map((track) => (track.disc === undefined ? track : { ...track, disc: undefined }))}
                words={given}
                actions={(track) => {
                    const index = places.get(track.id) ?? -1
                    return (
                        <>
                            {actions?.(track)}
                            <IconButton
                                ref={(element: HTMLButtonElement | null) => {
                                    if (element === null) grips.current.delete(track.id)
                                    else grips.current.set(track.id, element)
                                }}
                                label={words.move(titleOf(track))}
                                className="cursor-grab touch-none active:cursor-grabbing"
                                onPointerDown={(event: PointerEvent<HTMLButtonElement>) => start(event, index)}
                                onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => keyed(event, index)}
                            >
                                <GripVertical aria-hidden />
                            </IconButton>
                        </>
                    )
                }}
            />
            <span aria-live="polite" className="sr-only">
                {said}
            </span>
        </>
    )
}
