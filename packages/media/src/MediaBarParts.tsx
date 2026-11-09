import { Maximize2, Music, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import {
    cloneElement,
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
    type ComponentProps,
    type CSSProperties,
    type ReactNode,
} from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { Artwork } from './Artwork'
import type { Tier } from './bar-growth'
import { skipBy, type MediaSkip } from './media-session'
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
import type { SoundKind, SoundVisualizerProps } from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import { isSoundVisualizer } from '@winterop-com/sokkel-ui/media/visualizer-mark'
import type { MediaRange } from '@winterop-com/sokkel-ui/media/time'
import { nextRepeat, type RepeatMode } from './queue'
import { useFramePosition } from './use-frame-position'

export type { MediaSkip } from './media-session'
export type { RepeatMode } from './queue'
export type { Tier } from './bar-growth'

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
    /** The fullscreen view's button that shows and hides the lyrics. */
    lyrics: string
    /** The name of the visualizer's picker, and each of the library's kinds it offers. */
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
    lyrics: 'Lyrics',
    visualizerKind: 'Visualizer',
    spectrum: 'Spectrum',
    area: 'Area',
    wave: 'Wave',
    ring: 'Ring',
}

/** A look for the visualizer an app offers in the fullscreen view's picker, by its own id and name. */
export interface MediaVisualizerOption {
    id: string
    label: string
}

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
    /**
     * Reads the position drawn, in the same seconds as `at`, on every animation frame while it
     * plays, so the scrubber and its times move smoothly; none while a pointer drags.
     */
    clock?: () => number
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
    /** How far the skip buttons move, in seconds, one interval or each its own, and what moves it; no skip buttons without one. */
    skip?: MediaSkip
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
    /** The app's own now-playing display, in place of the words and the scrubber in the one-line bar and `rows`. */
    face?: ReactNode
}

/**
 * The position the scrubber and its times draw: the deck's, read from its clock on every
 * animation frame while it plays, and kept within the length the scrubber spans.
 */
export function useDeckAt(deck: Deck): number {
    const at = useFramePosition(deck.at, deck.clock, deck.playing && !deck.live)
    if (at === deck.at) return at
    return deck.duration > 0 ? Math.min(Math.max(0, at), deck.duration) : Math.max(0, at)
}

export interface CoverProps {
    deck: Deck
    size?: number
    flush?: boolean
    className?: string
}

/** The cover, square and filled edge to edge; without artwork one drawn from the seed, or a note glyph. `size` pixels across, or filling its box. */
export function Cover({ deck, size, flush = false, className }: CoverProps) {
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

export interface EyebrowProps {
    deck: Deck
    className?: string
}

/** The line in the accent over a large title: the place, the album and the year. */
export function Eyebrow({ deck, className }: EyebrowProps) {
    const { place, album, year } = deck
    if (place === undefined && album === undefined && year === undefined) return null
    return (
        <GroupLabel className={cn('truncate text-primary-ink', className)}>
            <MetaLine inline items={[place, album, year]} />
        </GroupLabel>
    )
}

export interface WordsProps {
    deck: Deck
    tier: Tier
    center?: boolean
    className?: string
}

/** What plays, saying as much as the tier allows: one line, two, the liner, or the liner at its largest. */
export function Words({ deck, tier, center = false, className }: WordsProps) {
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

export interface ScreenWordsProps {
    deck: Deck
    phone: boolean
    center?: boolean
    /** Controls for what plays, such as a star for it, at the end of the line under the title. */
    actions?: ReactNode
    className?: string
}

/**
 * What plays at the size of a screen of its own: the liner, its title in the display size, or the
 * page's on a phone. The title is never cut short: it wraps onto as many lines as it needs, a size
 * smaller when it would run past two lines (three on a phone). `actions` end the line under the
 * title, so they never take the title's room.
 */
export function ScreenWords({ deck, phone, center = false, actions, className }: ScreenWordsProps) {
    const by = deck.artist ?? deck.subtitle
    const line = by !== undefined && <p className={cn('truncate text-muted-foreground', phone ? 'text-sm' : 'text-page')}>{by}</p>
    const acting = actions !== undefined && actions !== null && actions !== false
    return (
        <div className={cn('min-w-0', center && 'w-full text-center', className)}>
            <Eyebrow deck={deck} className={cn(!phone && 'text-sm')} />
            <ScreenTitle title={deck.title} phone={phone} />
            {acting ? (
                <div className={cn('flex min-w-0 items-center gap-2', center && 'justify-center')}>
                    {line}
                    <div data-slot="media-fullscreen-actions" className="flex shrink-0 items-center gap-1">
                        {actions}
                    </div>
                </div>
            ) : (
                line
            )}
        </div>
    )
}

/** A screen title's sizes, largest first; it takes the largest at which it runs onto no more than the lines below. */
const SCREEN_TITLE = ['text-media-title', 'text-stat font-semibold tracking-tight', 'text-page font-semibold tracking-tight'] as const
const PHONE_TITLE = ['text-page font-semibold tracking-tight', 'text-detail-title'] as const

/** The most lines a screen title runs onto at a size before it steps down to the next. */
const SCREEN_TITLE_LINES = 2
const PHONE_TITLE_LINES = 3

/** How many lines an element's text runs onto, by its height and its line height. */
function linesOf(element: HTMLElement): number {
    const line = Number.parseFloat(getComputedStyle(element).lineHeight)
    return line > 0 ? Math.round(element.offsetHeight / line) : 1
}

/**
 * The title at a screen's size, wrapping onto as many lines as it needs and never cut short. Hidden
 * copies at each size, as wide as the title, tell how many lines it runs onto at each, measured
 * again as the width or the typeface changes.
 */
function ScreenTitle({ title, phone }: { title: ReactNode; phone: boolean }) {
    const sizes = phone ? PHONE_TITLE : SCREEN_TITLE
    const most = phone ? PHONE_TITLE_LINES : SCREEN_TITLE_LINES
    const probes = useRef<(HTMLParagraphElement | null)[]>([])
    const [step, setStep] = useState(0)
    const measure = useCallback(() => {
        const fits = sizes.findIndex((_, index) => {
            const probe = probes.current[index]
            return probe !== null && probe !== undefined && linesOf(probe) <= most
        })
        setStep(fits === -1 ? sizes.length - 1 : fits)
    }, [sizes, most])
    useLayoutEffect(measure, [measure, title])
    useLayoutEffect(() => {
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(measure)
        for (const probe of probes.current.slice(0, sizes.length)) if (probe !== null) observer.observe(probe)
        return () => observer.disconnect()
    }, [measure, sizes])
    const wrap = 'text-balance wrap-break-word'
    return (
        <div className="relative">
            <p data-slot="media-fullscreen-title" className={cn(wrap, 'text-foreground', sizes[Math.min(step, sizes.length - 1)])}>
                {title}
            </p>
            <div aria-hidden className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden">
                {sizes.map((size, index) => (
                    <p
                        key={size}
                        ref={(node) => {
                            probes.current[index] = node
                        }}
                        className={cn(wrap, size)}
                    >
                        {title}
                    </p>
                ))}
            </div>
        </div>
    )
}

export interface ScrubProps {
    deck: Deck
    height: number
    size?: 'sm' | 'lg'
    className?: string
}

/** The track's waveform as the scrubber, between the elapsed and the remaining time, `height` pixels tall; the live mark on a live stream. */
export function Scrub({ deck, height, size, className }: ScrubProps) {
    const at = useDeckAt(deck)
    if (deck.live) return <LiveMark label={deck.words.live} size={size} className={className} />
    return (
        <Position
            at={at}
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

export interface LinePositionProps {
    deck: Deck
}

/** The one-line bar's position: a slider between the elapsed and the remaining time; the live mark on a live stream. */
export function LinePosition({ deck }: LinePositionProps) {
    const at = useDeckAt(deck)
    if (deck.live) return <LiveMark label={deck.words.live} />
    return (
        <Position
            at={at}
            duration={deck.duration}
            buffered={deck.buffered}
            label={deck.words.seek}
            onSeek={deck.onSeek}
            onScrub={deck.onScrub}
        />
    )
}

export interface StepsProps {
    deck: Deck
    size?: TransportSize
}

/**
 * Previous, play and next, named for chapters while they step through chapters, between the skip
 * buttons when the deck has an interval, each labeled and drawn with its own. A live stream's skip
 * buttons are drawn disabled.
 */
export function Steps({ deck, size = 'sm' }: StepsProps) {
    const { words, playing, onPlayingChange, onPrevious, onNext, skip, onSkip, live } = deck
    const chapter = deck.steps === 'chapter'
    const skipping = skip !== undefined && onSkip !== undefined
    const back = skipping ? skipBy(skip, 'back') : 0
    const forward = skipping ? skipBy(skip, 'forward') : 0
    return (
        <>
            {skipping && (
                <TransportButton size={size} label={words.skipBack(back)} onClick={() => onSkip(-back)} disabled={live}>
                    <SkipGlyph seconds={back} back size={size} />
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
                <TransportButton size={size} label={words.skipForward(forward)} onClick={() => onSkip(forward)} disabled={live}>
                    <SkipGlyph seconds={forward} back={false} size={size} />
                </TransportButton>
            )}
        </>
    )
}

export interface SpeedProps {
    deck: Deck
    size?: TransportSize
    container?: ComponentProps<typeof RateMenu>['container']
}

/** The speed menu, drawn only with a handler and never on a live stream. `container` holds its menu inside a fullscreen view. */
export function Speed({ deck, size, container }: SpeedProps) {
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

export interface ShuffleButtonProps {
    deck: Deck
    size?: TransportSize
}

/** Shuffle, drawn only when it has a handler. */
export function ShuffleButton({ deck, size }: ShuffleButtonProps) {
    const { words, shuffle, onShuffleChange } = deck
    if (onShuffleChange === undefined) return null
    return (
        <TransportButton size={size} label={words.shuffle} pressed={shuffle} onClick={() => onShuffleChange(!shuffle)}>
            <Shuffle aria-hidden />
        </TransportButton>
    )
}

export interface RepeatButtonProps {
    deck: Deck
    size?: TransportSize
}

/** Repeat, drawn only when it has a handler; a press moves to the next mode. */
export function RepeatButton({ deck, size }: RepeatButtonProps) {
    const { words, repeat, onRepeatChange } = deck
    if (onRepeatChange === undefined) return null
    const label = repeat === 'one' ? words.repeatOne : repeat === 'all' ? words.repeatAll : words.repeatOff
    return (
        <TransportButton size={size} label={label} pressed={repeat !== 'off'} onClick={() => onRepeatChange(nextRepeat(repeat))}>
            {repeat === 'one' ? <Repeat1 aria-hidden /> : <Repeat aria-hidden />}
        </TransportButton>
    )
}

export interface VolumeProps {
    deck: Deck
    compact?: boolean
}

/** Mute and the volume slider, the slider left out where `compact` says there is no room. */
export function Volume({ deck, compact = false }: VolumeProps) {
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

export interface ExtrasProps {
    deck: Deck
}

/** The app's own controls at the bar's end, such as a queue button. */
export function Extras({ deck }: ExtrasProps) {
    if (deck.extra === undefined) return null
    return <div className="flex items-center gap-1">{deck.extra}</div>
}

export interface FullscreenButtonProps {
    label: string
    onClick: () => void
    className?: string
}

/** The button that opens the fullscreen view. */
export function FullscreenButton({ label, onClick, className }: FullscreenButtonProps) {
    return (
        <TransportButton label={label} onClick={onClick} className={cn('text-muted-foreground', className)}>
            <Maximize2 aria-hidden />
        </TransportButton>
    )
}

type Look = Pick<SoundVisualizerProps, 'kind' | 'align' | 'middle'>

/** The kind a `SoundVisualizer` in the slot draws, or nothing for any other node, whose kind cannot be picked. */
export function kindOf(visualizer: ReactNode): SoundKind | undefined {
    return isSoundVisualizer(visualizer) ? (visualizer.props.kind ?? 'spectrum') : undefined
}

/** The slot drawn with `look`: a `SoundVisualizer` takes it, any other node is drawn as given. */
export function drawVisualizer(visualizer: ReactNode, look: Look): ReactNode {
    return isSoundVisualizer(visualizer) ? cloneElement(visualizer, look) : visualizer
}

export interface BackdropProps {
    visualizer: ReactNode
    strength: number
    className?: string
    style?: CSSProperties
}

/** The visualizer behind the words at `strength`, from 0 to 1, out of reach of the pointer; nothing at zero. */
export function Backdrop({ visualizer, strength, className, style }: BackdropProps) {
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
