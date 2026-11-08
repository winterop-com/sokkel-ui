import { AudioLines, MicVocal, Minimize2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

import { useThemeName } from '@winterop-com/sokkel-ui/hooks/use-theme-name'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { enterFullscreen, exitFullscreen, fullscreenElement, subscribeFullscreen } from '@winterop-com/sokkel-ui/lib/fullscreen'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { PHONE, type MediaBarLayout } from './bar-growth'
import {
    Cover,
    drawVisualizer,
    Extras,
    RepeatButton,
    ScreenWords,
    Scrub,
    kindOf,
    ShuffleButton,
    Speed,
    Steps,
    Volume,
    type Deck,
    type MediaVisualizerOption,
} from './MediaBarParts'
import { TransportButton } from '@winterop-com/sokkel-ui/media/MediaControls'
import { SOUND_KINDS, type SoundKind } from '@winterop-com/sokkel-ui/media/sound'

export type { MediaBarLayout } from './bar-growth'

/** The view's width under which the rows view puts its transport under what plays. */
const TABLET = 1280

export interface MediaFullscreenProps {
    deck: Deck
    /** The bar's layout, which the view is arranged after. */
    layout: MediaBarLayout
    /** The visualizer, drawn at full strength; a `SoundVisualizer` takes the kind picked here. */
    visualizer?: ReactNode
    /** Whether the kind can be picked: only a `SoundVisualizer` takes it. */
    pickable: boolean
    /** The words of what plays, such as a `Lyrics`, drawn in the visualizer's place while `lyricsShown`. */
    lyrics?: ReactNode
    lyricsShown?: boolean
    /** The corner's lyrics button, drawn with `lyrics`, shows and hides them through this. */
    onLyricsShownChange?: (shown: boolean) => void
    /** Controls for what plays, such as a star for it, at the end of the line under its title. */
    actions?: ReactNode
    kind: SoundKind
    onKindChange: (kind: SoundKind) => void
    /**
     * The app's own looks for the visualizer, which the picker offers in place of the library's
     * kinds, reporting the id chosen. The app draws the one chosen, so the visualizer is then
     * drawn as given, its kind and look its own.
     */
    visualizerOptions?: readonly MediaVisualizerOption[]
    /** The id of the option shown. */
    visualizerOption?: string
    onVisualizerOptionChange?: (id: string) => void
    onLeave: () => void
    /**
     * Whether to ask the browser for its fullscreen, as a press of the bar's button does. Without
     * it, and where the browser refuses, the view fills the window instead.
     */
    native: boolean
}

/**
 * The player's now-playing view over the whole screen, opened from the bar: what plays at full
 * size, the visualizer at full strength, the waveform and the transport, arranged after the
 * bar's layout. The title is never cut short: it has the room its line has and wraps onto as many
 * lines as it needs. The corner holds the visualizer's picker, of the library's kinds or of the
 * app's own `visualizerOptions`, and the button that leaves; Escape leaves too. Given `lyrics`, the
 * corner's lyrics button shows them in the visualizer's place: between the head and the waveform,
 * above the liner, or across the stage. `actions`, such as a star for what plays, end the line
 * under its title.
 *
 * It is a dark room in every scheme and theme: the `.dark` class around an element scoped to the
 * document's theme, so the theme's own dark tokens hold inside whatever the page wears.
 *
 * It goes full screen through `lib/fullscreen`: the browser's, or in a desktop shell the window's own
 * once the app hands it over (`desktop.setFullscreen` on `Shell`). It follows it, so the browser's or
 * the window's own way out closes it. Drawn without asking, or refused, it covers the window from a
 * portal on the body.
 */
export function MediaFullscreen(props: MediaFullscreenProps) {
    if (typeof document === 'undefined') return null
    return createPortal(<Room {...props} />, document.body)
}

function Room({
    deck,
    layout,
    visualizer,
    pickable,
    kind,
    onKindChange,
    visualizerOptions,
    visualizerOption,
    onVisualizerOptionChange,
    onLeave,
    native,
    lyrics,
    lyricsShown = false,
    onLyricsShownChange,
    actions,
}: MediaFullscreenProps) {
    const room = useRef<HTMLDivElement | null>(null)
    const box = useSize(room)
    const theme = useThemeName()
    const leave = useRef(onLeave)
    useLayoutEffect(() => {
        leave.current = onLeave
    })

    // Left once, however many ways say so at the same press (Escape leaving full screen and the view).
    const gone = useRef(false)
    const leaveOnce = () => {
        if (gone.current) return
        gone.current = true
        leave.current()
        setTimeout(() => {
            gone.current = false
        }, 0)
    }

    useLayoutEffect(() => {
        const element = room.current
        if (element === null) return
        const before = document.activeElement instanceof HTMLElement ? document.activeElement : null
        let full = false
        const change = () => {
            const now = fullscreenElement() === element
            if (full && !now) leaveOnce()
            full = now
        }
        const stop = subscribeFullscreen(change)
        if (native) {
            element.focus({ preventScroll: true })
            // The view covers the window itself where full screen is refused.
            enterFullscreen(element, { cover: false })
        }
        return () => {
            stop()
            exitFullscreen(element)
            if (native && before?.isConnected === true) before.focus({ preventScroll: true })
        }
    }, [native])

    useEffect(() => {
        const key = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !event.defaultPrevented) leaveOnce()
        }
        window.addEventListener('keydown', key)
        return () => window.removeEventListener('keydown', key)
    }, [])

    const phone = box.width < PHONE
    const worded = lyrics !== undefined && lyrics !== null
    const own = visualizerOptions !== undefined && visualizerOptions.length > 0
    // The app's options leave the visualizer as the app drew it; the library's kinds are drawn into it.
    const view = {
        deck,
        visualizer,
        kind: own ? undefined : kind,
        phone,
        room,
        lyrics: worded && lyricsShown ? lyrics : undefined,
        actions,
    }
    return (
        <div
            ref={room}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={deck.words.nowPlaying}
            data-slot="media-fullscreen"
            data-layout={layout}
            className="dark fixed inset-0 z-50 scheme-dark outline-none"
        >
            <div data-theme-scope={theme} className="relative flex size-full flex-col overflow-hidden bg-background text-foreground">
                {layout === 'rows' && <RowsView {...view} width={box.width} />}
                {layout === 'panel' && <PanelView {...view} />}
                {layout === 'stage' && <StageView {...view} width={box.width} height={box.height} />}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                    {phone && <Speed deck={deck} container={room} />}
                    {worded && onLyricsShownChange !== undefined && (
                        <TransportButton label={deck.words.lyrics} pressed={lyricsShown} onClick={() => onLyricsShownChange(!lyricsShown)}>
                            <MicVocal aria-hidden />
                        </TransportButton>
                    )}
                    {(own || pickable) && visualizer !== undefined && visualizer !== null && view.lyrics === undefined && (
                        <LookPicker
                            label={deck.words.visualizerKind}
                            options={own ? visualizerOptions : SOUND_KINDS.map((id) => ({ id, label: deck.words[id] }))}
                            value={own ? (visualizerOption ?? visualizerOptions[0].id) : kind}
                            onValueChange={(id) => {
                                if (own) onVisualizerOptionChange?.(id)
                                else onKindChange(SOUND_KINDS.find((one) => one === id) ?? kind)
                            }}
                            compact={phone}
                        />
                    )}
                    <TransportButton label={deck.words.exitFullscreen} onClick={onLeave} className="text-muted-foreground">
                        <Minimize2 aria-hidden />
                    </TransportButton>
                </div>
            </div>
        </div>
    )
}

/** The visualizer's looks side by side; on a phone, one button that moves to the next. */
function LookPicker({
    label,
    options,
    value,
    onValueChange,
    compact,
}: {
    label: string
    options: readonly MediaVisualizerOption[]
    value: string
    onValueChange: (id: string) => void
    compact: boolean
}) {
    if (compact) {
        const at = options.findIndex((option) => option.id === value)
        const next = options[(at + 1) % options.length]
        return (
            <TransportButton
                label={at === -1 ? label : `${label}: ${options[at].label}`}
                onClick={() => onValueChange(next.id)}
                className="text-muted-foreground"
            >
                <AudioLines aria-hidden />
            </TransportButton>
        )
    }
    return (
        <Segmented
            label={label}
            value={value}
            options={options.map((option) => ({ value: option.id, label: option.label }))}
            onValueChange={onValueChange}
        />
    )
}

interface ViewProps {
    deck: Deck
    visualizer?: ReactNode
    /** The library's kind picked; none while the app's options pick the look, the visualizer drawn as given. */
    kind?: SoundKind
    phone: boolean
    /** The view's own element, which holds the speed menu while the browser shows only it. */
    room: RefObject<HTMLDivElement | null>
    /** The lyrics while they are shown, in the visualizer's place. */
    lyrics?: ReactNode
    actions?: ReactNode
}

/** Shuffle, the transport and repeat, at a screen's size. */
function Transport({ deck }: { deck: Deck }) {
    return (
        <>
            <ShuffleButton deck={deck} size="md" />
            <Steps deck={deck} size="lg" />
            <RepeatButton deck={deck} size="md" />
        </>
    )
}

/**
 * After `rows`: the two rows pulled apart with the visualizer between them. What plays across the
 * head, the words taking all the room the transport and the volume leave at its end; the
 * visualizer filling the middle; the waveform, tall and as wide as the screen, along the foot. On
 * a phone the transport moves under the waveform.
 */
function RowsView({ deck, visualizer, kind, phone, room, lyrics, actions, width }: ViewProps & { width: number }) {
    // Short of a laptop's width, the transport and the volume move to a row under what plays.
    const tablet = !phone && width < TABLET
    return (
        <>
            <div
                className={cn(
                    'grid items-end',
                    phone
                        ? 'grid-cols-1 px-5 pt-16'
                        : tablet
                          ? 'grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-6 px-10 pt-16'
                          : 'grid-cols-[minmax(0,1fr)_auto_auto] gap-8 px-10 pt-16',
                )}
            >
                <div className={cn('flex min-w-0 items-end', phone ? 'gap-4' : 'gap-6', tablet && 'col-span-2')}>
                    <Cover deck={deck} size={phone ? 72 : 144} className="rounded-surface shadow-pop" />
                    <ScreenWords deck={deck} phone={phone} actions={actions} className="pb-0.5" />
                </div>
                {!phone && (
                    <>
                        <div className="flex h-14 items-center gap-3">
                            <Transport deck={deck} />
                        </div>
                        <div className="flex h-14 items-center gap-2">
                            <Speed deck={deck} size="md" container={room} />
                            <Volume deck={deck} />
                            <Extras deck={deck} />
                        </div>
                    </>
                )}
            </div>
            <div className={cn('min-h-0 flex-1', phone ? 'px-5 py-5' : 'px-10 py-8')}>
                {lyrics ?? drawVisualizer(visualizer, lookOf(kind))}
            </div>
            <div className={cn('flex flex-col', phone ? 'gap-4 px-5 pb-6' : 'px-10 pb-10')}>
                <Scrub deck={deck} height={phone ? 64 : 112} size={phone ? 'sm' : 'lg'} />
                {phone && (
                    <div className="flex items-center justify-center gap-2">
                        <Transport deck={deck} />
                    </div>
                )}
            </div>
        </>
    )
}

/**
 * After `panel`: the liner at full size in the lower left over the visualizer, which fills the
 * screen and fades into the ground under the words, with the waveform and the transport along
 * the foot. The lyrics take the room over the liner, however many lines its title runs onto.
 */
function PanelView({ deck, visualizer, kind, phone, room, lyrics, actions }: ViewProps) {
    return (
        <>
            <div className="relative flex min-h-0 flex-1 flex-col justify-end">
                {lyrics === undefined ? (
                    <>
                        <div className={cn('absolute inset-0', phone ? 'px-3 pt-16' : 'px-8 pt-16')}>
                            {drawVisualizer(visualizer, lookOf(kind))}
                        </div>
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-background via-background/80 to-transparent"
                        />
                    </>
                ) : (
                    <div className="relative mb-6 min-h-0 flex-1">
                        <div className={cn('absolute inset-0 pt-16', phone ? 'px-1' : 'px-4')}>{lyrics}</div>
                    </div>
                )}
                <div className={cn('relative flex min-w-0 shrink-0 items-end', phone ? 'gap-4 px-5' : 'gap-7 px-10')}>
                    <Cover deck={deck} size={phone ? 88 : 208} className="rounded-surface shadow-pop" />
                    <ScreenWords deck={deck} phone={phone} actions={actions} className="pb-1" />
                </div>
            </div>
            <div className={cn('relative flex flex-col', phone ? 'gap-5 px-5 pt-5 pb-6' : 'gap-7 px-10 pt-7 pb-8')}>
                <Scrub deck={deck} height={phone ? 44 : 64} size={phone ? 'sm' : 'lg'} />
                <div className={cn('flex items-center gap-2', phone && 'justify-center')}>
                    <Transport deck={deck} />
                    {!phone && (
                        <>
                            <div className="flex-1" />
                            <Speed deck={deck} size="md" container={room} />
                            <Volume deck={deck} />
                            <Extras deck={deck} />
                        </>
                    )}
                </div>
            </div>
        </>
    )
}

/**
 * After `stage`: everything on the screen's middle line. The cover stands inside the visualizer,
 * which spreads to either side of it (or rings it, the cover set in the ring's middle), and the
 * words, the waveform, the transport and the volume follow under it, centered. Short of height,
 * as under a title of several lines, the visualizer's band and the cover give way first.
 */
function StageView({ deck, visualizer, kind, phone, room, lyrics, actions, width, height }: ViewProps & { width: number; height: number }) {
    const band = Math.round(phone ? Math.min(width * 0.9, height * 0.4) : Math.min(height * 0.46, 440))
    const shown = visualizer !== undefined && visualizer !== null
    const ring = shown && (kind ?? kindOf(visualizer)) === 'ring'
    // The library's kinds are centered on the line; the app's options keep their own alignment.
    const look = {
        ...lookOf(kind),
        ...(kind === undefined ? {} : { align: 'center' as const }),
        ...(ring ? { middle: <Cover deck={deck} flush /> } : {}),
    }
    return (
        <div className={cn('flex h-full flex-col items-center justify-center', phone ? 'gap-6 px-5 pt-14' : 'gap-8 px-10 pt-16 pb-8')}>
            <div className="relative flex min-h-0 w-full items-center justify-center" style={{ height: band }}>
                {lyrics !== undefined && lyrics}
                {lyrics === undefined && shown && (
                    <div className={cn('absolute inset-y-0', phone ? '-inset-x-5' : '-inset-x-10')}>{drawVisualizer(visualizer, look)}</div>
                )}
                {lyrics === undefined && !ring && (
                    <div className="relative aspect-square h-[78%] max-w-full">
                        <Cover deck={deck} className="rounded-surface shadow-pop" />
                    </div>
                )}
            </div>
            <div className={cn('flex w-full shrink-0 flex-col items-center', phone ? 'gap-4' : 'max-w-3xl gap-5')}>
                <ScreenWords deck={deck} phone={phone} actions={actions} center />
                <Scrub deck={deck} height={phone ? 44 : 56} size={phone ? 'sm' : 'lg'} className="w-full" />
                <div className="flex items-center justify-center gap-3">
                    <Transport deck={deck} />
                </div>
                {!phone && (
                    <div className="flex items-center gap-2">
                        <Speed deck={deck} size="md" container={room} />
                        <Volume deck={deck} />
                        <Extras deck={deck} />
                    </div>
                )}
            </div>
        </div>
    )
}

/** What a view draws into a `SoundVisualizer`: the kind picked, or nothing, leaving the app's own. */
function lookOf(kind: SoundKind | undefined): { kind?: SoundKind } {
    return kind === undefined ? {} : { kind }
}

/** The element's size, measured before paint and on every resize; the window's until measured. */
function useSize(ref: RefObject<HTMLDivElement | null>): { width: number; height: number } {
    const [size, setSize] = useState(() =>
        typeof window === 'undefined' ? { width: 1280, height: 800 } : { width: window.innerWidth, height: window.innerHeight },
    )
    useLayoutEffect(() => {
        const element = ref.current
        if (element === null) return
        const measure = () =>
            setSize((last) =>
                last.width === element.clientWidth && last.height === element.clientHeight
                    ? last
                    : { width: element.clientWidth, height: element.clientHeight },
            )
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(element)
        return () => observer.disconnect()
    }, [ref])
    return size
}
