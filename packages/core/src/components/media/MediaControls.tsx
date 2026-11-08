import { Pause, Play, RotateCcw, RotateCw, Volume1, Volume2, VolumeX } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { AudioScrubber } from '../ui/waveform'
import { MediaSlider } from './MediaSlider'
import { formatRemaining, formatTime, type MediaRange } from './time'

/** Where controls sit: on a surface of the app, or over a picture, light on dark in either scheme. */
export type MediaTone = 'surface' | 'overlay'

/** A control drawn over the picture. */
const ON_PICTURE =
    'text-terminal-foreground hover:bg-terminal-foreground/15 hover:text-terminal-foreground dark:hover:bg-terminal-foreground/15 aria-expanded:bg-terminal-foreground/15 aria-expanded:text-terminal-foreground'

/** The class a ghost button takes for its tone. */
export function toneButton(tone: MediaTone): string | undefined {
    return tone === 'overlay' ? ON_PICTURE : undefined
}

/** How far one arrow key moves the position, and how far Page Up and Page Down move it, in seconds. */
export const SEEK_STEP = 5
export const SEEK_LARGE_STEP = 30

/**
 * How large the transport is drawn: `sm` in a bar, `md` in a tall panel, `lg` on a screen of its
 * own, such as a fullscreen now-playing view.
 */
export type TransportSize = 'sm' | 'md' | 'lg'

const PLAY_SIZE: Record<TransportSize, string | undefined> = {
    sm: undefined,
    md: undefined,
    lg: "size-14 rounded-surface [&_svg:not([class*='size-'])]:size-6",
}

const TRANSPORT_SIZE: Record<TransportSize, string | undefined> = {
    sm: undefined,
    md: undefined,
    lg: "[&_svg:not([class*='size-'])]:size-5",
}

/** The play button at the center of the transport, the one filled control. */
export function PlayButton({
    playing,
    onToggle,
    tone = 'surface',
    size = 'sm',
    words,
}: {
    playing: boolean
    onToggle: () => void
    tone?: MediaTone
    size?: TransportSize
    words: { play: string; pause: string }
}) {
    return (
        <Button
            size={size === 'sm' ? 'icon' : 'icon-lg'}
            aria-label={playing ? words.pause : words.play}
            onClick={onToggle}
            className={cn(
                tone === 'overlay' && 'bg-terminal-foreground text-terminal hover:bg-terminal-foreground/85 hover:text-terminal',
                PLAY_SIZE[size],
            )}
        >
            {playing ? <Pause className="fill-current" aria-hidden /> : <Play className="translate-x-px fill-current" aria-hidden />}
        </Button>
    )
}

/** A transport button beside the play button: previous, next, skip back or forward. */
export function TransportButton({
    label,
    onClick,
    disabled = false,
    pressed,
    tone = 'surface',
    size = 'sm',
    className,
    children,
}: {
    label: string
    onClick?: () => void
    disabled?: boolean
    /** For a toggle such as shuffle; drawn in the accent while on. */
    pressed?: boolean
    tone?: MediaTone
    size?: TransportSize
    className?: string
    children: ReactNode
}) {
    return (
        <Button
            variant="ghost"
            size={size === 'sm' ? 'icon-sm' : size === 'md' ? 'icon' : 'icon-lg'}
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
            disabled={disabled}
            className={cn(
                toneButton(tone),
                pressed === true && (tone === 'overlay' ? 'text-terminal-accent' : 'text-primary-ink'),
                pressed === false && tone === 'surface' && 'text-muted-foreground',
                TRANSPORT_SIZE[size],
                className,
            )}
        >
            {children}
        </Button>
    )
}

/**
 * The seek slider between the elapsed and the remaining time. Given the track's `waveform`, the
 * slider is drawn as that waveform with the played part filled, and the same keys move it; its
 * bars widen once it is 64 pixels tall. `size="lg"` writes the times larger, for a screen of its own.
 */
export function Position({
    at,
    duration,
    buffered,
    label,
    onSeek,
    onScrub,
    tone = 'surface',
    waveform,
    height = 40,
    size = 'sm',
    className,
}: {
    at: number
    duration: number
    buffered?: readonly MediaRange[]
    label: string
    onSeek: (seconds: number) => void
    onScrub: (value: number | null) => void
    tone?: MediaTone
    /** The track's levels from start to end, each from 0 to 1. */
    waveform?: readonly number[]
    /** The waveform's height in pixels. */
    height?: number
    size?: 'sm' | 'lg'
    className?: string
}) {
    const valueText = (value: number) => `${formatTime(value)} / ${formatTime(duration)}`
    const broad = height >= 64
    const time = size === 'lg' ? 'w-14' : 'w-11'
    return (
        <div
            className={cn(
                'flex items-center font-mono tabular-nums',
                size === 'lg' ? 'gap-4 text-sm' : 'gap-2 text-xs',
                tone === 'overlay' ? 'text-terminal-foreground' : 'text-muted-foreground',
                className,
            )}
        >
            <span className={cn(time, 'shrink-0 text-right')}>{formatTime(at)}</span>
            {waveform === undefined ? (
                <MediaSlider
                    tone={tone}
                    value={at}
                    max={duration}
                    label={label}
                    valueText={valueText}
                    buffered={buffered}
                    step={SEEK_STEP}
                    largeStep={SEEK_LARGE_STEP}
                    onChange={onSeek}
                    onScrub={onScrub}
                    className="min-w-0 flex-1"
                />
            ) : (
                <AudioScrubber
                    data={waveform}
                    currentTime={at}
                    duration={duration}
                    label={label}
                    valueText={valueText}
                    step={SEEK_STEP}
                    largeStep={SEEK_LARGE_STEP}
                    onSeek={onSeek}
                    onScrub={onScrub}
                    height={height}
                    barWidth={broad ? 4 : 3}
                    barGap={2}
                    barRadius={broad ? 2 : 1}
                    className="min-w-0 flex-1 aria-disabled:opacity-50"
                />
            )}
            <span className={cn(time, 'shrink-0', tone === 'overlay' && 'text-terminal-muted')}>{formatRemaining(at, duration)}</span>
        </div>
    )
}

/** The playback speeds a speed menu offers unless told others, as multiples of normal speed. */
export const MEDIA_RATES: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

/** A speed as the menu writes it, such as "1.25x". */
export function formatRate(rate: number): string {
    return `${String(rate)}x`
}

/**
 * The playback speed as a button that says it ("1.25x") and opens a menu of `rates`. `container`
 * holds the menu inside an element that may go fullscreen, where a menu on the body would not show.
 */
export function RateMenu({
    rate,
    rates = MEDIA_RATES,
    onRateChange,
    label,
    format = formatRate,
    tone = 'surface',
    size = 'sm',
    container,
    onOpenChange,
    className,
}: {
    rate: number
    rates?: readonly number[]
    onRateChange: (rate: number) => void
    /** The menu's name, such as "Playback speed". */
    label: string
    format?: (rate: number) => string
    tone?: MediaTone
    size?: TransportSize
    container?: ComponentProps<typeof DropdownMenuContent>['container']
    onOpenChange?: (open: boolean) => void
    className?: string
}) {
    return (
        <DropdownMenu onOpenChange={onOpenChange}>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size={size === 'sm' ? 'icon-sm' : 'icon'}
                        aria-label={`${label}: ${format(rate)}`}
                        className={cn(
                            'w-auto min-w-8 px-1.5 font-mono text-xs tabular-nums',
                            toneButton(tone),
                            tone === 'surface' && 'text-muted-foreground',
                            className,
                        )}
                    />
                }
            >
                {format(rate)}
            </DropdownMenuTrigger>
            <DropdownMenuContent container={container} side="top" align="end" className="w-auto min-w-24">
                <DropdownMenuRadioGroup value={String(rate)} onValueChange={(value: string) => onRateChange(Number(value))}>
                    {rates.map((option) => (
                        <DropdownMenuRadioItem key={option} value={String(option)} className="font-mono tabular-nums">
                            {format(option)}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

/** The skip glyph: a turning arrow, back or forward, with the interval in seconds written inside it. */
export function SkipGlyph({ seconds, back, size = 'sm' }: { seconds: number; back: boolean; size?: TransportSize }) {
    const Arrow = back ? RotateCcw : RotateCw
    return (
        <span aria-hidden className="relative inline-flex items-center justify-center">
            <Arrow strokeWidth={1.75} className={size === 'lg' ? 'size-7' : 'size-6'} />
            <span
                className={cn(
                    'absolute inset-0 flex items-center justify-center pt-px leading-none font-semibold tabular-nums',
                    size === 'lg' ? 'text-xs' : 'text-2xs',
                )}
            >
                {Math.round(seconds)}
            </span>
        </span>
    )
}

/** What stands where the position would on a live stream, which has no length to seek along: a dot and "Live". */
export function LiveMark({ label, size = 'sm', className }: { label: string; size?: 'sm' | 'lg'; className?: string }) {
    return (
        <div
            data-slot="media-live"
            className={cn('flex items-center justify-center gap-1.5', size === 'lg' ? 'h-7 text-label' : 'h-5 text-badge', className)}
        >
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-destructive" />
            <span>{label}</span>
        </div>
    )
}

/** Mute and the volume slider, the slider hidden where `compact` says there is no room. */
export function VolumeControl({
    level,
    muted,
    onMutedChange,
    onVolumeChange,
    tone = 'surface',
    compact = false,
    words,
}: {
    /** From 0 to 1, as heard: zero while muted. */
    level: number
    muted: boolean
    onMutedChange?: (muted: boolean) => void
    onVolumeChange: (volume: number) => void
    tone?: MediaTone
    compact?: boolean
    words: { mute: string; unmute: string; volume: string }
}) {
    return (
        <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="icon-sm"
                aria-label={muted ? words.unmute : words.mute}
                aria-pressed={muted}
                disabled={onMutedChange === undefined}
                onClick={() => onMutedChange?.(!muted)}
                className={cn(toneButton(tone), tone === 'surface' && 'text-muted-foreground')}
            >
                <VolumeGlyph level={level} />
            </Button>
            {!compact && (
                <MediaSlider
                    tone={tone}
                    value={Math.round(level * 100)}
                    max={100}
                    label={words.volume}
                    valueText={(value) => `${String(Math.round(value))}%`}
                    onChange={(value) => {
                        onVolumeChange(value / 100)
                        if (muted && value > 0) onMutedChange?.(false)
                    }}
                    onScrub={(value) => {
                        if (value !== null) onVolumeChange(value / 100)
                    }}
                    className="w-24"
                />
            )}
        </div>
    )
}

/** Loud, quiet or silent, in the glyph. */
export function VolumeGlyph({ level, className }: { level: number; className?: string }) {
    if (level <= 0) return <VolumeX className={className} aria-hidden />
    if (level < 0.5) return <Volume1 className={className} aria-hidden />
    return <Volume2 className={className} aria-hidden />
}
