import { Music, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { Slider } from '../ui/slider'
import { MediaSlider } from './MediaSlider'
import { formatRemaining, formatTime, type MediaRange } from './time'

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

/** How far one arrow key moves the position, and how far Page Up and Page Down move it, in seconds. */
const SEEK_STEP = 5
const SEEK_LARGE_STEP = 30

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
    const at = scrub ?? position
    const level = muted ? 0 : volume
    const repeatLabel = repeat === 'one' ? words.repeatOne : repeat === 'all' ? words.repeatAll : words.repeatOff

    const playButton = (
        <Button
            size="icon"
            aria-label={playing ? words.pause : words.play}
            onClick={() => {
                onPlayingChange(!playing)
            }}
        >
            {playing ? <Pause className="fill-current" aria-hidden /> : <Play className="fill-current" aria-hidden />}
        </Button>
    )
    const previousButton = (
        <Button variant="ghost" size="icon-sm" aria-label={words.previous} onClick={onPrevious} disabled={onPrevious === undefined}>
            <SkipBack className="fill-current" aria-hidden />
        </Button>
    )
    const nextButton = (
        <Button variant="ghost" size="icon-sm" aria-label={words.next} onClick={onNext} disabled={onNext === undefined}>
            <SkipForward className="fill-current" aria-hidden />
        </Button>
    )

    return (
        <div
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
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={words.shuffle}
                                aria-pressed={shuffle}
                                onClick={() => {
                                    onShuffleChange(!shuffle)
                                }}
                                className={cn('hidden @2xl:inline-flex', shuffle ? 'text-primary-ink' : 'text-muted-foreground')}
                            >
                                <Shuffle aria-hidden />
                            </Button>
                        )}
                        {previousButton}
                        {playButton}
                        {nextButton}
                        {onRepeatChange !== undefined && (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={repeatLabel}
                                aria-pressed={repeat !== 'off'}
                                onClick={() => {
                                    onRepeatChange(NEXT_REPEAT[repeat])
                                }}
                                className={cn('hidden @2xl:inline-flex', repeat === 'off' ? 'text-muted-foreground' : 'text-primary-ink')}
                            >
                                {repeat === 'one' ? <Repeat1 aria-hidden /> : <Repeat aria-hidden />}
                            </Button>
                        )}
                        {extra !== undefined && <div className="flex items-center gap-1 @2xl:hidden">{extra}</div>}
                    </div>
                    <div className="hidden @2xl:block">
                        <Position at={at} duration={duration} buffered={buffered} label={words.seek} onSeek={onSeek} onScrub={setScrub} />
                    </div>
                </div>

                <div className="col-span-2 @2xl:hidden">
                    <Position at={at} duration={duration} buffered={buffered} label={words.seek} onSeek={onSeek} onScrub={setScrub} />
                </div>

                <div className="hidden min-w-0 items-center justify-end gap-2 @2xl:flex">
                    <div className="flex w-36 items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={muted ? words.unmute : words.mute}
                            aria-pressed={muted}
                            disabled={onMutedChange === undefined}
                            onClick={() => {
                                onMutedChange?.(!muted)
                            }}
                            className="text-muted-foreground"
                        >
                            <VolumeGlyph level={level} />
                        </Button>
                        <Slider
                            aria-label={words.volume}
                            value={Math.round(level * 100)}
                            onValueChange={(next) => {
                                const value = Array.isArray(next) ? next[0] : next
                                onVolumeChange(value / 100)
                                if (muted && value > 0) onMutedChange?.(false)
                            }}
                            className="min-w-0 flex-1"
                        />
                    </div>
                    {extra !== undefined && <div className="flex items-center gap-1">{extra}</div>}
                </div>
            </div>
        </div>
    )
}

/** The seek slider between the elapsed and the remaining time. */
function Position({
    at,
    duration,
    buffered,
    label,
    onSeek,
    onScrub,
}: {
    at: number
    duration: number
    buffered?: readonly MediaRange[]
    label: string
    onSeek: (seconds: number) => void
    onScrub: (value: number | null) => void
}) {
    return (
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground tabular-nums">
            <span className="w-11 shrink-0 text-right">{formatTime(at)}</span>
            <MediaSlider
                value={at}
                max={duration}
                label={label}
                valueText={(value) => `${formatTime(value)} / ${formatTime(duration)}`}
                buffered={buffered}
                step={SEEK_STEP}
                largeStep={SEEK_LARGE_STEP}
                onChange={onSeek}
                onScrub={onScrub}
                className="min-w-0 flex-1"
            />
            <span className="w-11 shrink-0">{formatRemaining(at, duration)}</span>
        </div>
    )
}

/** Loud, quiet or silent, in the glyph. */
export function VolumeGlyph({ level, className }: { level: number; className?: string }) {
    if (level <= 0) return <VolumeX className={className} aria-hidden />
    if (level < 0.5) return <Volume1 className={className} aria-hidden />
    return <Volume2 className={className} aria-hidden />
}
