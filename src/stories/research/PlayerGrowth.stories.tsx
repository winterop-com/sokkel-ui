import type { Meta, StoryObj } from '@storybook/react-vite'
import { ListMusic, Maximize2, Minimize2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'

import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import type { RepeatMode } from '@winterop-com/sokkel-ui/media/MediaBar'
import { PlayButton, Position, TransportButton, VolumeControl } from '@winterop-com/sokkel-ui/media/MediaControls'
import { SoundVisualizer, type SoundKind } from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import { formatRemaining, formatTime } from '@winterop-com/sokkel-ui/media/time'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { ResizeHandle } from '@winterop-com/sokkel-ui/ResizeHandle'
import { Segmented, type Segment } from '@winterop-com/sokkel-ui/Segmented'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { AudioScrubber } from '@winterop-com/sokkel-ui/primitives/waveform'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { Artwork, type Cover as CoverArt } from '../fixtures/Artwork'
import { FRAME } from '../media/fixtures/sound'
import { waveformOf } from '../media/fixtures/waveform'

/**
 * Three ways for the player along the foot of a screen to grow from its one line (64 pixels) to
 * the large now-playing panel (300 pixels) and on into a fullscreen view, so every height looks
 * meant and the growth has no jump. Every option plays the same track at the same place, and
 * every bar here drags from its top edge and opens its fullscreen view from the corner button.
 *
 * - A, Liner: the large panel from 104 pixels on, its words, waveform and cover scaling with the
 *   height. Its fullscreen keeps the words at the lower left over the visualizer.
 * - B, Stage: a centered stage between the cover and the volume, the words over a wide waveform
 *   with the transport under it. Its fullscreen centers the cover inside the visualizer.
 * - C, Two rows: what plays and the transport over a full-width waveform, one layout from the
 *   one line up. Its fullscreen opens the visualizer between the two rows.
 *
 * No option is picked yet.
 */
const meta: Meta = {
    title: 'Research/Player growth',
    tags: ['no-screenshot'],
    decorators: [
        (Story) => (
            <TooltipProvider>
                <Story />
            </TooltipProvider>
        ),
    ],
}
export default meta

/** What plays in every option: the fourth of ten tracks on Open Water, 1:23 into its 5:12. */
const TRACK = {
    title: 'Harbor at Dusk',
    artist: 'Grace',
    album: 'Open Water',
    year: 2025,
    number: 4,
    count: 10,
    position: 83,
    duration: 312,
    cover: { motif: 'wave', from: 'blue', to: 'teal' } satisfies CoverArt,
}

/** The track's loudness from start to end, drawn as every waveform scrubber. */
const WAVEFORM = waveformOf(4)

/** The heights every option is shown at, in pixels. */
const HEIGHTS = [64, 110, 150, 200, 300] as const

/** The one-line bar's height, the least a bar is dragged to, and the most it is dragged to. */
const LINE = 64
const MOST = 360

/** The transport's row under a panel: `--spacing-shell-foot`. */
const FOOT = 46

/** The bar's width from which it lays out on one row, as MediaBar's `@2xl`. */
const WIDE = 672

/** The fullscreen view's width under which it is laid out for a phone. */
const PHONE = 640

const KINDS: readonly Segment<SoundKind>[] = [
    { value: 'spectrum', label: 'Spectrum' },
    { value: 'area', label: 'Area' },
    { value: 'wave', label: 'Wave' },
    { value: 'ring', label: 'Ring' },
]

const WORDS = { play: 'Play', pause: 'Pause', mute: 'Mute', unmute: 'Unmute', volume: 'Volume' }
const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' }

/** How far `value` has come from `from` to `to`, from 0 to 1. */
const ramp = (value: number, from: number, to: number) => Math.min(1, Math.max(0, (value - from) / (to - from)))

/** The whole number `at` of the way from `from` to `to`. */
const mix = (from: number, to: number, at: number) => Math.round(from + (to - from) * at)

/**
 * How strongly the visualizer shows behind the words: nothing at `from`, rising fast at first so
 * it is plainly there a few pixels on, and at its most from `to`, still faint enough to read over.
 */
const glow = (height: number, from: number, to: number) => 0.3 * Math.sqrt(ramp(height, from, to))

/**
 * How much the words say in the room they have: the title and artist on one line, the two on two
 * lines, the liner (a line in the accent over the title and the artist), and the liner at its largest.
 */
type Tier = 'line' | 'pair' | 'liner' | 'poster'

/** The room each tier needs, in pixels. */
const TIER_ROOM: Record<Tier, number> = { line: 22, pair: 44, liner: 74, poster: 120 }

function tierFor(room: number): Tier {
    if (room >= TIER_ROOM.poster) return 'poster'
    if (room >= TIER_ROOM.liner) return 'liner'
    if (room >= TIER_ROOM.pair) return 'pair'
    return 'line'
}

/** On a narrow bar a title beside a cover keeps the liner's size, as the largest would not fit its width. */
const narrowTier = (tier: Tier): Tier => (tier === 'poster' ? 'liner' : tier)

// ---------------------------------------------------------------------------------------------
// The player's state and the pieces every option draws from

interface Player {
    playing: boolean
    setPlaying: (playing: boolean) => void
    position: number
    seek: (seconds: number) => void
    volume: number
    setVolume: (volume: number) => void
    muted: boolean
    setMuted: (muted: boolean) => void
    shuffle: boolean
    setShuffle: (shuffle: boolean) => void
    repeat: RepeatMode
    setRepeat: (repeat: RepeatMode) => void
}

/** A bar's own state, so its controls answer; it starts the same every time. */
function usePlayer(): Player {
    const [playing, setPlaying] = useState(true)
    const [position, seek] = useState(TRACK.position)
    const [volume, setVolume] = useState(0.7)
    const [muted, setMuted] = useState(false)
    const [shuffle, setShuffle] = useState(false)
    const [repeat, setRepeat] = useState<RepeatMode>('all')
    return { playing, setPlaying, position, seek, volume, setVolume, muted, setMuted, shuffle, setShuffle, repeat, setRepeat }
}

/** The cover, square, `size` pixels across at most; flush covers have no corners. */
function Cover({ size, flush = false, className }: { size: number; flush?: boolean; className?: string }) {
    return (
        <div
            className={cn('aspect-square max-w-full shrink-0 overflow-hidden bg-muted', !flush && 'rounded-mini', className)}
            style={{ width: size }}
        >
            <Artwork cover={TRACK.cover} />
        </div>
    )
}

/** The line in the accent over a large title: the place, the album and the year. */
function Eyebrow({ className }: { className?: string }) {
    return (
        <GroupLabel className={cn('truncate text-primary-ink', className)}>
            <MetaLine inline items={[`Track ${String(TRACK.number)} of ${String(TRACK.count)}`, TRACK.album, TRACK.year]} />
        </GroupLabel>
    )
}

/** What plays, saying as much as the tier allows. */
function Words({ tier, center = false, className }: { tier: Tier; center?: boolean; className?: string }) {
    const align = center && 'text-center'
    if (tier === 'line') {
        return (
            <p className={cn('truncate text-sm', align, className)}>
                <span className="font-semibold text-foreground">{TRACK.title}</span>
                <span className="text-muted-foreground"> · {TRACK.artist}</span>
            </p>
        )
    }
    if (tier === 'pair') {
        return (
            <div className={cn('min-w-0', align, className)}>
                <p className="truncate text-base font-semibold text-foreground">{TRACK.title}</p>
                <MetaLine items={[TRACK.artist, TRACK.album]} truncate />
            </div>
        )
    }
    const poster = tier === 'poster'
    return (
        <div className={cn('min-w-0', align, className)}>
            <Eyebrow />
            <p className={cn('truncate font-semibold tracking-tight text-foreground', poster ? 'text-stat' : 'text-page')}>{TRACK.title}</p>
            <p className={cn('truncate text-muted-foreground', poster ? 'text-base' : 'text-sm')}>{TRACK.artist}</p>
        </div>
    )
}

/** The title and the artist under it, small, as the one-line bar writes them. */
function SmallWords() {
    return (
        <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{TRACK.title}</p>
            <MetaLine items={[TRACK.artist, TRACK.album]} truncate />
        </div>
    )
}

/** The waveform scrubber between the elapsed and the remaining time, `height` pixels tall. */
function Scrub({ p, height, large = false, className }: { p: Player; height: number; large?: boolean; className?: string }) {
    const wide = height >= 64
    return (
        <div
            className={cn(
                'flex items-center gap-2 font-mono leading-none text-muted-foreground tabular-nums',
                large ? 'gap-4 text-sm' : 'text-xs',
                className,
            )}
        >
            <span className={cn('shrink-0 text-right', large ? 'w-14' : 'w-11')}>{formatTime(p.position)}</span>
            <AudioScrubber
                data={WAVEFORM}
                currentTime={p.position}
                duration={TRACK.duration}
                onSeek={p.seek}
                label="Seek"
                valueText={(value) => `${formatTime(value)} / ${formatTime(TRACK.duration)}`}
                height={height}
                barWidth={wide ? 4 : 3}
                barGap={2}
                barRadius={wide ? 2 : 1}
                className="min-w-0 flex-1"
            />
            <span className={cn('shrink-0', large ? 'w-14' : 'w-11')}>{formatRemaining(p.position, TRACK.duration)}</span>
        </div>
    )
}

function ShuffleButton({ p }: { p: Player }) {
    return (
        <TransportButton label="Shuffle" pressed={p.shuffle} onClick={() => p.setShuffle(!p.shuffle)}>
            <Shuffle aria-hidden />
        </TransportButton>
    )
}

function RepeatButton({ p }: { p: Player }) {
    return (
        <TransportButton
            label={p.repeat === 'one' ? 'Repeat one' : p.repeat === 'all' ? 'Repeat all' : 'Repeat'}
            pressed={p.repeat !== 'off'}
            onClick={() => p.setRepeat(NEXT_REPEAT[p.repeat])}
        >
            {p.repeat === 'one' ? <Repeat1 aria-hidden /> : <Repeat aria-hidden />}
        </TransportButton>
    )
}

/** Previous, play and next, at the bar's size or larger for a tall panel and a fullscreen view. */
function Steps({ p, size = 'bar' }: { p: Player; size?: 'bar' | 'tall' | 'screen' }) {
    if (size === 'bar') {
        return (
            <>
                <TransportButton label="Previous" onClick={() => p.seek(0)}>
                    <SkipBack className="fill-current" aria-hidden />
                </TransportButton>
                <PlayButton playing={p.playing} onToggle={() => p.setPlaying(!p.playing)} words={WORDS} />
                <TransportButton label="Next" onClick={() => p.seek(0)}>
                    <SkipForward className="fill-current" aria-hidden />
                </TransportButton>
            </>
        )
    }
    const screen = size === 'screen'
    const glyph = screen ? 'size-5 fill-current' : 'size-4 fill-current'
    return (
        <>
            <Button variant="ghost" size={screen ? 'icon-lg' : 'icon'} aria-label="Previous" onClick={() => p.seek(0)}>
                <SkipBack className={glyph} aria-hidden />
            </Button>
            <Button
                size="icon-lg"
                aria-label={p.playing ? 'Pause' : 'Play'}
                onClick={() => p.setPlaying(!p.playing)}
                className={cn(screen && 'size-14 rounded-surface')}
            >
                {p.playing ? (
                    <Pause className={screen ? 'size-6 fill-current' : 'size-4 fill-current'} aria-hidden />
                ) : (
                    <Play className={cn('translate-x-px', screen ? 'size-6 fill-current' : 'size-4 fill-current')} aria-hidden />
                )}
            </Button>
            <Button variant="ghost" size={screen ? 'icon-lg' : 'icon'} aria-label="Next" onClick={() => p.seek(0)}>
                <SkipForward className={glyph} aria-hidden />
            </Button>
        </>
    )
}

function Volume({ p, compact = false }: { p: Player; compact?: boolean }) {
    return (
        <VolumeControl
            level={p.muted ? 0 : p.volume}
            muted={p.muted}
            onMutedChange={p.setMuted}
            onVolumeChange={p.setVolume}
            compact={compact}
            words={WORDS}
        />
    )
}

function Queue() {
    return (
        <TransportButton label="Queue">
            <ListMusic aria-hidden />
        </TransportButton>
    )
}

/** The button that opens the fullscreen view, as the library's other fullscreen buttons. */
function FullscreenButton({ onClick, className }: { onClick: () => void; className?: string }) {
    return (
        <IconButton label="Fullscreen" onClick={onClick} className={className}>
            <Maximize2 aria-hidden />
        </IconButton>
    )
}

/** The visualizer behind the words at `strength`, drawn from the still frame; nothing at zero. */
function Backdrop({
    strength,
    align = 'bottom',
    className,
    style,
}: {
    strength: number
    align?: 'bottom' | 'center'
    className?: string
    style?: CSSProperties
}) {
    if (strength <= 0) return null
    return (
        <div aria-hidden className={cn('pointer-events-none absolute inset-0', className)} style={{ ...style, opacity: strength }}>
            <SoundVisualizer frame={FRAME} align={align} label="What is playing" />
        </div>
    )
}

/** What every option's bar is given. */
interface BarProps {
    height: number
    width: number
    p: Player
    onFullscreen: () => void
}

/** What every option's fullscreen view is given. */
interface FullProps {
    width: number
    height: number
    p: Player
    kind: SoundKind
    onKind: (kind: SoundKind) => void
    onLeave: () => void
}

/**
 * The one-line bar, as MediaBar draws it today, with the fullscreen button at its end: what plays
 * at the left with the cover growing, the transport over the position in the middle, the volume
 * at the right. Under `WIDE` it folds into two rows. A and B start here.
 */
function LineBar({ height, width, p, onFullscreen }: BarProps) {
    if (width < WIDE) {
        return (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                    <Cover size={40} />
                    <SmallWords />
                </div>
                <div className="flex items-center gap-1">
                    <Steps p={p} />
                    <FullscreenButton onClick={onFullscreen} />
                </div>
                <div className="col-span-2">
                    <Position at={p.position} duration={TRACK.duration} label="Seek" onSeek={p.seek} onScrub={() => undefined} />
                </div>
            </div>
        )
    }
    return (
        <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] items-center gap-x-6 px-3">
            <div className="flex min-w-0 items-center gap-3">
                <Cover size={Math.max(48, height - 16)} />
                <SmallWords />
            </div>
            <div className="flex min-w-0 flex-col justify-center gap-0.5">
                <div className="flex items-center justify-center gap-2">
                    <ShuffleButton p={p} />
                    <Steps p={p} />
                    <RepeatButton p={p} />
                </div>
                <Position at={p.position} duration={TRACK.duration} label="Seek" onSeek={p.seek} onScrub={() => undefined} />
            </div>
            <div className="flex min-w-0 items-center justify-end gap-2">
                <Volume p={p} />
                <Queue />
                <FullscreenButton onClick={onFullscreen} />
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------------------------
// A. Liner: the large panel early, scaling with the height

/** The height from which A is the panel. */
const LINER_FROM = 104

/**
 * From `LINER_FROM` on, the panel: the cover flush and as tall as the bar, the words and the
 * waveform in the room over the transport, the visualizer fading in behind them. The words say
 * more as the room grows (one line, two, the liner, the liner large), the waveform grows from 20 to
 * 52 pixels, and the fullscreen button keeps the room's top right corner.
 */
function LinerBar(props: BarProps) {
    const { height, width, p, onFullscreen } = props
    if (height < LINER_FROM) return <LineBar {...props} />
    const narrow = width < WIDE
    const grown = ramp(height, LINER_FROM, 300)
    const wave = mix(24, 60, grown)
    const gap = mix(6, 12, grown)
    const room = height - FOOT - wave - gap - 12
    const tier = narrow ? narrowTier(tierFor(room)) : tierFor(room)
    // On a narrow bar the cover moves beside the words, once there is room for one.
    const small = Math.min(112, room)
    return (
        <div className="flex h-full">
            {!narrow && <Cover size={height} flush />}
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="relative min-h-0 flex-1 overflow-hidden">
                    <div className="relative flex h-full flex-col justify-end px-5 pt-2 pb-1" style={{ gap }}>
                        {/* The visualizer fills the room over the waveform and stands on it, never behind it. */}
                        <div className="relative flex min-h-0 flex-1 items-end">
                            <Backdrop strength={glow(height, LINER_FROM - 8, 220)} className="-inset-x-5 -top-2" />
                            <div className="relative flex min-w-0 flex-1 items-end gap-3 pr-8">
                                {narrow && small >= 44 && <Cover size={small} />}
                                <Words tier={tier} className="min-w-0 flex-1" />
                            </div>
                        </div>
                        <Scrub p={p} height={wave} />
                    </div>
                    <FullscreenButton onClick={onFullscreen} className="absolute top-1.5 right-1.5" />
                </div>
                <div className={cn('flex h-shell-foot shrink-0 items-center gap-1 px-3', narrow && 'justify-center')}>
                    {!narrow && <ShuffleButton p={p} />}
                    {!narrow && <RepeatButton p={p} />}
                    <Steps p={p} />
                    {!narrow && (
                        <>
                            <div className="flex-1" />
                            <Volume p={p} />
                            <Queue />
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

/**
 * A's fullscreen: the panel's liner at full size in the lower left, over the visualizer filling
 * the screen at full strength and fading into the ground under the words, with the waveform and
 * the transport along the foot.
 */
function LinerFull({ width, p, kind, onKind, onLeave }: FullProps) {
    const phone = width < PHONE
    return (
        <Screen kind={kind} onKind={onKind} onLeave={onLeave}>
            <div className="relative min-h-0 flex-1">
                <div className={cn('absolute inset-0', phone ? 'px-3 pt-20' : 'px-8 pt-16')}>
                    <SoundVisualizer frame={FRAME} kind={kind} label="What is playing" />
                </div>
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-background via-background/80 to-transparent"
                />
                <div className={cn('absolute inset-x-0 bottom-0 flex min-w-0 items-end', phone ? 'gap-4 px-5' : 'gap-7 px-10')}>
                    <Cover size={phone ? 88 : 208} className="rounded-surface shadow-pop" />
                    <div className="min-w-0 pb-1">
                        <Eyebrow />
                        <p className={cn('truncate font-semibold tracking-tight', phone ? 'text-page' : 'text-stat')}>{TRACK.title}</p>
                        <p className={cn('truncate text-muted-foreground', phone ? 'text-sm' : 'text-page')}>{TRACK.artist}</p>
                    </div>
                </div>
            </div>
            <div className={cn('relative flex flex-col', phone ? 'gap-5 px-5 pt-5 pb-6' : 'gap-7 px-10 pt-7 pb-8')}>
                <Scrub p={p} height={phone ? 44 : 64} large={!phone} />
                <div className={cn('flex items-center gap-2', phone && 'justify-center')}>
                    <ShuffleButton p={p} />
                    {!phone && <RepeatButton p={p} />}
                    <Steps p={p} size="screen" />
                    {phone && <RepeatButton p={p} />}
                    {!phone && (
                        <>
                            <div className="flex-1" />
                            <Volume p={p} />
                            <Queue />
                        </>
                    )}
                </div>
            </div>
        </Screen>
    )
}

// ---------------------------------------------------------------------------------------------
// B. Stage: a centered stage between the cover and the volume

/** The height from which B is the stage. */
const STAGE_FROM = 96

/**
 * From `STAGE_FROM` on, three columns: the cover at the left, inset and growing; the stage in the
 * middle, centered on the bar, with the words over a wide waveform and the transport under it;
 * the fullscreen button at the top right and the volume at the foot of the right column. The
 * visualizer rises behind the stage, mirrored about its middle; the words grow as in A.
 */
function StageBar(props: BarProps) {
    const { height, width, p, onFullscreen } = props
    if (height < STAGE_FROM) return <LineBar {...props} />
    const narrow = width < WIDE
    const grown = ramp(height, STAGE_FROM, 300)
    const pad = mix(10, 16, ramp(height, STAGE_FROM, 220))
    const wave = mix(24, 56, grown)
    const gap = mix(4, 12, grown)
    const room = height - 2 * pad - wave - 36 - 2 * gap
    const tier = tierFor(room)
    const cover = height - 2 * pad
    const tall = height >= 260
    // The two sides are as wide as each other, so the stage stays centered on the bar: as wide as
    // the cover, and never narrower than the volume needs.
    const side = Math.max(cover, 176)
    return (
        <div className="relative h-full">
            {/* Over the waveform, from the cover to the bar's end, standing on the waveform. */}
            <Backdrop
                strength={glow(height, STAGE_FROM - 8, 220)}
                style={{ left: narrow ? 0 : cover + 2 * pad, bottom: pad + 36 + 2 * gap + wave }}
            />
            <div
                className={cn('relative grid h-full gap-x-6', narrow && 'grid-cols-1')}
                style={{ padding: pad, gridTemplateColumns: narrow ? undefined : `${String(side)}px minmax(0,1fr) ${String(side)}px` }}
            >
                {!narrow && (
                    <div className="flex min-w-0 items-center">
                        <Cover size={cover} className={cn(cover >= 160 && 'rounded-surface')} />
                    </div>
                )}
                <div className="flex min-w-0 flex-col items-center justify-end" style={{ gap }}>
                    <Words tier={tier} center className="w-full px-8" />
                    <Scrub p={p} height={wave} className="w-full" />
                    <div className="flex h-9 items-center justify-center gap-2">
                        {!narrow && <ShuffleButton p={p} />}
                        <Steps p={p} size={tall ? 'tall' : 'bar'} />
                        {!narrow && <RepeatButton p={p} />}
                    </div>
                </div>
                {!narrow && (
                    <div className="flex min-w-0 flex-col items-end justify-end">
                        <div className="flex h-9 items-center gap-2">
                            <Volume p={p} />
                            <Queue />
                        </div>
                    </div>
                )}
            </div>
            <FullscreenButton onClick={onFullscreen} className="absolute top-1.5 right-1.5" />
        </div>
    )
}

/**
 * B's fullscreen: everything on the screen's middle line, as a phone's now-playing screen. The
 * cover stands inside the visualizer, which spreads to either side of it (or rings it, the cover
 * set in the ring's middle), and the words, the waveform, the transport and the volume follow
 * under it, centered.
 */
function StageFull({ width, height, p, kind, onKind, onLeave }: FullProps) {
    const phone = width < PHONE
    const band = Math.round(phone ? Math.min(width * 0.9, height * 0.4) : Math.min(height * 0.46, 440))
    const ring = kind === 'ring'
    return (
        <Screen kind={kind} onKind={onKind} onLeave={onLeave}>
            <div className={cn('flex h-full flex-col items-center justify-center', phone ? 'gap-6 px-5 pt-14' : 'gap-8 px-10')}>
                <div className="relative flex w-full shrink-0 items-center justify-center" style={{ height: band }}>
                    <div className={cn('absolute inset-y-0', phone ? '-inset-x-5' : '-inset-x-10')}>
                        <SoundVisualizer
                            frame={FRAME}
                            kind={kind}
                            align="center"
                            label="What is playing"
                            middle={ring ? <Artwork cover={TRACK.cover} /> : undefined}
                        />
                    </div>
                    {!ring && <Cover size={Math.round(band * 0.78)} className="relative rounded-surface shadow-pop" />}
                </div>
                <div className={cn('flex w-full flex-col items-center', phone ? 'gap-4' : 'max-w-3xl gap-5')}>
                    <div className="w-full min-w-0 text-center">
                        <Eyebrow />
                        <p className={cn('truncate font-semibold tracking-tight', phone ? 'text-page' : 'text-stat')}>{TRACK.title}</p>
                        <p className={cn('truncate text-muted-foreground', phone ? 'text-sm' : 'text-page')}>{TRACK.artist}</p>
                    </div>
                    <Scrub p={p} height={phone ? 44 : 56} large={!phone} className="w-full" />
                    <div className="flex items-center justify-center gap-3">
                        <ShuffleButton p={p} />
                        <Steps p={p} size="screen" />
                        <RepeatButton p={p} />
                    </div>
                    {!phone && (
                        <div className="flex items-center gap-2">
                            <Volume p={p} />
                            <Queue />
                        </div>
                    )}
                </div>
            </div>
        </Screen>
    )
}

// ---------------------------------------------------------------------------------------------
// C. Two rows: what plays and the transport over a full-width waveform

/**
 * One layout from the one line up: the cover at the left across both rows, the words, the
 * transport (centered) and the volume in the top row, and a waveform as wide as the rest of the
 * bar in the bottom row, growing from 18 to 96 pixels. The top row takes what the waveform leaves,
 * its words saying more as it grows, and the visualizer fades in behind it from 96 pixels, its
 * bars standing on the waveform. The fullscreen button ends the top row until the row is tall
 * enough to give it the corner.
 */
function TwoRowsBar({ height, width, p, onFullscreen }: BarProps) {
    const narrow = width < WIDE
    const compact = height < 96
    const padY = compact ? 6 : mix(10, 14, ramp(height, 96, 300))
    const wave = mix(18, 96, ramp(height, LINE, 260))
    const gap = compact ? 2 : 8
    const head = height - 2 * padY - wave - gap
    // On a narrow bar the cover moves into the top row beside the words, so the waveform has the
    // width, and the words stop at two lines, as the transport shares their row.
    const tier = narrow && tierFor(head) !== 'line' ? 'pair' : tierFor(head)
    const cover = height - 2 * padY
    const thumb = Math.min(head, 72)
    const corner = head >= 64
    return (
        <div className={cn('relative flex h-full px-3', compact ? 'gap-3' : 'gap-4')} style={{ paddingBlock: padY }}>
            {!narrow && <Cover size={cover} className={cn('self-center', cover >= 160 && 'rounded-surface')} />}
            <div className="flex min-w-0 flex-1 flex-col" style={{ gap }}>
                <div
                    className={cn(
                        'relative grid min-h-0 flex-1',
                        narrow ? 'grid-cols-[minmax(0,1fr)_auto] gap-x-3' : 'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-6',
                        compact ? 'items-center' : 'items-end',
                    )}
                >
                    <Backdrop strength={glow(height, 88, 220)} className="-top-3" />
                    <div className="relative flex min-w-0 items-end gap-3">
                        {narrow && <Cover size={thumb} className="self-center" />}
                        <Words tier={tier} className="min-w-0 flex-1" />
                    </div>
                    <div className="relative flex items-center gap-2">
                        {!narrow && <ShuffleButton p={p} />}
                        <Steps p={p} size={height >= 260 ? 'tall' : 'bar'} />
                        {!narrow && <RepeatButton p={p} />}
                        {narrow && !corner && <FullscreenButton onClick={onFullscreen} />}
                    </div>
                    {!narrow && (
                        <div className="relative flex min-w-0 items-center justify-end gap-2">
                            <Volume p={p} />
                            <Queue />
                            {!corner && <FullscreenButton onClick={onFullscreen} />}
                        </div>
                    )}
                </div>
                <Scrub p={p} height={wave} />
            </div>
            {corner && <FullscreenButton onClick={onFullscreen} className="absolute top-1.5 right-1.5" />}
        </div>
    )
}

/**
 * C's fullscreen: the two rows pulled apart with the visualizer between them. What plays, the
 * transport and the volume across the head; the visualizer at full strength filling the middle;
 * the waveform, tall and as wide as the screen, along the foot. On a phone the transport moves
 * under the waveform.
 */
function TwoRowsFull({ width, p, kind, onKind, onLeave }: FullProps) {
    const phone = width < PHONE
    return (
        <Screen kind={kind} onKind={onKind} onLeave={onLeave}>
            <div
                className={cn(
                    'grid items-end',
                    phone ? 'grid-cols-1 px-5 pt-20' : 'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-8 px-10 pt-16',
                )}
            >
                <div className={cn('flex min-w-0 items-end', phone ? 'gap-4' : 'gap-6')}>
                    <Cover size={phone ? 72 : 144} className="rounded-surface shadow-pop" />
                    <div className="min-w-0 pb-0.5">
                        <Eyebrow />
                        <p className={cn('truncate font-semibold tracking-tight', phone ? 'text-page' : 'text-stat')}>{TRACK.title}</p>
                        <p className={cn('truncate text-muted-foreground', phone ? 'text-sm' : 'text-page')}>{TRACK.artist}</p>
                    </div>
                </div>
                {!phone && (
                    <>
                        <div className="flex h-14 items-center gap-3">
                            <ShuffleButton p={p} />
                            <Steps p={p} size="screen" />
                            <RepeatButton p={p} />
                        </div>
                        <div className="flex h-14 min-w-0 items-center justify-end gap-2">
                            <Volume p={p} />
                            <Queue />
                        </div>
                    </>
                )}
            </div>
            <div className={cn('min-h-0 flex-1', phone ? 'px-5 py-5' : 'px-10 py-8')}>
                <SoundVisualizer frame={FRAME} kind={kind} label="What is playing" />
            </div>
            <div className={cn('flex flex-col', phone ? 'gap-4 px-5 pb-6' : 'px-10 pb-10')}>
                <Scrub p={p} height={phone ? 64 : 112} large={!phone} />
                {phone && (
                    <div className="flex items-center justify-center gap-2">
                        <ShuffleButton p={p} />
                        <Steps p={p} size="screen" />
                        <RepeatButton p={p} />
                    </div>
                )}
            </div>
        </Screen>
    )
}

// ---------------------------------------------------------------------------------------------
// The fullscreen view's frame, the bar's frame, and the stories

/**
 * The ground every fullscreen view stands on: the dark scheme in either, as a dark room for the
 * visualizer and as the video player's fullscreen is, with the kind picker and the button that
 * leaves in the top right corner, where the bar's fullscreen button was.
 */
function Screen({
    kind,
    onKind,
    onLeave,
    children,
}: {
    kind: SoundKind
    onKind: (kind: SoundKind) => void
    onLeave: () => void
    children: ReactNode
}) {
    return (
        <div className="dark relative flex size-full flex-col overflow-hidden bg-background text-foreground">
            {children}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                <Segmented label="Visualizer" value={kind} options={KINDS} onChoose={onKind} />
                <IconButton label="Exit fullscreen" side="bottom" onClick={onLeave}>
                    <Minimize2 aria-hidden />
                </IconButton>
            </div>
        </div>
    )
}

interface Option {
    letter: string
    name: string
    Bar: (props: BarProps) => ReactNode
    Full: (props: FullProps) => ReactNode
}

const LINER: Option = { letter: 'A', name: 'Liner', Bar: LinerBar, Full: LinerFull }
const STAGE: Option = { letter: 'B', name: 'Stage', Bar: StageBar, Full: StageFull }
const TWO_ROWS: Option = { letter: 'C', name: 'Two rows', Bar: TwoRowsBar, Full: TwoRowsFull }
const OPTIONS = [LINER, STAGE, TWO_ROWS]

/** The element's size, measured before paint and on every resize; a desktop's until measured. */
function useBox(ref: RefObject<HTMLDivElement | null>): { width: number; height: number } {
    const [box, setBox] = useState({ width: 1200, height: 900 })
    useLayoutEffect(() => {
        const element = ref.current
        if (element === null) return
        const measure = () =>
            setBox((last) =>
                last.width === element.clientWidth && last.height === element.clientHeight
                    ? last
                    : { width: element.clientWidth, height: element.clientHeight },
            )
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(element)
        return () => observer.disconnect()
    }, [ref])
    return box
}

/**
 * Whether the element is in fullscreen, as the library's other fullscreen buttons do it:
 * `requestFullscreen` on the element and `document.exitFullscreen` to leave, followed through
 * `fullscreenchange` so the browser's own Escape leaves too. Where the browser refuses, and in the
 * fullscreen stories, the view fills the canvas instead, and Escape leaves it there as well.
 */
function useFullscreen(ref: RefObject<HTMLDivElement | null>, startOpen: boolean) {
    const [open, setOpen] = useState(startOpen)
    useEffect(() => {
        const change = () => setOpen(document.fullscreenElement !== null && document.fullscreenElement === ref.current)
        document.addEventListener('fullscreenchange', change)
        return () => document.removeEventListener('fullscreenchange', change)
    }, [ref])
    useEffect(() => {
        if (!open) return
        const key = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && document.fullscreenElement === null) setOpen(false)
        }
        window.addEventListener('keydown', key)
        return () => window.removeEventListener('keydown', key)
    }, [open])
    const enter = () => {
        const element = ref.current
        if (element === null) return
        if (typeof element.requestFullscreen === 'function') void element.requestFullscreen().catch(() => setOpen(true))
        else setOpen(true)
    }
    const leave = () => {
        if (document.fullscreenElement !== null) void document.exitFullscreen().catch(() => undefined)
        setOpen(false)
    }
    return { open, enter, leave }
}

/**
 * One option's player, `start` pixels tall, resizable from its top edge as MediaBar is, and
 * opening the option's fullscreen view from its corner button.
 */
function Dock({ option, start, open = false }: { option: Option; start: number; open?: boolean }) {
    const outer = useRef<HTMLDivElement | null>(null)
    const bar = useRef<HTMLDivElement | null>(null)
    const box = useBox(outer)
    const [height, setHeight] = useState(start)
    const [kind, setKind] = useState<SoundKind>('spectrum')
    const p = usePlayer()
    const screen = useFullscreen(outer, open)
    const { Bar, Full } = option
    // A bar folded for a phone may stand taller than its size, as MediaBar's one line does.
    const folded = box.width < WIDE && option !== TWO_ROWS && height < (option === LINER ? LINER_FROM : STAGE_FROM)
    return (
        <div ref={outer} className={cn(screen.open && 'h-svh w-full')}>
            {screen.open ? (
                <Full width={box.width} height={box.height} p={p} kind={kind} onKind={setKind} onLeave={screen.leave} />
            ) : (
                <div
                    ref={bar}
                    className="relative border-t border-border-strong bg-sidebar text-sidebar-foreground"
                    style={folded ? { minHeight: height } : { height }}
                >
                    <ResizeHandle
                        target={bar}
                        size={height}
                        onSize={setHeight}
                        onReset={() => setHeight(start)}
                        min={LINE}
                        max={MOST}
                        axis="y"
                        grows={-1}
                        follow={false}
                        label="Resize the player"
                        className="absolute inset-x-0 top-0 my-0 -translate-y-1/2"
                    />
                    <div className="h-full overflow-hidden">
                        <Bar height={height} width={box.width} p={p} onFullscreen={screen.enter} />
                    </div>
                </div>
            )}
        </div>
    )
}

/** A bar at one height in a sheet of them, framed so it reads as a strip. */
function Sample({ option, height }: { option: Option; height: number }) {
    return (
        <div className="border-x border-b border-border-strong">
            <Dock option={option} start={height} />
        </div>
    )
}

/** One option at every height, labeled. */
function Ladder({ option }: { option: Option }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground max-sm:px-3">
            <div className="mx-auto flex max-w-300 flex-col gap-6">
                <h1 className="text-title font-semibold">
                    {option.letter}. {option.name}
                </h1>
                {HEIGHTS.map((height) => (
                    <section key={height} className="flex flex-col gap-1.5">
                        <GroupLabel as="h2">{height} px</GroupLabel>
                        <Sample option={option} height={height} />
                    </section>
                ))}
            </div>
        </div>
    )
}

/** A fullscreen view filling the canvas, as the corner button opens it; leaving shows the bar at the foot. */
function Fullscreen({ option }: { option: Option }) {
    return (
        <div className="flex min-h-svh flex-col justify-end bg-background">
            <Dock option={option} start={300} open />
        </div>
    )
}

/**
 * A, Liner: from 104 pixels the player is the large panel, its cover flush and as tall as the
 * bar, and everything in it grows with the height; below 104 it is today's one line. The
 * visualizer shows from 104 pixels, fading in until 220.
 */
export const Liner: StoryObj = { render: () => <Ladder option={LINER} /> }

/**
 * B, Stage: from 96 pixels a stage centered on the bar holds the words over a wide waveform with
 * the transport under it, between the cover and the volume; below 96 it is today's one line. The
 * visualizer shows behind the stage from 96 pixels, fading in until 220.
 */
export const Stage: StoryObj = { render: () => <Ladder option={STAGE} /> }

/**
 * C, Two rows: one layout from 64 pixels to the top, what plays and the transport over a waveform
 * that grows from 18 to 96 pixels. The visualizer shows behind the top row from 96 pixels, fading
 * in until 220.
 */
export const TwoRows: StoryObj = { name: 'Two rows', render: () => <Ladder option={TWO_ROWS} /> }

/** The three options at the same heights, one under the other at each, at a desktop width. */
export const SideBySide: StoryObj = {
    name: 'Side by side',
    render: () => (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-336 flex-col gap-10">
                {HEIGHTS.map((height) => (
                    <section key={height} className="flex flex-col gap-3">
                        <h2 className="text-title font-semibold">{height} px</h2>
                        {OPTIONS.map((option) => (
                            <div key={option.letter} className="flex gap-4 max-md:flex-col max-md:gap-1.5">
                                <GroupLabel className="w-32 shrink-0 pt-2">
                                    {option.letter}. {option.name}
                                </GroupLabel>
                                <div className="min-w-0 flex-1">
                                    <Sample option={option} height={height} />
                                </div>
                            </div>
                        ))}
                    </section>
                ))}
            </div>
        </div>
    ),
}

/** A's fullscreen view, opened from the bar's corner: the liner at the lower left over the visualizer. */
export const LinerFullscreen: StoryObj = { name: 'Liner fullscreen', render: () => <Fullscreen option={LINER} /> }

/** B's fullscreen view: the cover inside the visualizer on the middle line, everything centered under it. */
export const StageFullscreen: StoryObj = { name: 'Stage fullscreen', render: () => <Fullscreen option={STAGE} /> }

/** C's fullscreen view: the head and the waveform pulled apart with the visualizer between them. */
export const TwoRowsFullscreen: StoryObj = { name: 'Two rows fullscreen', render: () => <Fullscreen option={TWO_ROWS} /> }
