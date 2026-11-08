import { Maximize2, Music, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import { cloneElement, isValidElement, type ComponentProps, type CSSProperties, type ReactElement, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { Artwork } from './Artwork'
import type { Tier } from './bar-growth'
import {
    LiveMark,
    PlayButton,
    Position,
    RateMenu,
    SkipGlyph,
    TransportButton,
    VolumeControl,
    formatRate,
    type TransportSize,
} from '@winterop-com/sokkel-ui/media/MediaControls'
import { SoundVisualizer, type SoundKind, type SoundVisualizerProps } from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import type { MediaRange } from '@winterop-com/sokkel-ui/media/time'

/** How a queue repeats: not at all, the whole queue, or the one item playing. */
export type RepeatMode = 'off' | 'all' | 'one'

/** What previous and next step between, and say: tracks, or the chapters of one long item. */
export type MediaSteps = 'track' | 'chapter'

/** What the scrubber and its times measure: the whole item, or the chapter playing. */
export type MediaTimeline = 'whole' | 'chapter'

/** The words the player says, each with an English default. */
export interface MediaBarWords {
    play: string
    pause: string
    previous: string
    next: string
    /** Previous and next while they step through chapters. */
    previousChapter: string
    nextChapter: string
    /** The skip buttons, given the interval in seconds. */
    skipBack: (seconds: number) => string
    skipForward: (seconds: number) => string
    /** The speed menu's name, and a speed as it writes it, such as "1.25x". */
    speed: string
    rate: (rate: number) => string
    /** The mark that stands for the position on a live stream. */
    live: string
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
    /** The place while previous and next step through chapters, such as "Chapter 3 of 12". */
    chapterOf: (number: number, count?: number) => string
    /** The button that opens the fullscreen view, and the one that leaves it. */
    fullscreen: string
    exitFullscreen: string
    /** The fullscreen view's name. */
    nowPlaying: string
    /** The name of the picker of the visualizer's kind, and each kind's. */
    visualizerKind: string
    spectrum: string
    area: string
    wave: string
    ring: string
}

export const MEDIA_BAR_WORDS: MediaBarWords = {
    play: 'Play',
    pause: 'Pause',
    previous: 'Previous',
    next: 'Next',
    previousChapter: 'Previous chapter',
    nextChapter: 'Next chapter',
    skipBack: (seconds) => `Back ${String(seconds)} seconds`,
    skipForward: (seconds) => `Forward ${String(seconds)} seconds`,
    speed: 'Playback speed',
    rate: formatRate,
    live: 'Live',
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
    chapterOf: (number, count) => (count === undefined ? `Chapter ${String(number)}` : `Chapter ${String(number)} of ${String(count)}`),
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    nowPlaying: 'Now playing',
    visualizerKind: 'Visualizer',
    spectrum: 'Spectrum',
    area: 'Area',
    wave: 'Wave',
    ring: 'Ring',
}

const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' }

/** What every arrangement of the player draws from: what plays, where it is, and the handlers. */
export interface Deck {
    words: MediaBarWords
    title: ReactNode
    subtitle?: ReactNode
    artist?: ReactNode
    album?: ReactNode
    year?: ReactNode
    /** The place in the line over the large title, such as "Track 13 of 16". */
    place?: string
    artwork?: ReactNode
    placeholderSeed?: string
    playing: boolean
    onPlayingChange: (playing: boolean) => void
    /** The position drawn: the one given, or the one under a dragging pointer; within the chapter on a chapter's timeline. */
    at: number
    /** The length the scrubber spans: the whole item's, or the chapter's. */
    duration: number
    onSeek: (seconds: number) => void
    /** A live stream: no scrubber, no length, no seeking or skipping. */
    live: boolean
    onScrub: (seconds: number | null) => void
    buffered?: readonly MediaRange[]
    waveform?: readonly number[]
    /** The volume as heard: zero while muted. */
    level: number
    muted: boolean
    onMutedChange?: (muted: boolean) => void
    onVolumeChange: (volume: number) => void
    onPrevious?: () => void
    onNext?: () => void
    steps: MediaSteps
    /** The interval the skip buttons move, in seconds, and what moves it; no skip buttons without one. */
    skip?: number
    onSkip?: (seconds: number) => void
    rate: number
    rates: readonly number[]
    /** No speed menu without it. */
    onRateChange?: (rate: number) => void
    shuffle: boolean
    onShuffleChange?: (shuffle: boolean) => void
    repeat: RepeatMode
    onRepeatChange?: (repeat: RepeatMode) => void
    extra?: ReactNode
}

/** The cover, square and filled edge to edge; without artwork one drawn from the seed, or a note glyph. `size` pixels across, or filling its box. */
export function Cover({ deck, size, flush = false, className }: { deck: Deck; size?: number; flush?: boolean; className?: string }) {
    return (
        <div
            className={cn(
                'flex aspect-square max-w-full shrink-0 items-center justify-center overflow-hidden bg-muted text-faint [&>*]:size-full [&>svg]:block',
                !flush && 'rounded-mini',
                size === undefined && 'size-full',
                className,
            )}
            style={size === undefined ? undefined : { width: size }}
        >
            {deck.artwork ??
                (deck.placeholderSeed === undefined ? (
                    <Music className="size-2/5! max-h-12 max-w-12 p-0" aria-hidden />
                ) : (
                    <Artwork seed={deck.placeholderSeed} />
                ))}
        </div>
    )
}

/** The line in the accent over a large title: the place, the album and the year. */
export function Eyebrow({ deck, className }: { deck: Deck; className?: string }) {
    const { place, album, year } = deck
    if (place === undefined && album === undefined && year === undefined) return null
    return (
        <GroupLabel className={cn('truncate text-primary-ink', className)}>
            <MetaLine inline items={[place, album, year]} />
        </GroupLabel>
    )
}

/** What plays, saying as much as the tier allows: one line, two, the liner, or the liner at its largest. */
export function Words({ deck, tier, center = false, className }: { deck: Deck; tier: Tier; center?: boolean; className?: string }) {
    const by = deck.artist ?? deck.subtitle
    const align = center && 'text-center'
    if (tier === 'line') {
        return (
            <p className={cn('truncate text-sm text-muted-foreground', align, className)}>
                <MetaLine inline items={[<span className="font-semibold text-foreground">{deck.title}</span>, by]} />
            </p>
        )
    }
    if (tier === 'pair') {
        return (
            <div className={cn('min-w-0', align, className)}>
                <p className="truncate text-detail-title text-foreground">{deck.title}</p>
                {deck.subtitle !== undefined ? (
                    <p className="truncate text-xs text-muted-foreground">{deck.subtitle}</p>
                ) : (
                    <MetaLine items={[deck.artist, deck.album]} truncate />
                )}
            </div>
        )
    }
    const poster = tier === 'poster'
    return (
        <div className={cn('min-w-0', align, className)}>
            <Eyebrow deck={deck} />
            <p className={cn('truncate font-semibold tracking-tight text-foreground', poster ? 'text-stat' : 'text-page')}>{deck.title}</p>
            {by !== undefined && <p className={cn('truncate text-muted-foreground', poster ? 'text-base' : 'text-sm')}>{by}</p>}
        </div>
    )
}

/** What plays at the size of a screen of its own: the liner, its title in the display size, or the page's on a phone. */
export function ScreenWords({
    deck,
    phone,
    center = false,
    className,
}: {
    deck: Deck
    phone: boolean
    center?: boolean
    className?: string
}) {
    const by = deck.artist ?? deck.subtitle
    return (
        <div className={cn('min-w-0', center && 'w-full text-center', className)}>
            <Eyebrow deck={deck} className={cn(!phone && 'text-sm')} />
            <p className={cn('truncate text-foreground', phone ? 'text-page font-semibold tracking-tight' : 'text-media-title')}>
                {deck.title}
            </p>
            {by !== undefined && <p className={cn('truncate text-muted-foreground', phone ? 'text-sm' : 'text-page')}>{by}</p>}
        </div>
    )
}

/** The track's waveform as the scrubber, between the elapsed and the remaining time, `height` pixels tall; the live mark on a live stream. */
export function Scrub({ deck, height, size, className }: { deck: Deck; height: number; size?: 'sm' | 'lg'; className?: string }) {
    if (deck.live) return <LiveMark label={deck.words.live} size={size} className={className} />
    return (
        <Position
            at={deck.at}
            duration={deck.duration}
            buffered={deck.buffered}
            label={deck.words.seek}
            onSeek={deck.onSeek}
            onScrub={deck.onScrub}
            waveform={deck.waveform ?? []}
            height={height}
            size={size}
            className={className}
        />
    )
}

/**
 * Previous, play and next, named for chapters while they step through chapters, between the skip
 * buttons when the deck has an interval. A live stream's skip buttons are drawn disabled.
 */
export function Steps({ deck, size = 'sm' }: { deck: Deck; size?: TransportSize }) {
    const { words, playing, onPlayingChange, onPrevious, onNext, skip, onSkip, live } = deck
    const chapter = deck.steps === 'chapter'
    const skipping = skip !== undefined && onSkip !== undefined
    return (
        <>
            {skipping && (
                <TransportButton size={size} label={words.skipBack(skip)} onClick={() => onSkip(-skip)} disabled={live}>
                    <SkipGlyph seconds={skip} back size={size} />
                </TransportButton>
            )}
            <TransportButton
                size={size}
                label={chapter ? words.previousChapter : words.previous}
                onClick={onPrevious}
                disabled={onPrevious === undefined}
            >
                <SkipBack className="fill-current" aria-hidden />
            </TransportButton>
            <PlayButton size={size} playing={playing} onToggle={() => onPlayingChange(!playing)} words={words} />
            <TransportButton size={size} label={chapter ? words.nextChapter : words.next} onClick={onNext} disabled={onNext === undefined}>
                <SkipForward className="fill-current" aria-hidden />
            </TransportButton>
            {skipping && (
                <TransportButton size={size} label={words.skipForward(skip)} onClick={() => onSkip(skip)} disabled={live}>
                    <SkipGlyph seconds={skip} back={false} size={size} />
                </TransportButton>
            )}
        </>
    )
}

/** The speed menu, drawn only with a handler and never on a live stream. `container` holds its menu inside a fullscreen view. */
export function Speed({
    deck,
    size,
    container,
}: {
    deck: Deck
    size?: TransportSize
    container?: ComponentProps<typeof RateMenu>['container']
}) {
    const { words, rate, rates, onRateChange, live } = deck
    if (onRateChange === undefined || live) return null
    return (
        <RateMenu
            rate={rate}
            rates={rates}
            onRateChange={onRateChange}
            label={words.speed}
            format={words.rate}
            size={size}
            container={container}
        />
    )
}

/** Shuffle, drawn only when it has a handler. */
export function ShuffleButton({ deck, size }: { deck: Deck; size?: TransportSize }) {
    const { words, shuffle, onShuffleChange } = deck
    if (onShuffleChange === undefined) return null
    return (
        <TransportButton size={size} label={words.shuffle} pressed={shuffle} onClick={() => onShuffleChange(!shuffle)}>
            <Shuffle aria-hidden />
        </TransportButton>
    )
}

/** Repeat, drawn only when it has a handler; a press moves to the next mode. */
export function RepeatButton({ deck, size }: { deck: Deck; size?: TransportSize }) {
    const { words, repeat, onRepeatChange } = deck
    if (onRepeatChange === undefined) return null
    const label = repeat === 'one' ? words.repeatOne : repeat === 'all' ? words.repeatAll : words.repeatOff
    return (
        <TransportButton size={size} label={label} pressed={repeat !== 'off'} onClick={() => onRepeatChange(NEXT_REPEAT[repeat])}>
            {repeat === 'one' ? <Repeat1 aria-hidden /> : <Repeat aria-hidden />}
        </TransportButton>
    )
}

/** Mute and the volume slider, the slider left out where `compact` says there is no room. */
export function Volume({ deck, compact = false }: { deck: Deck; compact?: boolean }) {
    return (
        <VolumeControl
            level={deck.level}
            muted={deck.muted}
            onMutedChange={deck.onMutedChange}
            onVolumeChange={deck.onVolumeChange}
            compact={compact}
            words={deck.words}
        />
    )
}

/** The app's own controls at the bar's end, such as a queue button. */
export function Extras({ deck }: { deck: Deck }) {
    if (deck.extra === undefined) return null
    return <div className="flex items-center gap-1">{deck.extra}</div>
}

/** The button that opens the fullscreen view. */
export function FullscreenButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
    return (
        <TransportButton label={label} onClick={onClick} className={cn('text-muted-foreground', className)}>
            <Maximize2 aria-hidden />
        </TransportButton>
    )
}

type Look = Pick<SoundVisualizerProps, 'kind' | 'align' | 'middle'>

function isSoundVisualizer(node: ReactNode): node is ReactElement<SoundVisualizerProps> {
    return isValidElement(node) && node.type === SoundVisualizer
}

/** The kind a `SoundVisualizer` in the slot draws, or nothing for any other node, whose kind cannot be picked. */
export function kindOf(visualizer: ReactNode): SoundKind | undefined {
    return isSoundVisualizer(visualizer) ? (visualizer.props.kind ?? 'spectrum') : undefined
}

/** The slot drawn with `look`: a `SoundVisualizer` takes it, any other node is drawn as given. */
export function drawVisualizer(visualizer: ReactNode, look: Look): ReactNode {
    return isSoundVisualizer(visualizer) ? cloneElement(visualizer, look) : visualizer
}

/** The visualizer behind the words at `strength`, from 0 to 1, out of reach of the pointer; nothing at zero. */
export function Backdrop({
    visualizer,
    strength,
    className,
    style,
}: {
    visualizer: ReactNode
    strength: number
    className?: string
    style?: CSSProperties
}) {
    if (visualizer === undefined || visualizer === null || strength <= 0) return null
    return (
        <div
            aria-hidden
            data-slot="media-bar-visualizer"
            className={cn('pointer-events-none absolute inset-0', className)}
            style={{ ...style, opacity: strength }}
        >
            {visualizer}
        </div>
    )
}
