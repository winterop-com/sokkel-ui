import { Music, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

import { usePanelSize } from '../../hooks/use-panel-size'
import { cn } from '../../lib/cn'
import { GroupLabel } from '../GroupLabel'
import { MetaLine } from '../MetaLine'
import { ResizeHandle } from '../ResizeHandle'
import { PlayButton, Position, TransportButton, VolumeControl } from './MediaControls'
import type { MediaRange } from './time'

/** How a queue repeats: not at all, the whole queue, or the one item playing. */
export type RepeatMode = 'off' | 'all' | 'one'

/** The words the bar says, each with an English default. */
export interface MediaBarLabels {
    play: string
    pause: string
    previous: string
    next: string
    shuffle: string
    repeatOff: string
    repeatAll: string
    repeatOne: string
    mute: string
    unmute: string
    volume: string
    seek: string
    /** The name of the top edge that resizes the bar. */
    resize: string
    /** The place in the line over the large title, such as "Track 13 of 16". */
    trackOf: (number: number, count?: number) => string
}

const LABELS: MediaBarLabels = {
    play: 'Play',
    pause: 'Pause',
    previous: 'Previous',
    next: 'Next',
    shuffle: 'Shuffle',
    repeatOff: 'Repeat',
    repeatAll: 'Repeat all',
    repeatOne: 'Repeat one',
    mute: 'Mute',
    unmute: 'Unmute',
    volume: 'Volume',
    seek: 'Seek',
    resize: 'Resize the player',
    trackOf: (number, count) => (count === undefined ? `Track ${String(number)}` : `Track ${String(number)} of ${String(count)}`),
}

const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' }

/** The one-line bar's height, the least the bar is dragged to. */
const LINE = 64

/** The height from which the bar is the large now-playing panel. */
const LARGE = 200

/** The height from which the large panel's title takes the larger size. */
const TALL = 280

/** The most of the window's height the bar takes, whatever its size, so the page keeps the rest. */
const WINDOW_SHARE = 0.5

/** The width at which the bar lays out on one row, the `@2xl` container size. */
const WIDE = 672

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
    /** Its place in what is playing, said as "Track 13 of 16" in the line over the large title. */
    trackNumber?: number
    trackCount?: number
    /** A square picture for what is playing, filled edge to edge; a note glyph stands in without one. */
    artwork?: ReactNode
    playing: boolean
    onPlayingChange: (playing: boolean) => void
    /** Seconds from the start. */
    position: number
    /** Length in seconds; zero when unknown, which disables seeking. */
    duration: number
    onSeek: (seconds: number) => void
    /** Loaded stretches, in seconds. */
    buffered?: readonly MediaRange[]
    /** The track's loudness from start to end, each level from 0 to 1, drawn as the large panel's scrubber. */
    waveform?: readonly number[]
    /**
     * A live picture of the sound, drawn faintly behind the large panel's title and scrubber and
     * filling the room above its controls. Presses between the words reach it.
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
    labels?: Partial<MediaBarLabels>
    className?: string
}

/**
 * The player along the foot of a screen, for audio. As one line it holds what is playing at the
 * left, the transport and the position in the middle, and volume and any extra controls at the
 * right; the cover grows as the bar is made taller.
 *
 * From 200 pixels tall it is the large now-playing panel: the cover as tall as the bar at its left
 * edge, a line in the accent over the title (the place, the album, the year), the title large with
 * the artist under it, the scrubber drawn as the track's `waveform` with the played part filled,
 * and at the foot shuffle, repeat, previous, play and next, with the volume and any extra controls
 * at the end. A `visualizer` fills the room behind the words and the scrubber, drawn faint so the
 * words stay clear over it; pass it at full strength.
 *
 * Its top edge drags to resize it, from the one line to the large panel, and a double click on the
 * edge puts it back. Left to itself it holds its own height, starting at `defaultSize`; `size` with
 * `onSizeChange` holds it from outside, and `resizable={false}` keeps it fixed. It never takes more
 * than half the window's height.
 *
 * It is controlled: it holds no clock, and draws the `position` it is given until a seek is
 * reported through `onSeek`. Under 672 pixels of its own width the one line folds into two rows,
 * the title beside the transport over the position, and leaves shuffle, repeat and volume to the
 * device; the large panel puts a smaller cover beside the title and the transport alone at its foot.
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
    playing,
    onPlayingChange,
    position,
    duration,
    onSeek,
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
    size,
    onSizeChange,
    resizable = true,
    minSize = LINE,
    maxSize = 360,
    defaultSize,
    labels,
    className,
}: MediaBarProps) {
    const words = { ...LABELS, ...labels }
    const [scrub, setScrub] = useState<number | null>(null)
    const bar = useRef<HTMLDivElement | null>(null)
    const box = useBox(bar)
    const width = box.width
    const room = useWindowHeight()
    const held = usePanelSize({ size, onSizeChange, rest: defaultSize ?? minSize, fallback: minSize, min: minSize, max: maxSize })
    const top = Math.max(minSize, Math.min(maxSize, Math.floor(room * WINDOW_SHARE)))
    const shown = Math.min(top, Math.max(minSize, held.size ?? minSize))
    const large = shown >= LARGE
    const wide = width >= WIDE
    const at = scrub ?? position
    const level = muted ? 0 : volume
    const repeatLabel = repeat === 'one' ? words.repeatOne : repeat === 'all' ? words.repeatAll : words.repeatOff
    const line = subtitle ?? (artist !== undefined || album !== undefined ? <MetaLine inline items={[artist, album]} /> : undefined)

    const cover = (
        <div className="flex size-full items-center justify-center overflow-hidden bg-muted text-faint [&>*]:size-full [&>svg]:block">
            {artwork ?? <Music className="size-2/5! max-h-12 max-w-12 p-0" aria-hidden />}
        </div>
    )
    const shuffleButton = onShuffleChange !== undefined && (
        <TransportButton label={words.shuffle} pressed={shuffle} onClick={() => onShuffleChange(!shuffle)}>
            <Shuffle aria-hidden />
        </TransportButton>
    )
    const repeatButton = onRepeatChange !== undefined && (
        <TransportButton label={repeatLabel} pressed={repeat !== 'off'} onClick={() => onRepeatChange(NEXT_REPEAT[repeat])}>
            {repeat === 'one' ? <Repeat1 aria-hidden /> : <Repeat aria-hidden />}
        </TransportButton>
    )
    const transport = (
        <>
            <TransportButton label={words.previous} onClick={onPrevious} disabled={onPrevious === undefined}>
                <SkipBack className="fill-current" aria-hidden />
            </TransportButton>
            <PlayButton playing={playing} onToggle={() => onPlayingChange(!playing)} words={words} />
            <TransportButton label={words.next} onClick={onNext} disabled={onNext === undefined}>
                <SkipForward className="fill-current" aria-hidden />
            </TransportButton>
        </>
    )
    const seekRow = (shape?: readonly number[]) => (
        <Position at={at} duration={duration} buffered={buffered} label={words.seek} onSeek={onSeek} onScrub={setScrub} waveform={shape} />
    )
    const volumeControl = (compact: boolean) => (
        <VolumeControl
            level={level}
            muted={muted}
            onMutedChange={onMutedChange}
            onVolumeChange={onVolumeChange}
            compact={compact}
            words={words}
        />
    )
    const extras = extra !== undefined && <div className="flex items-center gap-1">{extra}</div>

    return (
        <div
            ref={bar}
            data-slot="media-bar"
            data-playing={playing || undefined}
            data-size={large ? 'large' : 'line'}
            className={cn(
                '@container relative flex border-t border-border-strong bg-sidebar text-sidebar-foreground',
                !large && 'flex-col justify-center',
                className,
            )}
            style={large ? { height: shown } : { minHeight: shown }}
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
                    className="absolute inset-x-0 top-0 my-0 -translate-y-1/2"
                />
            )}
            {large ? (
                <>
                    {wide && <div className="aspect-square h-full shrink-0">{cover}</div>}
                    <div className="flex min-w-0 flex-1 flex-col">
                        <div className="relative min-h-0 flex-1 overflow-hidden">
                            {visualizer !== undefined && (
                                <div data-slot="media-bar-visualizer" className="absolute inset-0 opacity-30">
                                    {visualizer}
                                </div>
                            )}
                            <div className="pointer-events-none relative flex h-full flex-col justify-end gap-3 px-5 pt-4 pb-1">
                                <div className="flex min-w-0 items-end gap-4">
                                    {!wide && (
                                        <div
                                            className="shrink-0 overflow-hidden rounded-mini"
                                            style={{ width: narrowCover(shown, width), height: narrowCover(shown, width) }}
                                        >
                                            {cover}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        {(trackNumber !== undefined || album !== undefined || year !== undefined) && (
                                            <GroupLabel className="truncate text-primary-ink">
                                                <MetaLine
                                                    inline
                                                    items={[
                                                        trackNumber === undefined ? undefined : words.trackOf(trackNumber, trackCount),
                                                        album,
                                                        year,
                                                    ]}
                                                />
                                            </GroupLabel>
                                        )}
                                        <p
                                            className={cn(
                                                'truncate font-semibold tracking-tight text-foreground',
                                                shown >= TALL && wide ? 'text-stat' : 'text-page',
                                            )}
                                        >
                                            <span className="pointer-events-auto">{title}</span>
                                        </p>
                                        {(artist ?? subtitle) !== undefined && (
                                            <p
                                                className={cn(
                                                    'truncate text-muted-foreground',
                                                    shown >= TALL && wide ? 'text-base' : 'text-sm',
                                                )}
                                            >
                                                <span className="pointer-events-auto">{artist ?? subtitle}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="pointer-events-auto">{seekRow(waveform ?? [])}</div>
                            </div>
                        </div>
                        <div className={cn('flex h-shell-foot shrink-0 items-center gap-1 px-3', !wide && 'justify-center')}>
                            {shuffleButton}
                            {repeatButton}
                            {transport}
                            {wide && (
                                <>
                                    <div className="flex-1" />
                                    {volumeControl(width - shown < 480)}
                                </>
                            )}
                            {extras}
                        </div>
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] @2xl:gap-x-6 @2xl:py-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <div
                            className="size-10 shrink-0 overflow-hidden rounded-mini @2xl:size-12"
                            style={wide && shown - 17 > 48 ? { width: shown - 17, height: shown - 17 } : undefined}
                        >
                            {cover}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{title}</p>
                            {line !== undefined && <p className="truncate text-xs text-muted-foreground">{line}</p>}
                        </div>
                    </div>

                    <div className="flex min-w-0 items-center justify-end gap-1 @2xl:flex-col @2xl:items-stretch @2xl:justify-center @2xl:gap-0.5">
                        <div className="flex items-center justify-center gap-1 @2xl:gap-2">
                            {wide && shuffleButton}
                            {transport}
                            {wide && repeatButton}
                            {!wide && extras}
                        </div>
                        {wide && seekRow()}
                    </div>

                    {!wide && <div className="col-span-2">{seekRow()}</div>}

                    {wide && (
                        <div className="flex min-w-0 items-center justify-end gap-2">
                            {volumeControl(false)}
                            {extras}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

/** The cover's side beside the large title on a narrow bar, growing with the bar's height and leaving the title room. */
function narrowCover(height: number, width: number): number {
    return Math.round(Math.max(56, Math.min(128, width * 0.28, height - 160)))
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
