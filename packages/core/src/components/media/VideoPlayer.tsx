import { Captions, Maximize, Minimize, PictureInPicture2, Play, RotateCcw, RotateCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type Ref } from 'react'

import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { PlayButton, Position, TransportButton, VolumeControl } from './MediaControls'
import { type MediaRange } from './time'

/** One text track the player offers. */
export interface VideoTrack {
    src: string
    label: string
    /** The track's language, as a BCP 47 tag. */
    lang?: string
    kind?: 'subtitles' | 'captions'
    /** Whether it is shown when the video loads. At most one should be. */
    default?: boolean
}

/** The words the player says, each with an English default. */
export interface VideoPlayerWords {
    play: string
    pause: string
    mute: string
    unmute: string
    volume: string
    seek: string
    speed: string
    captions: string
    captionsOff: string
    pictureInPicture: string
    exitPictureInPicture: string
    fullscreen: string
    exitFullscreen: string
    back: string
    forward: string
}

export const VIDEO_PLAYER_WORDS: VideoPlayerWords = {
    play: 'Play',
    pause: 'Pause',
    mute: 'Mute',
    unmute: 'Unmute',
    volume: 'Volume',
    seek: 'Seek',
    speed: 'Playback speed',
    captions: 'Captions',
    captionsOff: 'Off',
    pictureInPicture: 'Picture in picture',
    exitPictureInPicture: 'Exit picture in picture',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    back: 'Back 10 seconds',
    forward: 'Forward 10 seconds',
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

/** How far the left and right arrows seek, in seconds, and how far up and down move the volume. */
const SEEK_STEP = 5
const VOLUME_STEP = 0.1
/** How far the back and forward buttons skip, in seconds. */
const SKIP = 10

/** A control drawn over the picture, light on dark in either scheme. */
const ON_PICTURE =
    'text-terminal-foreground hover:bg-terminal-foreground/15 hover:text-terminal-foreground dark:hover:bg-terminal-foreground/15 aria-expanded:bg-terminal-foreground/15 aria-expanded:text-terminal-foreground'

export interface VideoPlayerProps {
    src: string
    /** What is playing, shown at the controls' left. */
    title?: ReactNode
    /** A picture shown until the first frame is ready. */
    poster?: string
    tracks?: readonly VideoTrack[]
    /** The playback speeds offered, as multiples of normal speed. */
    rates?: readonly number[]
    autoPlay?: boolean
    loop?: boolean
    /** Start muted. */
    muted?: boolean
    preload?: 'none' | 'metadata' | 'auto'
    /** Show the controls before the video is first played; otherwise only the play button is drawn until then. */
    defaultControlsVisible?: boolean
    /** How long the controls stay after the pointer stops while playing, in milliseconds. */
    hideAfter?: number
    words?: Partial<VideoPlayerWords>
    /** The `<video>` element, for whatever the screen around the player needs from it. */
    videoRef?: Ref<HTMLVideoElement>
    className?: string
}

interface Playback {
    playing: boolean
    started: boolean
    time: number
    duration: number
    buffered: MediaRange[]
    volume: number
    muted: boolean
    rate: number
}

function rangesOf(video: HTMLVideoElement): MediaRange[] {
    const ranges: MediaRange[] = []
    for (let index = 0; index < video.buffered.length; index += 1) {
        ranges.push({ start: video.buffered.start(index), end: video.buffered.end(index) })
    }
    return ranges
}

/**
 * A video with the library's controls over it: play and pause, a seek bar with what has loaded,
 * the time, volume, playback speed, captions, picture in picture and fullscreen.
 *
 * The controls hide while the video plays and the pointer rests, and come back when the pointer
 * moves or anything in the player takes focus. With the player focused, Space or K plays and
 * pauses, the left and right arrows seek five seconds, the up and down arrows change the volume
 * by a tenth, F toggles fullscreen and M toggles mute. A click on the picture plays or pauses,
 * a double click toggles fullscreen, and a tap on a touch screen first brings back the controls.
 */
export function VideoPlayer({
    src,
    title,
    poster,
    tracks = [],
    rates = RATES,
    autoPlay = false,
    loop = false,
    muted: startMuted = false,
    preload = 'metadata',
    defaultControlsVisible = false,
    hideAfter = 2500,
    words: given,
    videoRef,
    className,
}: VideoPlayerProps) {
    const words = { ...VIDEO_PLAYER_WORDS, ...given }
    const root = useRef<HTMLDivElement | null>(null)
    const video = useRef<HTMLVideoElement | null>(null)
    const [state, setState] = useState<Playback>({
        playing: false,
        started: false,
        time: 0,
        duration: 0,
        buffered: [],
        volume: 1,
        muted: startMuted,
        rate: 1,
    })
    const [scrub, setScrub] = useState<number | null>(null)
    const [caption, setCaption] = useState(() => tracks.findIndex((track) => track.default === true))
    const [cue, setCue] = useState('')
    const [fullscreen, setFullscreen] = useState(false)
    const [pictureInPicture, setPictureInPicture] = useState(false)
    const [pipSupported, setPipSupported] = useState(false)
    const [active, setActive] = useState(defaultControlsVisible)
    const [held, setHeld] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    const attach = useCallback(
        (element: HTMLVideoElement | null) => {
            video.current = element
            if (typeof videoRef === 'function') videoRef(element)
            else if (videoRef !== undefined && videoRef !== null) videoRef.current = element
        },
        [videoRef],
    )

    useEffect(() => {
        const element = video.current
        if (element === null) return
        const read = () => {
            setState((previous) => ({
                ...previous,
                playing: !element.paused && !element.ended,
                started: previous.started || !element.paused,
                time: element.currentTime,
                duration: Number.isFinite(element.duration) ? element.duration : 0,
                buffered: rangesOf(element),
                volume: element.volume,
                muted: element.muted,
                rate: element.playbackRate,
            }))
        }
        const events = [
            'play',
            'pause',
            'ended',
            'timeupdate',
            'durationchange',
            'loadedmetadata',
            'loadeddata',
            'progress',
            'seeked',
            'volumechange',
            'ratechange',
        ] as const
        for (const name of events) element.addEventListener(name, read)
        const enterPip = () => {
            setPictureInPicture(true)
        }
        const leavePip = () => {
            setPictureInPicture(false)
        }
        element.addEventListener('enterpictureinpicture', enterPip)
        element.addEventListener('leavepictureinpicture', leavePip)
        setPipSupported(document.pictureInPictureEnabled === true && !element.disablePictureInPicture)
        read()
        return () => {
            for (const name of events) element.removeEventListener(name, read)
            element.removeEventListener('enterpictureinpicture', enterPip)
            element.removeEventListener('leavepictureinpicture', leavePip)
        }
    }, [src])

    useEffect(() => {
        const change = () => {
            setFullscreen(document.fullscreenElement !== null && document.fullscreenElement === root.current)
        }
        document.addEventListener('fullscreenchange', change)
        return () => {
            document.removeEventListener('fullscreenchange', change)
        }
    }, [])

    useEffect(() => {
        const element = video.current
        if (element === null) return
        let watched: TextTrack | null = null
        const read = () => {
            const active = watched?.activeCues
            const lines: string[] = []
            if (active !== null && active !== undefined) {
                for (let index = 0; index < active.length; index += 1) {
                    const text = (active[index] as VTTCue).text
                    if (typeof text === 'string') lines.push(text.replace(/<[^>]+>/g, ''))
                }
            }
            setCue(lines.join('\n'))
        }
        const apply = () => {
            for (let index = 0; index < element.textTracks.length; index += 1) {
                element.textTracks[index].mode = index === caption ? 'hidden' : 'disabled'
            }
            const next = caption >= 0 ? (element.textTracks[caption] ?? null) : null
            if (next !== watched) {
                watched?.removeEventListener('cuechange', read)
                watched = next
                watched?.addEventListener('cuechange', read)
            }
            read()
        }
        apply()
        element.textTracks.addEventListener('addtrack', apply)
        return () => {
            element.textTracks.removeEventListener('addtrack', apply)
            watched?.removeEventListener('cuechange', read)
        }
    }, [caption, tracks])

    useEffect(
        () => () => {
            clearTimeout(timer.current)
        },
        [],
    )

    const reveal = useCallback(() => {
        setActive(true)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
            setActive(false)
        }, hideAfter)
    }, [hideAfter])

    const toggle = () => {
        const element = video.current
        if (element === null) return
        if (element.paused || element.ended) void element.play().catch(() => undefined)
        else element.pause()
    }
    const seekTo = (seconds: number) => {
        const element = video.current
        if (element === null) return
        const end = Number.isFinite(element.duration) ? element.duration : seconds
        element.currentTime = Math.min(end, Math.max(0, seconds))
    }
    const setVolume = (level: number) => {
        const element = video.current
        if (element === null) return
        element.volume = Math.min(1, Math.max(0, level))
        if (element.volume > 0) element.muted = false
    }
    const toggleMute = () => {
        const element = video.current
        if (element !== null) element.muted = !element.muted
    }
    const setRate = (rate: number) => {
        const element = video.current
        if (element !== null) element.playbackRate = rate
    }
    const toggleFullscreen = () => {
        const container = root.current
        const element = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
        if (container === null) return
        if (document.fullscreenElement !== null) void document.exitFullscreen().catch(() => undefined)
        else if (typeof container.requestFullscreen === 'function') void container.requestFullscreen().catch(() => undefined)
        else element?.webkitEnterFullscreen?.()
    }
    const togglePictureInPicture = () => {
        const element = video.current
        if (element === null) return
        if (document.pictureInPictureElement === element) void document.exitPictureInPicture().catch(() => undefined)
        else void element.requestPictureInPicture().catch(() => undefined)
    }

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
        const target = event.target as HTMLElement
        if (target.closest('[role=menu]') !== null) return
        const onSlider = target.closest('[role=slider]') !== null || target.getAttribute('type') === 'range'
        const onButton = target.closest('button') !== null
        const element = video.current
        switch (event.key) {
            case ' ':
                if (onButton || onSlider) return
                toggle()
                break
            case 'k':
            case 'K':
                toggle()
                break
            case 'ArrowLeft':
            case 'ArrowRight':
                if (onSlider || element === null) return
                seekTo(element.currentTime + (event.key === 'ArrowLeft' ? -SEEK_STEP : SEEK_STEP))
                break
            case 'ArrowUp':
            case 'ArrowDown':
                if (onSlider || element === null) return
                setVolume(element.volume + (event.key === 'ArrowDown' ? -VOLUME_STEP : VOLUME_STEP))
                break
            case 'f':
            case 'F':
                toggleFullscreen()
                break
            case 'm':
            case 'M':
                toggleMute()
                break
            default:
                return
        }
        event.preventDefault()
        reveal()
    }

    const onPicturePointerUp = (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return
        if (event.pointerType === 'touch' && state.playing && !active) {
            reveal()
            return
        }
        toggle()
    }

    const shown = state.playing ? active || held || menuOpen : state.started || active || held || menuOpen
    const at = scrub ?? state.time
    const level = state.muted ? 0 : state.volume

    return (
        <div
            ref={root}
            data-slot="video-player"
            data-playing={state.playing || undefined}
            data-controls={shown ? 'shown' : 'hidden'}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerMove={(event) => {
                if (event.pointerType !== 'touch') reveal()
            }}
            onPointerLeave={() => {
                if (state.playing) {
                    clearTimeout(timer.current)
                    setActive(false)
                }
            }}
            onFocus={reveal}
            className={cn(
                '@container relative isolate aspect-video w-full overflow-hidden rounded-surface bg-terminal text-terminal-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[controls=hidden]:data-playing:cursor-none',
                fullscreen && 'aspect-auto rounded-none',
                className,
            )}
        >
            <video
                ref={attach}
                src={src}
                poster={poster}
                autoPlay={autoPlay}
                loop={loop}
                muted={startMuted}
                preload={preload}
                playsInline
                className="absolute inset-0 size-full object-contain"
            >
                {tracks.map((track, index) => (
                    <track
                        key={`${String(index)}-${track.src}`}
                        src={track.src}
                        label={track.label}
                        srcLang={track.lang}
                        kind={track.kind ?? 'subtitles'}
                    />
                ))}
            </video>

            <div aria-hidden className="absolute inset-0" onPointerUp={onPicturePointerUp} onDoubleClick={toggleFullscreen} />

            {cue !== '' && (
                <div
                    className={cn(
                        'pointer-events-none absolute inset-x-0 flex justify-center px-4 transition-[bottom] duration-200',
                        shown ? 'bottom-16' : 'bottom-4',
                    )}
                >
                    <p className="max-w-[85%] rounded-mini bg-terminal/80 px-2 py-0.5 text-center text-xs whitespace-pre-line text-terminal-foreground @md:text-sm @2xl:text-base">
                        {cue}
                    </p>
                </div>
            )}

            {!state.started && !state.playing && !shown && (
                <Button
                    size="icon-lg"
                    aria-label={words.play}
                    onClick={toggle}
                    className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-surface bg-terminal/70 text-terminal-foreground shadow-md backdrop-blur-sm hover:bg-terminal/85 [&_svg:not([class*='size-'])]:size-6"
                >
                    <Play className="translate-x-px fill-current" aria-hidden />
                </Button>
            )}

            <div
                className={cn(
                    'absolute inset-x-0 bottom-0 bg-linear-to-t from-terminal/90 via-terminal/55 to-transparent px-2 pt-10 pb-1.5 transition-opacity duration-200 @lg:px-3',
                    shown ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                onPointerEnter={() => {
                    setHeld(true)
                }}
                onPointerLeave={() => {
                    setHeld(false)
                }}
                onFocus={() => {
                    setHeld(true)
                }}
                onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false)
                }}
            >
                <div className="px-1">
                    <Position
                        tone="overlay"
                        at={at}
                        duration={state.duration}
                        buffered={state.buffered}
                        label={words.seek}
                        onSeek={seekTo}
                        onScrub={setScrub}
                    />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <div className="flex min-w-0 items-center">
                        {title !== undefined && (
                            <span className="hidden truncate px-1.5 text-sm font-medium text-terminal-foreground @md:inline">{title}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <TransportButton tone="overlay" label={words.back} onClick={() => seekTo(at - SKIP)}>
                            <RotateCcw aria-hidden />
                        </TransportButton>
                        <PlayButton tone="overlay" playing={state.playing} onToggle={toggle} words={words} />
                        <TransportButton tone="overlay" label={words.forward} onClick={() => seekTo(at + SKIP)}>
                            <RotateCw aria-hidden />
                        </TransportButton>
                    </div>
                    <div className="flex min-w-0 items-center justify-end gap-0.5">
                        <div className="hidden @md:block">
                            <VolumeControl
                                tone="overlay"
                                level={level}
                                muted={state.muted}
                                onMutedChange={() => toggleMute()}
                                onVolumeChange={setVolume}
                                words={words}
                            />
                        </div>
                        <div className="@md:hidden">
                            <VolumeControl
                                tone="overlay"
                                compact
                                level={level}
                                muted={state.muted}
                                onMutedChange={() => toggleMute()}
                                onVolumeChange={setVolume}
                                words={words}
                            />
                        </div>
                        {tracks.length > 0 && (
                            <CaptionsControl
                                tracks={tracks}
                                caption={caption}
                                onCaption={setCaption}
                                words={words}
                                container={root}
                                onOpenChange={setMenuOpen}
                            />
                        )}
                        {rates.length > 1 && (
                            <DropdownMenu onOpenChange={setMenuOpen}>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={words.speed}
                                            className={cn(
                                                ON_PICTURE,
                                                'hidden w-auto min-w-8 px-1.5 font-mono text-xs tabular-nums @md:inline-flex',
                                            )}
                                        />
                                    }
                                >
                                    {`${String(state.rate)}x`}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent container={root} side="top" align="end" className="w-auto min-w-24">
                                    <DropdownMenuRadioGroup
                                        value={String(state.rate)}
                                        onValueChange={(value: string) => {
                                            setRate(Number(value))
                                        }}
                                    >
                                        {rates.map((rate) => (
                                            <DropdownMenuRadioItem key={rate} value={String(rate)} className="font-mono tabular-nums">
                                                {`${String(rate)}x`}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {pipSupported && (
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={pictureInPicture ? words.exitPictureInPicture : words.pictureInPicture}
                                aria-pressed={pictureInPicture}
                                onClick={togglePictureInPicture}
                                className={cn(ON_PICTURE, 'hidden @sm:inline-flex')}
                            >
                                <PictureInPicture2 aria-hidden />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={fullscreen ? words.exitFullscreen : words.fullscreen}
                            onClick={toggleFullscreen}
                            className={ON_PICTURE}
                        >
                            {fullscreen ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

/** A toggle for a single track, and a menu of tracks and Off for several. */
function CaptionsControl({
    tracks,
    caption,
    onCaption,
    words,
    container,
    onOpenChange,
}: {
    tracks: readonly VideoTrack[]
    caption: number
    onCaption: (index: number) => void
    words: VideoPlayerWords
    container: React.RefObject<HTMLDivElement | null>
    onOpenChange: (open: boolean) => void
}) {
    const on = caption >= 0
    const glyph = <Captions className={cn(on && 'text-primary')} aria-hidden />
    if (tracks.length === 1) {
        return (
            <Button
                variant="ghost"
                size="icon"
                aria-label={words.captions}
                aria-pressed={on}
                onClick={() => {
                    onCaption(on ? -1 : 0)
                }}
                className={ON_PICTURE}
            >
                {glyph}
            </Button>
        )
    }
    return (
        <DropdownMenu onOpenChange={onOpenChange}>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={words.captions} className={ON_PICTURE} />}>
                {glyph}
            </DropdownMenuTrigger>
            <DropdownMenuContent container={container} side="top" align="end" className="w-auto min-w-32">
                <DropdownMenuRadioGroup
                    value={String(caption)}
                    onValueChange={(value: string) => {
                        onCaption(Number(value))
                    }}
                >
                    <DropdownMenuRadioItem value="-1">{words.captionsOff}</DropdownMenuRadioItem>
                    {tracks.map((track, index) => (
                        <DropdownMenuRadioItem key={`${String(index)}-${track.src}`} value={String(index)}>
                            {track.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
