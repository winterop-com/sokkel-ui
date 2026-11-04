import { Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
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

/** The play button at the center of the transport, the one filled control. */
export function PlayButton({
    playing,
    onToggle,
    tone = 'surface',
    words,
}: {
    playing: boolean
    onToggle: () => void
    tone?: MediaTone
    words: { play: string; pause: string }
}) {
    return (
        <Button
            size="icon"
            aria-label={playing ? words.pause : words.play}
            onClick={onToggle}
            className={cn(tone === 'overlay' && 'bg-terminal-foreground text-terminal hover:bg-terminal-foreground/85 hover:text-terminal')}
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
    className,
    children,
}: {
    label: string
    onClick?: () => void
    disabled?: boolean
    /** For a toggle such as shuffle; drawn in the accent while on. */
    pressed?: boolean
    tone?: MediaTone
    className?: string
    children: ReactNode
}) {
    return (
        <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
            disabled={disabled}
            className={cn(
                toneButton(tone),
                pressed === true && (tone === 'overlay' ? 'text-terminal-accent' : 'text-primary-ink'),
                pressed === false && tone === 'surface' && 'text-muted-foreground',
                className,
            )}
        >
            {children}
        </Button>
    )
}

/** The seek slider between the elapsed and the remaining time. */
export function Position({
    at,
    duration,
    buffered,
    label,
    onSeek,
    onScrub,
    tone = 'surface',
}: {
    at: number
    duration: number
    buffered?: readonly MediaRange[]
    label: string
    onSeek: (seconds: number) => void
    onScrub: (value: number | null) => void
    tone?: MediaTone
}) {
    return (
        <div
            className={cn(
                'flex items-center gap-2 font-mono text-xs tabular-nums',
                tone === 'overlay' ? 'text-terminal-foreground' : 'text-muted-foreground',
            )}
        >
            <span className="w-11 shrink-0 text-right">{formatTime(at)}</span>
            <MediaSlider
                tone={tone}
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
            <span className={cn('w-11 shrink-0', tone === 'overlay' && 'text-terminal-muted')}>{formatRemaining(at, duration)}</span>
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
