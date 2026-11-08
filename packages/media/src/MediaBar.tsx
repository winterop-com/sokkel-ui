import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

import { usePanelSize } from '@winterop-com/sokkel-ui/hooks/use-panel-size'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ResizeHandle } from '@winterop-com/sokkel-ui/ResizeHandle'
import { grows, LINE, WIDE, type MediaBarLayout } from './bar-growth'
import { chapterIndex, chapterSpan, nextChapterStart, previousChapterStart, waveformSpan } from './chapters'
import { LineBar, PanelBar, RowsBar, StageBar, type BarProps } from './MediaBarLayouts'
import {
    kindOf,
    MEDIA_BAR_WORDS,
    type Deck,
    type MediaBarWords,
    type MediaSteps,
    type MediaTimeline,
    type RepeatMode,
} from './MediaBarParts'
import { MEDIA_RATES } from '@winterop-com/sokkel-ui/media/MediaControls'
import { MediaFullscreen } from './MediaFullscreen'
import { useOneSound } from '@winterop-com/sokkel-ui/media/one-sound'
import type { SoundKind } from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import type { MediaRange } from '@winterop-com/sokkel-ui/media/time'

export type { MediaBarLayout } from './bar-growth'
export type { MediaBarWords, MediaSteps, MediaTimeline, RepeatMode } from './MediaBarParts'
export { MEDIA_RATES } from '@winterop-com/sokkel-ui/media/MediaControls'

/** How far the skip buttons move unless told otherwise, in seconds. */
export const MEDIA_SKIP = 15

/** The most of the window's height the bar takes, whatever its size, so the page keeps the rest. */
const WINDOW_SHARE = 0.5

const BARS: Record<MediaBarLayout, (props: BarProps) => ReactNode> = { rows: RowsBar, panel: PanelBar, stage: StageBar }

export interface MediaBarProps {
    title: ReactNode
    /** The line under the title in the one-line bar; by default the artist and the album. */
    subtitle?: ReactNode
    /** Who made it: under the large title, and with the album under the title in the one-line bar. */
    artist?: ReactNode
    /** The record it is from: in the line over the large title, and beside the artist in the one-line bar. */
    album?: ReactNode
    /** The year, in the line over the large title. */
    year?: ReactNode
    /**
     * Its place in what is playing, said as "Track 13 of 16" in the line over the large title, or
     * "Chapter 3 of 12" while previous and next step through chapters; with `chapters`, the
     * chapter playing is counted instead.
     */
    trackNumber?: number
    trackCount?: number
    /** A square picture for what is playing, filled edge to edge; without one, a cover drawn from `placeholderSeed`, or a note glyph. */
    artwork?: ReactNode
    /** A stable id, such as the album's, that a cover is drawn from when there is no `artwork`: the same one `Artwork` draws for it elsewhere. */
    placeholderSeed?: string
    playing: boolean
    onPlayingChange: (playing: boolean) => void
    /**
     * Whether playing pauses the other sounds the library plays, and another starting pauses this
     * one through `onPlayingChange(false)`, so one sound is heard at a time. A muted bar takes no sound.
     */
    exclusive?: boolean
    /** Seconds from the start. */
    position: number
    /** Length in seconds; zero when unknown, which disables seeking. */
    duration: number
    onSeek: (seconds: number) => void
    /**
     * A live stream, such as a radio station: the scrubber and the times give way to a Live mark,
     * and seeking, skipping and the speed menu are off. Previous and next stay the app's to give.
     */
    live?: boolean
    /**
     * Where each chapter starts, in seconds from the start, in order. Previous and next then step
     * through chapters and say so, and without `onPrevious` or `onNext` they seek: previous to the
     * chapter's start, or to the one before within its first three seconds, next to the next one's.
     */
    chapters?: readonly number[]
    /** What previous and next step between and say: `chapter` with `chapters`, `track` without. */
    steps?: MediaSteps
    /** What the scrubber and its times measure: the whole item (the default) or, with `chapters`, the chapter playing. */
    timeline?: MediaTimeline
    /**
     * The interval the skip buttons move back and forward, in seconds, drawn on their glyphs: 15
     * by default. They are drawn when either this or `onSkip` is given.
     */
    skip?: number
    /** Moves by the seconds given, negative for back; without it a skip seeks through `onSeek`. */
    onSkip?: (seconds: number) => void
    /** The playback speed, as a multiple of normal: 1 by default. */
    rate?: number
    /** The speeds the menu offers, `MEDIA_RATES` by default. */
    rates?: readonly number[]
    /** The speed menu, written as "1x", is drawn only with this handler. */
    onRateChange?: (rate: number) => void
    /** Loaded stretches, in seconds. */
    buffered?: readonly MediaRange[]
    /** The track's loudness from start to end, each level from 0 to 1, drawn as the grown bar's scrubber. */
    waveform?: readonly number[]
    /**
     * A live picture of the sound, passed at full strength. Once the bar grows it rises faintly
     * behind the words, standing on the waveform; the fullscreen view draws it at full strength. A
     * `SoundVisualizer` takes the kind picked in the fullscreen view, and is centered there for the
     * `stage` layout; any other node is drawn as given.
     */
    visualizer?: ReactNode
    /** From 0 to 1. */
    volume: number
    onVolumeChange: (volume: number) => void
    muted?: boolean
    onMutedChange?: (muted: boolean) => void
    /** Previous and next are drawn disabled without a handler. */
    onPrevious?: () => void
    onNext?: () => void
    /** Shuffle is drawn only when it has a handler. */
    shuffle?: boolean
    onShuffleChange?: (shuffle: boolean) => void
    /** Repeat is drawn only when it has a handler; a press moves to the next mode. */
    repeat?: RepeatMode
    onRepeatChange?: (repeat: RepeatMode) => void
    /** Controls at the bar's end, such as a queue button. */
    extra?: ReactNode
    /** How the bar grows once dragged taller than its one line: `rows` by default. */
    layout?: MediaBarLayout
    /** The height in pixels, held from outside with `onSizeChange`. */
    size?: number
    onSizeChange?: (size: number) => void
    /** Whether the top edge drags to resize the bar. */
    resizable?: boolean
    /** The least height in pixels, the one-line bar's by default. */
    minSize?: number
    /** The most height in pixels, 360 by default; the bar never takes more than half the window either way. */
    maxSize?: number
    /** The height in pixels the bar starts at and a double click on the edge returns to: the one-line bar unless given. */
    defaultSize?: number
    /** Whether the bar draws the button that opens the fullscreen view. */
    expandable?: boolean
    /** Whether the fullscreen view is open, held from outside with `onFullscreenChange`, as an app's own key opens it. */
    fullscreen?: boolean
    onFullscreenChange?: (fullscreen: boolean) => void
    /**
     * Whether the fullscreen view starts open. It is drawn over the window without asking the
     * browser, as no press asked for it; the bar's button asks.
     */
    defaultFullscreen?: boolean
    /** The visualizer's kind in the fullscreen view, held from outside with `onVisualizerKindChange`; the slot's own by default. */
    visualizerKind?: SoundKind
    onVisualizerKindChange?: (kind: SoundKind) => void
    words?: Partial<MediaBarWords>
    className?: string
}

/**
 * The player along the foot of a screen, for audio. As one line it holds what is playing at the
 * left, the transport and the position in the middle, and volume, any extra controls and the
 * fullscreen button at the right; the cover grows as the bar is made taller.
 *
 * Dragged taller than about 96 pixels it grows by its `layout`, continuously from there up, each
 * with the track's `waveform` as its scrubber and the `visualizer` rising faintly behind the words:
 *
 * - `rows`, the default: the cover across two rows, what plays, the transport and the volume in
 *   the top one, and a waveform as wide as the rest of the bar under them, growing from 18 to 96
 *   pixels.
 * - `panel`: the large now-playing panel, the cover flush and as tall as the bar, a line in the
 *   accent over the title (the place, the album, the year) and the artist, the waveform under
 *   them, and the transport along the foot.
 * - `stage`: a stage centered on the bar between the cover and the volume, the words over a wide
 *   waveform with the transport under it.
 *
 * The corner button opens the fullscreen now-playing view (`MediaFullscreen`), arranged after the
 * layout, a dark room in every theme with the visualizer at full strength and a picker of its
 * kind; Escape leaves it.
 *
 * Its top edge drags to resize it and a double click on the edge puts it back. Left to itself it
 * holds its own height, starting at `defaultSize`; `size` with `onSizeChange` holds it from
 * outside, and `resizable={false}` keeps it fixed. It never takes more than half the window's
 * height.
 *
 * For a long listen, such as a book or a podcast, `skip` and `onSkip` add buttons that move back
 * and forward by an interval written on them, `onRateChange` a speed menu, and `chapters` turn
 * previous and next into chapter steps, with `timeline="chapter"` measuring the time within the
 * chapter. `live` is for a stream with no length, such as a radio station: a Live mark stands
 * where the position would, and nothing seeks.
 *
 * It is controlled: it holds no clock, and draws the `position` it is given until a seek is
 * reported through `onSeek`. Under 672 pixels of its own width the one line folds into two rows,
 * the title beside the transport over the position, and every layout leaves shuffle, repeat and
 * volume to the device.
 */
export function MediaBar({
    title,
    subtitle,
    artist,
    album,
    year,
    trackNumber,
    trackCount,
    artwork,
    placeholderSeed,
    playing,
    onPlayingChange,
    exclusive = true,
    position,
    duration,
    onSeek,
    live = false,
    chapters,
    steps,
    timeline = 'whole',
    skip,
    onSkip,
    rate = 1,
    rates = MEDIA_RATES,
    onRateChange,
    buffered,
    waveform,
    visualizer,
    volume,
    onVolumeChange,
    muted = false,
    onMutedChange,
    onPrevious,
    onNext,
    shuffle = false,
    onShuffleChange,
    repeat = 'off',
    onRepeatChange,
    extra,
    layout = 'rows',
    size,
    onSizeChange,
    resizable = true,
    minSize = LINE,
    maxSize = 360,
    defaultSize,
    expandable = true,
    fullscreen,
    onFullscreenChange,
    defaultFullscreen = false,
    visualizerKind,
    onVisualizerKindChange,
    words: given,
    className,
}: MediaBarProps) {
    const words = { ...MEDIA_BAR_WORDS, ...given }
    useOneSound(() => onPlayingChange(false), playing && !muted && volume > 0, exclusive)
    const [scrub, setScrub] = useState<number | null>(null)
    const bar = useRef<HTMLDivElement | null>(null)
    const box = useBox(bar)
    const room = useWindowHeight()
    const held = usePanelSize({ size, onSizeChange, rest: defaultSize ?? minSize, fallback: minSize, min: minSize, max: maxSize })
    const top = Math.max(minSize, Math.min(maxSize, Math.floor(room * WINDOW_SHARE)))
    const shown = Math.min(top, Math.max(minSize, held.size ?? minSize))
    const grown = grows(layout, shown)

    const [ownOpen, setOwnOpen] = useState(defaultFullscreen)
    const open = fullscreen ?? ownOpen
    // Open since the bar was first drawn, so drawn over the window without asking the browser.
    const [first, setFirst] = useState(open)
    if (first && !open) setFirst(false)
    const setOpen = (next: boolean) => {
        if (fullscreen === undefined) setOwnOpen(next)
        onFullscreenChange?.(next)
    }

    const slotKind = kindOf(visualizer)
    const [ownKind, setOwnKind] = useState<SoundKind>(slotKind ?? 'spectrum')
    const kind = visualizerKind ?? ownKind
    const setKind = (next: SoundKind) => {
        if (visualizerKind === undefined) setOwnKind(next)
        onVisualizerKindChange?.(next)
    }

    const marked = chapters !== undefined && chapters.length > 0 ? chapters : undefined
    const stepping = steps ?? (marked === undefined ? 'track' : 'chapter')
    const chapter = marked === undefined ? -1 : chapterIndex(marked, position)
    // On a chapter's timeline the scrubber spans the chapter, and its positions are the chapter's own.
    const span =
        marked !== undefined && timeline === 'chapter' && chapter >= 0
            ? chapterSpan(marked, chapter, duration)
            : { start: 0, end: duration }
    const whole = span.start === 0 && span.end === duration
    // Previous and next step through the chapters given, counting them and seeking between them.
    const byChapter = marked !== undefined && stepping === 'chapter' && !live
    const counted = byChapter ? (chapter >= 0 ? chapter + 1 : undefined) : trackNumber
    const count = byChapter ? marked.length : trackCount
    const placeOf = stepping === 'chapter' ? words.chapterOf : words.trackOf
    const interval = skip ?? (onSkip === undefined ? undefined : MEDIA_SKIP)
    const seekWithin = (seconds: number) => onSeek(Math.min(duration, Math.max(0, seconds)))
    const nextStart = byChapter ? nextChapterStart(marked, position) : undefined

    const deck: Deck = {
        words,
        title,
        subtitle,
        artist,
        album,
        year,
        place: counted === undefined ? undefined : placeOf(counted, count),
        artwork,
        placeholderSeed,
        playing,
        onPlayingChange,
        at: scrub ?? position - span.start,
        duration: span.end - span.start,
        onSeek: (seconds) => onSeek(span.start + seconds),
        onScrub: setScrub,
        live,
        buffered: whole
            ? buffered
            : buffered
                  ?.map((range) => ({
                      start: Math.max(range.start, span.start) - span.start,
                      end: Math.min(range.end, span.end) - span.start,
                  }))
                  .filter((range) => range.end > range.start),
        waveform: waveform === undefined || whole ? waveform : waveformSpan(waveform, duration, span.start, span.end),
        level: muted ? 0 : volume,
        muted,
        onMutedChange,
        onVolumeChange,
        onPrevious: onPrevious ?? (byChapter ? () => seekWithin(previousChapterStart(marked, position)) : undefined),
        onNext: onNext ?? (nextStart === undefined ? undefined : () => seekWithin(nextStart)),
        steps: stepping,
        skip: interval,
        onSkip: interval === undefined ? undefined : (onSkip ?? ((seconds) => seekWithin(position + seconds))),
        rate,
        rates,
        onRateChange,
        shuffle,
        onShuffleChange,
        repeat,
        onRepeatChange,
        extra,
    }
    const Bar = grown ? BARS[layout] : LineBar

    return (
        <>
            <div
                ref={bar}
                data-slot="media-bar"
                data-playing={playing || undefined}
                data-layout={layout}
                data-size={grown ? 'grown' : 'line'}
                className={cn(
                    '@container relative flex flex-col border-t border-border-strong bg-sidebar text-sidebar-foreground',
                    !grown && 'justify-center',
                    className,
                )}
                style={grown ? { height: shown } : { minHeight: shown }}
            >
                {resizable && held.changeable && (
                    <ResizeHandle
                        target={bar}
                        size={Math.max(shown, box.height)}
                        onSize={held.set}
                        onReset={held.reset}
                        min={minSize}
                        max={top}
                        axis="y"
                        grows={-1}
                        follow={false}
                        label={words.resize}
                        className="absolute inset-x-0 top-0 z-10 my-0 -translate-y-1/2"
                    />
                )}
                <div className={cn(grown && 'min-h-0 flex-1 overflow-hidden')}>
                    <Bar
                        deck={deck}
                        height={shown}
                        width={box.width}
                        visualizer={open ? undefined : visualizer}
                        onFullscreen={expandable ? () => setOpen(true) : undefined}
                    />
                </div>
            </div>
            {open && (
                <MediaFullscreen
                    deck={deck}
                    layout={layout}
                    visualizer={visualizer}
                    pickable={slotKind !== undefined}
                    kind={kind}
                    onKindChange={setKind}
                    onLeave={() => setOpen(false)}
                    native={!first}
                />
            )}
        </>
    )
}

/**
 * The element's width and outer height, measured before paint and on every resize; `WIDE` across
 * until measured. The one line may stand taller than its size, so a drag starts from the height.
 */
function useBox(ref: RefObject<HTMLDivElement | null>): { width: number; height: number } {
    const [box, setBox] = useState({ width: WIDE, height: 0 })
    useLayoutEffect(() => {
        const element = ref.current
        if (element === null) return
        const measure = () =>
            setBox((last) =>
                last.width === element.clientWidth && last.height === element.offsetHeight
                    ? last
                    : { width: element.clientWidth, height: element.offsetHeight },
            )
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(element)
        return () => observer.disconnect()
    }, [ref])
    return box
}

/** The window's height, followed as it is resized. */
function useWindowHeight(): number {
    const [height, setHeight] = useState(() => (typeof window === 'undefined' ? 900 : window.innerHeight))
    useEffect(() => {
        const measure = () => setHeight(window.innerHeight)
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [])
    return height
}
