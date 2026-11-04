import { Music, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

import { cn } from '../../lib/cn'
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
}

const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' }

export interface MediaBarProps {
    title: ReactNode
    subtitle?: ReactNode
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
    labels?: Partial<MediaBarLabels>
    className?: string
}

/**
 * The player along the foot of a screen, for audio: what is playing at the left, the transport
 * and the position in the middle, and volume and any extra controls at the right.
 *
 * It is controlled: it holds no clock, and draws the `position` it is given until a seek is
 * reported through `onSeek`. Under 640 pixels of its own width it folds into two rows, the
 * title beside the transport over the position, and leaves shuffle, repeat and volume to the
 * device.
 */
export function MediaBar({
    title,
    subtitle,
    artwork,
    playing,
    onPlayingChange,
    position,
    duration,
    onSeek,
    buffered,
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
    labels,
    className,
}: MediaBarProps) {
    const words = { ...LABELS, ...labels }
    const [scrub, setScrub] = useState<number | null>(null)
    const bar = useRef<HTMLDivElement | null>(null)
    const wide = useWide(bar)
    const at = scrub ?? position
    const level = muted ? 0 : volume
    const repeatLabel = repeat === 'one' ? words.repeatOne : repeat === 'all' ? words.repeatAll : words.repeatOff

    return (
        <div
            ref={bar}
            data-slot="media-bar"
            data-playing={playing || undefined}
            className={cn('@container border-t border-border-strong bg-sidebar text-sidebar-foreground', className)}
        >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] @2xl:gap-x-6 @2xl:py-2">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-mini bg-muted text-faint @2xl:size-12 [&>*]:size-full [&>svg]:block">
                        {artwork ?? <Music className="size-5! p-0" aria-hidden />}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{title}</p>
                        {subtitle !== undefined && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
                    </div>
                </div>

                <div className="flex min-w-0 items-center justify-end gap-1 @2xl:flex-col @2xl:items-stretch @2xl:justify-center @2xl:gap-0.5">
                    <div className="flex items-center justify-center gap-1 @2xl:gap-2">
                        {onShuffleChange !== undefined && (
                            <TransportButton
                                label={words.shuffle}
                                pressed={shuffle}
                                onClick={() => onShuffleChange(!shuffle)}
                                className="hidden @2xl:inline-flex"
                            >
                                <Shuffle aria-hidden />
                            </TransportButton>
                        )}
                        <TransportButton label={words.previous} onClick={onPrevious} disabled={onPrevious === undefined}>
                            <SkipBack className="fill-current" aria-hidden />
                        </TransportButton>
                        <PlayButton playing={playing} onToggle={() => onPlayingChange(!playing)} words={words} />
                        <TransportButton label={words.next} onClick={onNext} disabled={onNext === undefined}>
                            <SkipForward className="fill-current" aria-hidden />
                        </TransportButton>
                        {onRepeatChange !== undefined && (
                            <TransportButton
                                label={repeatLabel}
                                pressed={repeat !== 'off'}
                                onClick={() => onRepeatChange(NEXT_REPEAT[repeat])}
                                className="hidden @2xl:inline-flex"
                            >
                                {repeat === 'one' ? <Repeat1 aria-hidden /> : <Repeat aria-hidden />}
                            </TransportButton>
                        )}
                        {!wide && extra !== undefined && <div className="flex items-center gap-1">{extra}</div>}
                    </div>
                    {wide && (
                        <Position at={at} duration={duration} buffered={buffered} label={words.seek} onSeek={onSeek} onScrub={setScrub} />
                    )}
                </div>

                {!wide && (
                    <div className="col-span-2">
                        <Position at={at} duration={duration} buffered={buffered} label={words.seek} onSeek={onSeek} onScrub={setScrub} />
                    </div>
                )}

                {wide && (
                    <div className="flex min-w-0 items-center justify-end gap-2">
                        <VolumeControl
                            level={level}
                            muted={muted}
                            onMutedChange={onMutedChange}
                            onVolumeChange={onVolumeChange}
                            words={words}
                        />
                        {extra !== undefined && <div className="flex items-center gap-1">{extra}</div>}
                    </div>
                )}
            </div>
        </div>
    )
}

/** The width at which the bar lays out on one row, the `@2xl` container size. */
const WIDE = 672

/** Whether the element is at least `WIDE` pixels across, measured before paint and on every resize. */
function useWide(ref: RefObject<HTMLDivElement | null>): boolean {
    const [wide, setWide] = useState(true)
    useLayoutEffect(() => {
        const element = ref.current
        if (element === null) return
        const measure = () => setWide(element.clientWidth >= WIDE)
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(element)
        return () => observer.disconnect()
    }, [ref])
    return wide
}
