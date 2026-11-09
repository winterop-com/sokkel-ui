import { Ellipsis, Maximize, Minimize, PictureInPicture2, Play, RefreshCw, RotateCcw, RotateCw } from 'lucide-react'
import {
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type KeyboardEvent,
    type PointerEvent,
    type ReactNode,
    type Ref,
} from 'react'

import { useStored } from '../../hooks/use-stored'
import { cn } from '../../lib/cn'
import { enterFullscreen, exitFullscreen, fullscreenElement, subscribeFullscreen } from '../../lib/fullscreen'
import type { Store } from '../../lib/stored'
import { Button } from '../ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Spinner } from '../ui/spinner'
import {
    CAPTIONS_KEY,
    captionCss,
    captionSettings,
    captionTrackKey,
    chosenCaptionTrack,
    isCaptionChoice,
    type CaptionBackground,
    type CaptionColor,
    type CaptionEdge,
    type CaptionSettings,
    type CaptionStyle,
} from './captions'
import { CaptionsMenu } from './CaptionsMenu'
import { formatRate, MEDIA_RATES, PlayButton, Position, RateMenu, TransportButton, VolumeControl } from './MediaControls'
import { useOneSound } from './one-sound'
import { type MediaRange } from './time'
import {
    isStalled,
    mediaError,
    nextTry,
    onReturn,
    resumeAt,
    trackProgress,
    type Progress,
    type VideoError,
    type VideoSource,
} from './video-source'
import { readVideoStats, type VideoStats } from './video-stats'

export type { VideoError, VideoErrorKind, VideoSource, VideoSourceAttach, VideoSourceReport, VideoSourceStats } from './video-source'
export type { VideoStats } from './video-stats'
export type { CaptionBackground, CaptionColor, CaptionEdge, CaptionSettings, CaptionStyle } from './captions'

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

/** One rendition the viewer may pick, such as Auto or 720p. */
export interface VideoQuality {
    value: string
    /** What the menu and its button say: `720p`, `Auto`. */
    label: string
    /** A second word in the menu, such as the rendition's bitrate or what Auto plays now. */
    detail?: string
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
    /** The quality menu's name. */
    quality: string
    /** The menu a narrow player keeps its speed and quality in. */
    more: string
    captions: string
    captionsOff: string
    /** The captions menu's settings, each a submenu. */
    captionSize: string
    captionColor: string
    captionBackground: string
    captionEdge: string
    captionColors: Record<CaptionColor, string>
    captionBackgrounds: Record<CaptionBackground, string>
    captionEdges: Record<CaptionEdge, string>
    pictureInPicture: string
    exitPictureInPicture: string
    fullscreen: string
    exitFullscreen: string
    back: string
    forward: string
    /** Said over the picture while it tries again after a stall or an error. */
    retrying: string
    /** Said over the picture once its tries are spent. */
    failed: string
    /** Said over the picture when the browser cannot play the source at all. */
    unsupported: string
    retry: string
}

export const VIDEO_PLAYER_WORDS: VideoPlayerWords = {
    play: 'Play',
    pause: 'Pause',
    mute: 'Mute',
    unmute: 'Unmute',
    volume: 'Volume',
    seek: 'Seek',
    speed: 'Playback speed',
    quality: 'Quality',
    more: 'More',
    captions: 'Captions',
    captionsOff: 'Off',
    captionSize: 'Size',
    captionColor: 'Color',
    captionBackground: 'Background',
    captionEdge: 'Edge',
    captionColors: { white: 'White', yellow: 'Yellow', green: 'Green', cyan: 'Cyan', magenta: 'Magenta' },
    captionBackgrounds: { none: 'None', translucent: 'Translucent', solid: 'Solid' },
    captionEdges: { outline: 'Outline', shadow: 'Drop shadow', none: 'None' },
    pictureInPicture: 'Picture in picture',
    exitPictureInPicture: 'Exit picture in picture',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    back: 'Back 10 seconds',
    forward: 'Forward 10 seconds',
    retrying: 'Trying again',
    failed: 'The video could not be played',
    unsupported: 'This video cannot be played in this browser',
    retry: 'Retry',
}

/** What an app does to a player from outside, as its own shortcuts and controls drive it. */
export interface VideoPlayerHandle {
    play: () => void
    pause: () => void
    /** Plays when paused and pauses when playing. */
    toggle: () => void
    /** Whether it is playing. */
    playing: () => boolean
    /** Where it is, in seconds. */
    time: () => number
    /** Moves to a second, within the video's length, held until the media can take it. */
    seekTo: (seconds: number) => void
    /** Moves by a number of seconds, back when negative. */
    seekBy: (seconds: number) => void
    /** The volume, from 0 to 1. */
    volume: () => number
    /** Sets the volume, from 0 to 1, unmuting above 0. */
    setVolume: (level: number) => void
    toggleMute: () => void
    toggleFullscreen: () => void
    /** Loads the media again where it was and plays, as the Retry button does. */
    retry: () => void
    focus: () => void
    /**
     * How it is playing now: the picture's size, what is buffered ahead, the frames dropped, and
     * what the source's engine knows (bandwidth, the rendition and its bitrate), for a stats
     * overlay; `useVideoStats` reads it once a second.
     */
    stats: () => VideoStats | null
}

/** How far the left and right arrows seek, in seconds, and how far up and down move the volume. */
const SEEK_STEP = 5
const VOLUME_STEP = 0.1
/** How far the back and forward buttons skip, in seconds. */
const SKIP = 10
/** `HTMLMediaElement.HAVE_METADATA`: from here a seek is taken rather than dropped. */
const HAVE_METADATA = 1
/** How far past the point a try resumed at playback must get before the tries count from zero again, in seconds. */
const RECOVERED_AFTER = 5
/** How often the playhead is read while playing, to tell a stall, in milliseconds. */
const WATCH_EVERY = 1000
/** How far a nudge moves a playhead whose buffer stalled while the page was hidden, in seconds. */
const NUDGE = 0.01

/** A control drawn over the picture, light on dark in either scheme. */
const ON_PICTURE =
    'text-terminal-foreground hover:bg-terminal-foreground/15 hover:text-terminal-foreground dark:hover:bg-terminal-foreground/15 aria-expanded:bg-terminal-foreground/15 aria-expanded:text-terminal-foreground'

export interface VideoPlayerProps {
    /** The video's URL. Give `source` instead for media an engine feeds, such as an HTTP live stream. */
    src?: string
    /** What feeds the element in place of `src`, such as `hlsSource` from the media package. */
    source?: VideoSource
    /** What is playing, shown at the controls' left. */
    title?: ReactNode
    /** A picture shown until the first frame is ready. */
    poster?: string
    tracks?: readonly VideoTrack[]
    /**
     * Fetches the media and its tracks with CORS, as the `<video>` element's `crossorigin`: needed for
     * captions served from another origin, whose server must then allow it, and the media's too.
     * `use-credentials` sends the viewer's cookies with each request.
     */
    crossOrigin?: 'anonymous' | 'use-credentials'
    /**
     * How captions look until the viewer chooses otherwise in the captions menu: words on the
     * picture, outlined, with no box, at the usual size, unless given here, such as `{ size: 0.5 }`
     * for half of it.
     */
    captionDefaults?: Partial<CaptionStyle>
    /**
     * Where the viewer's caption settings and chosen track are kept: a store the app holds (made
     * with `createStore`, or its own over a settings file), so every player and the app's own
     * settings share them. By default they are kept in `localStorage` under `CAPTIONS_KEY` and the
     * app's prefix (`useStored`).
     */
    captionStore?: Store<Partial<CaptionSettings>>
    /** The playback speeds offered, as multiples of normal speed: `MEDIA_RATES` by default. */
    rates?: readonly number[]
    /**
     * The speed each new media starts at, as a multiple of normal speed, such as the viewer's last
     * choice kept by the app: 1 by default. A new value is taken at once.
     */
    defaultRate?: number
    /** The viewer chose a speed in the speed menu: for keeping it, as the next video's `defaultRate`. */
    onRateChange?: (rate: number) => void
    /**
     * The renditions the viewer may pick among, such as Auto, 1080p and 720p: a menu after the speed,
     * closing on a choice, whose button says the chosen one. The app plays the one chosen, as a new
     * `source` or `src` with `startAt` where it was.
     */
    qualities?: readonly VideoQuality[]
    /** The `value` of the rendition chosen. */
    quality?: string
    onQualityChange?: (quality: string) => void
    autoPlay?: boolean
    loop?: boolean
    /** Start muted. */
    muted?: boolean
    preload?: 'none' | 'metadata' | 'auto'
    /**
     * Where to start, in seconds, as when resuming: taken when the media has its length, for each
     * new `src` or `source`. To move it after that, use the handle's `seekTo`.
     */
    startAt?: number
    /** Where it is, in seconds, as it plays and after each seek: for keeping one's place. */
    onTime?: (seconds: number) => void
    /**
     * It started or stopped playing, however it was asked (its controls, the handle, another sound
     * starting, the end), as a server encoding ahead is told to stop on a pause. Told once per
     * change, never as it unmounts, and not for a try that loads the media again.
     */
    onPlayingChange?: (playing: boolean) => void
    /** It played to the end. */
    onEnded?: () => void
    /** An error it met: `fatal` once it has given up and says so over the picture, otherwise it is trying again. */
    onError?: (error: VideoError) => void
    onFullscreenChange?: (fullscreen: boolean) => void
    /**
     * How many times it tries again after a stall or an error before it says it failed: it waits a
     * second before the first try and twice as long before each next, and loads the media again
     * where it was. Media the browser cannot play is said at once.
     */
    retries?: number
    /**
     * How long the playhead may stand while playing before it counts as a stall, in milliseconds:
     * waiting for data, or a seek that does not land.
     */
    stallAfter?: number
    /**
     * What the app draws over the picture's top corner, such as `VideoStatsOverlay`: kept over the
     * picture in full screen, and pressed without playing or pausing the video. It stays over a
     * `cover`, and one taller than the picture scrolls.
     */
    overlay?: ReactNode
    /**
     * What the app draws over the whole picture, such as `UpNext` from the media package once the
     * video has ended: centered on the picture dimmed behind it, kept in full screen. While it
     * stands the controls are hidden and out of reach and the player answers no keys of its own,
     * so the cover's own buttons are what the viewer does next.
     */
    cover?: ReactNode
    /**
     * The app's own buttons in the controls, before full screen, such as theater mode:
     * `TransportButton`s with `tone="overlay"` and `size="md"`, drawn as the player's own. Like the
     * speed and the quality they show where the controls have room, from a player of medium width.
     */
    actions?: ReactNode
    /** Show the controls before the video is first played; otherwise only the play button is drawn until then. */
    defaultControlsVisible?: boolean
    /** How long the controls stay after the pointer stops while playing, in milliseconds. */
    hideAfter?: number
    /**
     * Whether its sound pauses the other sounds the library plays, and another starting pauses it.
     * Only a video that is heard takes the sound: a muted one, such as a preview, never stops the music.
     */
    exclusive?: boolean
    /**
     * Whether it answers keys itself while focused. Off, an app's own shortcuts drive it through
     * the handle on `ref`, and every key goes on to them.
     */
    keys?: boolean
    words?: Partial<VideoPlayerWords>
    /** Play, pause, seek, the volume and fullscreen, for an app's own shortcuts and controls. */
    ref?: Ref<VideoPlayerHandle>
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

/** A stall or an error under way: a try waiting or loading, or the failure said once the tries are spent. */
type Trouble = { phase: 'retrying' } | { phase: 'failed'; unsupported: boolean } | null

/**
 * A seek held until the media has its length: `startAt`, or a second to go to (none for a live
 * stream's live edge), playing after it or not.
 */
type Held = 'start' | { at?: number; play: boolean } | null

function rangesOf(video: HTMLVideoElement): MediaRange[] {
    const ranges: MediaRange[] = []
    for (let index = 0; index < video.buffered.length; index += 1) {
        ranges.push({ start: video.buffered.start(index), end: video.buffered.end(index) })
    }
    return ranges
}

/** The stretch a video can seek in, its last range, or null when it can seek nowhere yet. */
function seekableOf(video: HTMLVideoElement): MediaRange | null {
    const count = video.seekable.length
    return count === 0 ? null : { start: video.seekable.start(count - 1), end: video.seekable.end(count - 1) }
}

/** What the viewer chose so far, as kept: an object of the fields they set, or none. */
const chosenOf = (choice: unknown): Partial<CaptionSettings> => (isCaptionChoice(choice) ? choice : {})

const noStore = () => () => undefined
const nothing = () => undefined

/**
 * The viewer's caption choices and the way to change them: from the app's store when it hands one,
 * else kept with `useStored`.
 */
function useCaptionChoice(store: Store<Partial<CaptionSettings>> | undefined): [unknown, (next: Partial<CaptionSettings>) => void] {
    const [kept, keep] = useStored<Partial<CaptionSettings>>(CAPTIONS_KEY, {}, { check: isCaptionChoice })
    const held = useSyncExternalStore(store?.subscribe ?? noStore, store?.get ?? nothing, store?.get ?? nothing)
    return store === undefined ? [kept, keep] : [held, store.set]
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
 * `keys={false}` leaves every key to the app, whose shortcuts drive the player through its handle.
 * Fullscreen goes through `lib/fullscreen`, so in a desktop shell the window's own full screen
 * stands in for the browser's once the app hands it over (`desktop.setFullscreen` on `Shell`).
 *
 * Captions are drawn as words on the picture, outlined, with no box, sized against the player's
 * width. The captions menu picks the track and the text's size, ink, background (none, see-through
 * or solid) and edge (an outline, a drop shadow or none); the choice and the track are kept for the
 * next video, in the app's `captionStore` or in `localStorage`, and the app's `captionDefaults`
 * stand until the viewer chooses.
 *
 * It plays `src`, or media an engine feeds through `source`, from `startAt` when given, and tells
 * where it is through `onTime` and whether it plays through `onPlayingChange`. A playhead that
 * stands longer than `stallAfter` while playing, or a network or decoding error, loads the media
 * again where it was (a live stream's live edge once its window has moved past that point), the
 * source's engine starting its load there, `retries` times with a growing wait, before it pauses and
 * says over the picture that the video could not be played, with a button to try again where it
 * stood; played again, as by the viewer, it no longer counts as failed. When the page is shown
 * again after being hidden, a video that was playing plays on, and one whose buffer stalled while
 * away is moved a hair to wake it; a pause asked through the handle while hidden stays.
 *
 * Once heard it pauses whatever else the library is playing, so one sound is heard at a time;
 * `exclusive={false}` lets it play alongside.
 */
export function VideoPlayer({
    src,
    source,
    title,
    poster,
    tracks = [],
    crossOrigin,
    captionDefaults,
    captionStore,
    rates = MEDIA_RATES,
    defaultRate = 1,
    onRateChange,
    qualities = [],
    quality,
    onQualityChange,
    autoPlay = false,
    loop = false,
    muted: startMuted = false,
    preload = 'metadata',
    startAt,
    onTime,
    onPlayingChange,
    onEnded,
    onError,
    onFullscreenChange,
    retries = 3,
    stallAfter = 8000,
    overlay,
    cover,
    actions,
    defaultControlsVisible = false,
    hideAfter = 2500,
    exclusive = true,
    keys = true,
    words: given,
    ref,
    videoRef,
    className,
}: VideoPlayerProps) {
    const words = { ...VIDEO_PLAYER_WORDS, ...given }
    const root = useRef<HTMLDivElement | null>(null)
    const video = useRef<HTMLVideoElement | null>(null)
    const controls = useRef<HTMLDivElement | null>(null)
    const covered = cover !== undefined && cover !== null && cover !== false
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
    const [choice, choose] = useCaptionChoice(captionStore)
    const captions = captionSettings(choice, captionDefaults)
    const caption = chosenCaptionTrack(tracks, captions.track)
    const [cue, setCue] = useState('')
    const [fullscreen, setFullscreen] = useState(false)
    const [pictureInPicture, setPictureInPicture] = useState(false)
    const [pipSupported, setPipSupported] = useState(false)
    const [active, setActive] = useState(defaultControlsVisible)
    const [held, setHeld] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [trouble, setTrouble] = useState<Trouble>(null)
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    // Whether it was playing as the page was hidden, so it plays on when shown; a pause asked while hidden clears it.
    const away = useRef(false)
    const pauseAsked = () => {
        if (document.visibilityState === 'hidden') away.current = false
        video.current?.pause()
    }
    useOneSound(pauseAsked, state.playing && !state.muted && state.volume > 0, exclusive)

    // What the element's listeners read, set after each render so a parent that renders again
    // never has them taken off and put back.
    const latest = useRef({
        source,
        startAt,
        onTime,
        onPlayingChange,
        onEnded,
        onError,
        onFullscreenChange,
        onRateChange,
        retries,
        stallAfter,
    })
    useEffect(() => {
        latest.current = {
            source,
            startAt,
            onTime,
            onPlayingChange,
            onEnded,
            onError,
            onFullscreenChange,
            onRateChange,
            retries,
            stallAfter,
        }
    })
    const seek = useRef<Held>(null)
    const tries = useRef(0)
    const resumedFrom = useRef(0)
    const failed = useRef(false)
    const started = useRef(false)
    const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const watch = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
    const progress = useRef<Progress | null>(null)
    // Whether a try is under way, from the stall or error it met until the media plays again or the tries are spent.
    const trying = useRef(false)
    // Whether a try has loaded the media again and waits for it to play, to note where it picked up.
    const resuming = useRef(false)
    // What `onPlayingChange` last said, so each change is told once.
    const told = useRef<boolean | null>(null)
    const detach = useRef<(() => void) | null>(null)
    // The source attached now, which the stats are read from: not the newest prop, which may be a copy made on a later render.
    const attached = useRef<VideoSource | null>(null)
    const filled = useRef(false)
    const sourceKey = source === undefined ? undefined : (source.id ?? source)

    const attach = useCallback(
        (element: HTMLVideoElement | null) => {
            video.current = element
            if (typeof videoRef === 'function') videoRef(element)
            else if (videoRef !== undefined && videoRef !== null) videoRef.current = element
        },
        [videoRef],
    )

    // The functions below touch only refs and state setters, so the copies the element's
    // listeners hold from the first render do the same as the newest.

    const stopWatch = () => {
        clearInterval(watch.current)
        watch.current = undefined
        progress.current = null
    }

    /** Reads the playhead once a second while playing, and meets a stall once it has stood `stallAfter`. */
    const startWatch = (element: HTMLVideoElement) => {
        if (watch.current !== undefined) return
        progress.current = null
        watch.current = setInterval(() => {
            if (element.paused || element.ended) {
                stopWatch()
                return
            }
            const now = Date.now()
            progress.current = trackProgress(progress.current, element.currentTime, now)
            const patience = latest.current.stallAfter
            if (isStalled(progress.current, now, patience)) {
                meet({ kind: 'stalled', message: `The playhead stood ${String(patience)} ms while playing` })
            }
        }, WATCH_EVERY)
    }

    /** Tells the app it started or stopped playing, once per change. */
    const tell = (playing: boolean) => {
        if (told.current === playing) return
        told.current = playing
        latest.current.onPlayingChange?.(playing)
    }

    const takeHeldSeek = (element: HTMLVideoElement) => {
        const next = seek.current
        seek.current = null
        if (next === null) return
        const at = next === 'start' ? latest.current.startAt : next.at
        if (at !== undefined && at > 0) {
            element.currentTime = Number.isFinite(element.duration) ? Math.min(element.duration, at) : at
        }
        if (next !== 'start' && next.play) void element.play().catch(() => undefined)
    }

    const fail = (error: Omit<VideoError, 'fatal'>, unsupported: boolean) => {
        stopWatch()
        clearTimeout(retryTimer.current)
        retryTimer.current = undefined
        failed.current = true
        trying.current = false
        // Held still where it stood, so media that comes back does not play on under the failure; Retry picks up there.
        video.current?.pause()
        setTrouble({ phase: 'failed', unsupported })
        tell(false)
        latest.current.onError?.({ ...error, fatal: true })
    }

    const connect = (element: HTMLVideoElement, feed: VideoSource, startAt?: number) => {
        detach.current?.()
        detach.current = null
        if (feed.canPlay?.(element) === false) {
            fail({ kind: 'unsupported', message: 'The source cannot be played in this browser' }, true)
            return
        }
        let live = true
        const off = feed.attach(
            element,
            (error) => {
                if (!live) return
                if (error.fatal) meet(error)
                else if (!failed.current) latest.current.onError?.(error)
            },
            { startAt: startAt !== undefined && startAt > 0 ? startAt : undefined },
        )
        attached.current = feed
        detach.current = () => {
            live = false
            attached.current = null
            off()
        }
    }

    /**
     * Where a try goes back to: a seek still held from before the media had its length, or where it
     * is, or a live stream's live edge once its window has moved past where it is.
     */
    const resumePoint = (): Exclude<Held, null> => {
        if (seek.current !== null) return seek.current
        const element = video.current
        if (element === null) return { at: 0, play: started.current }
        const live = attached.current?.stats?.(element)?.live === true || element.duration === Number.POSITIVE_INFINITY
        return { at: resumeAt(element.currentTime, seekableOf(element), live), play: started.current }
    }

    const reload = (point: Exclude<Held, null>) => {
        const element = video.current
        if (element === null) return
        stopWatch()
        failed.current = false
        seek.current = point
        resuming.current = true
        const at = point === 'start' ? latest.current.startAt : point.at
        // Until it plays, the tries count from the point asked for; a live edge is known only once it plays there.
        resumedFrom.current = at ?? Number.POSITIVE_INFINITY
        const feed = latest.current.source
        if (feed !== undefined) connect(element, feed, at)
        else element.load()
    }

    const meet = (error: Omit<VideoError, 'fatal'>) => {
        if (retryTimer.current !== undefined || failed.current) return
        stopWatch()
        const point = resumePoint()
        const next = nextTry(error.kind, tries.current, latest.current.retries)
        if (next === null) {
            fail(error, false)
            return
        }
        tries.current += 1
        trying.current = true
        setTrouble({ phase: 'retrying' })
        latest.current.onError?.({ ...error, fatal: false })
        retryTimer.current = setTimeout(() => {
            retryTimer.current = undefined
            reload(point)
        }, next.delay)
    }

    const retry = () => {
        const point = resumePoint()
        clearTimeout(retryTimer.current)
        retryTimer.current = undefined
        tries.current = 0
        setTrouble(null)
        reload({ at: point === 'start' ? (latest.current.startAt ?? 0) : point.at, play: true })
    }

    useEffect(() => {
        const element = video.current
        if (element === null) return
        const read = () => {
            started.current ||= !element.paused
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
    }, [src, sourceKey])

    useEffect(() => {
        const element = video.current
        if (element === null) return
        const metadata = () => {
            takeHeldSeek(element)
        }
        const time = () => {
            if (tries.current > 0 && element.currentTime > resumedFrom.current + RECOVERED_AFTER) tries.current = 0
            latest.current.onTime?.(element.currentTime)
        }
        const played = () => {
            startWatch(element)
            tell(true)
        }
        const paused = () => {
            stopWatch()
            // A pause on the way out of the page, or while a try loads the media again, is not one to tell.
            if (element.isConnected && !trying.current) tell(false)
        }
        const ended = () => {
            stopWatch()
            latest.current.onEnded?.()
        }
        const recovered = (event: Event) => {
            // Where a try picked up is where it first plays, which an engine starting at a live edge settles only then.
            if (resuming.current && event.type === 'playing') {
                resuming.current = false
                resumedFrom.current = element.currentTime
            }
            // Media played again after a failure, as when the viewer presses Play, has not failed.
            if (failed.current && event.type === 'playing') {
                failed.current = false
                tries.current = 0
                resumedFrom.current = element.currentTime
            }
            if (!element.paused) startWatch(element)
            if (retryTimer.current === undefined && !failed.current) {
                trying.current = false
                setTrouble(null)
            }
        }
        const error = () => {
            // An element emptied on purpose, as a source does when it lets go, has nothing to fail.
            if (!element.hasAttribute('src') && element.srcObject === null) return
            const found = mediaError(element.error)
            if (found !== null) meet(found)
        }
        // A page shown again plays on where it was playing as it was hidden, or wakes a buffer that stalled while away.
        const shown = () => {
            if (document.visibilityState === 'hidden') {
                away.current = !element.paused && !element.ended
                return
            }
            const was = away.current
            away.current = false
            if (failed.current || retryTimer.current !== undefined) return
            const step = onReturn(was, element.paused, element.readyState)
            if (step === 'play') void element.play().catch(() => undefined)
            else if (step === 'nudge') element.currentTime += NUDGE
        }
        element.addEventListener('loadedmetadata', metadata)
        element.addEventListener('timeupdate', time)
        element.addEventListener('play', played)
        element.addEventListener('pause', paused)
        element.addEventListener('ended', ended)
        element.addEventListener('playing', recovered)
        element.addEventListener('loadeddata', recovered)
        element.addEventListener('emptied', stopWatch)
        element.addEventListener('error', error)
        document.addEventListener('visibilitychange', shown)
        return () => {
            element.removeEventListener('loadedmetadata', metadata)
            element.removeEventListener('timeupdate', time)
            element.removeEventListener('play', played)
            element.removeEventListener('pause', paused)
            element.removeEventListener('ended', ended)
            element.removeEventListener('playing', recovered)
            element.removeEventListener('loadeddata', recovered)
            element.removeEventListener('emptied', stopWatch)
            element.removeEventListener('error', error)
            document.removeEventListener('visibilitychange', shown)
            stopWatch()
            clearTimeout(retryTimer.current)
            retryTimer.current = undefined
        }
    }, [])

    // Each new media starts afresh: no tries spent, nothing failed, and `startAt` held for its length.
    useEffect(() => {
        const element = video.current
        if (element === null) return
        stopWatch()
        clearTimeout(retryTimer.current)
        retryTimer.current = undefined
        tries.current = 0
        failed.current = false
        trying.current = false
        started.current = false
        resuming.current = false
        setTrouble(null)
        seek.current = 'start'
        const feed = latest.current.source
        if (feed === undefined) {
            if (src !== undefined && element.getAttribute('src') !== src) element.setAttribute('src', src)
            if (element.readyState >= HAVE_METADATA) takeHeldSeek(element)
            return
        }
        connect(element, feed, latest.current.startAt)
        return () => {
            detach.current?.()
            detach.current = null
        }
    }, [src, sourceKey])

    // Each new media starts at the app's speed, which the element keeps through a load as its default.
    useEffect(() => {
        const element = video.current
        if (element === null) return
        element.defaultPlaybackRate = defaultRate
        element.playbackRate = defaultRate
    }, [defaultRate, src, sourceKey])

    useEffect(() => {
        const element = root.current
        const change = () => {
            const next = element !== null && fullscreenElement() === element
            setFullscreen(next)
            if (filled.current === next) return
            filled.current = next
            latest.current.onFullscreenChange?.(next)
        }
        const stop = subscribeFullscreen(change)
        return () => {
            stop()
            if (element !== null) exitFullscreen(element)
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

    // Controls going out of reach under a cover hand their focus to the player, so the keyboard stays in it.
    useLayoutEffect(() => {
        if (covered && controls.current?.contains(document.activeElement) === true) root.current?.focus()
    }, [covered])

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
        else pauseAsked()
    }
    const seekTo = (seconds: number) => {
        const element = video.current
        if (element === null) return
        const at = Math.max(0, seconds)
        if (element.readyState < HAVE_METADATA) {
            seek.current = { at, play: false }
            return
        }
        const end = Number.isFinite(element.duration) ? element.duration : at
        element.currentTime = Math.min(end, at)
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
        latest.current.onRateChange?.(rate)
    }
    const toggleFullscreen = () => {
        const container = root.current
        const element = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
        if (container === null) return
        if (fullscreenElement() === container) exitFullscreen(container)
        // A phone with no full screen for an element still plays the video full screen itself.
        else if (!enterFullscreen(container, { cover: element?.webkitEnterFullscreen === undefined })) element?.webkitEnterFullscreen?.()
    }
    const togglePictureInPicture = () => {
        const element = video.current
        if (element === null) return
        if (document.pictureInPictureElement === element) void document.exitPictureInPicture().catch(() => undefined)
        else void element.requestPictureInPicture().catch(() => undefined)
    }

    useImperativeHandle(ref, () => ({
        play: () => {
            void video.current?.play().catch(() => undefined)
        },
        pause: pauseAsked,
        toggle,
        playing: () => video.current !== null && !video.current.paused && !video.current.ended,
        time: () => video.current?.currentTime ?? 0,
        seekTo: (seconds) => {
            seekTo(seconds)
            reveal()
        },
        seekBy: (seconds) => {
            const pending = seek.current
            seekTo(((pending !== null && pending !== 'start' ? pending.at : undefined) ?? video.current?.currentTime ?? 0) + seconds)
            reveal()
        },
        volume: () => video.current?.volume ?? 1,
        setVolume: (level) => {
            setVolume(level)
            reveal()
        },
        toggleMute: () => {
            toggleMute()
            reveal()
        },
        toggleFullscreen,
        retry,
        focus: () => {
            root.current?.focus()
        },
        stats: () => {
            const element = video.current
            if (element === null) return null
            return readVideoStats(element, attached.current?.stats?.(element) ?? null)
        },
    }))

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!keys || covered || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
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

    const shown = !covered && (state.playing ? active || held || menuOpen : state.started || active || held || menuOpen)
    const cueCss = captionCss(captions)
    // A menu stays inside the player while it fills the screen, and is free to reach past a small one otherwise.
    const menuRoom = fullscreen ? root : undefined
    const at = scrub ?? state.time
    const level = state.muted ? 0 : state.volume
    const chosenQuality = qualities.find((one) => one.value === quality) ?? qualities[0]

    return (
        <div
            ref={root}
            data-slot="video-player"
            data-playing={state.playing || undefined}
            data-controls={covered ? 'covered' : shown ? 'shown' : 'hidden'}
            data-trouble={trouble?.phase}
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
                src={source === undefined ? src : undefined}
                poster={poster}
                autoPlay={autoPlay}
                loop={loop}
                muted={startMuted}
                preload={preload}
                crossOrigin={crossOrigin}
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
                        'pointer-events-none absolute inset-x-0 z-1 flex justify-center px-4 transition-[bottom] duration-200',
                        shown ? 'bottom-16' : 'bottom-[max(1rem,2.5cqw)]',
                    )}
                >
                    <p className="max-w-[85%] text-center whitespace-pre-line" style={cueCss.text}>
                        <span className="rounded-mini box-decoration-clone px-[0.3em] py-[0.05em]" style={cueCss.box}>
                            {cue}
                        </span>
                    </p>
                </div>
            )}

            {trouble === null && !covered && !state.started && !state.playing && !shown && (
                <Button
                    size="icon-lg"
                    aria-label={words.play}
                    onClick={toggle}
                    className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-surface bg-terminal/70 text-terminal-foreground shadow-md backdrop-blur-sm hover:bg-terminal/85 [&_svg:not([class*='size-'])]:size-6"
                >
                    <Play className="translate-x-px fill-current" aria-hidden />
                </Button>
            )}

            {trouble !== null && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                    <div
                        role={trouble.phase === 'failed' ? 'alert' : 'status'}
                        className="pointer-events-auto flex max-w-full flex-col items-center gap-2 rounded-surface bg-terminal/75 px-4 py-3 text-center text-sm text-terminal-foreground shadow-md backdrop-blur-sm"
                    >
                        {trouble.phase === 'retrying' ? (
                            <p className="flex items-center gap-2">
                                <Spinner aria-hidden />
                                {words.retrying}
                            </p>
                        ) : (
                            <>
                                <p>{trouble.unsupported ? words.unsupported : words.failed}</p>
                                {!trouble.unsupported && (
                                    <Button variant="ghost" size="sm" onClick={retry} className={ON_PICTURE}>
                                        <RefreshCw aria-hidden />
                                        {words.retry}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            <div
                ref={controls}
                inert={covered}
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
                        <div className="hidden @3xl:block">
                            <VolumeControl
                                tone="overlay"
                                level={level}
                                muted={state.muted}
                                onMutedChange={() => toggleMute()}
                                onVolumeChange={setVolume}
                                words={words}
                            />
                        </div>
                        <div className="@3xl:hidden">
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
                            <CaptionsMenu
                                tracks={tracks}
                                track={caption}
                                onTrackChange={(index) => {
                                    choose({ ...chosenOf(choice), track: index < 0 ? null : captionTrackKey(tracks[index]) })
                                }}
                                style={captions}
                                onStyleChange={(change) => {
                                    choose({ ...chosenOf(choice), ...change })
                                }}
                                words={words}
                                container={menuRoom}
                                onOpenChange={setMenuOpen}
                            />
                        )}
                        {rates.length > 1 && (
                            <RateMenu
                                tone="overlay"
                                size="md"
                                rate={state.rate}
                                rates={rates}
                                onRateChange={setRate}
                                label={words.speed}
                                container={menuRoom}
                                onOpenChange={setMenuOpen}
                                className="hidden @md:inline-flex"
                            />
                        )}
                        {qualities.length > 1 && chosenQuality !== undefined && (
                            <DropdownMenu onOpenChange={setMenuOpen}>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`${words.quality}: ${chosenQuality.label}`}
                                            className={cn(
                                                'w-auto min-w-8 px-1.5 font-mono text-xs tabular-nums',
                                                ON_PICTURE,
                                                'hidden @md:inline-flex',
                                            )}
                                        />
                                    }
                                >
                                    {chosenQuality.label}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent container={menuRoom} side="top" align="end" className="w-auto min-w-24">
                                    <DropdownMenuRadioGroup
                                        value={chosenQuality.value}
                                        onValueChange={(value: string) => onQualityChange?.(value)}
                                    >
                                        {qualities.map((option) => (
                                            <DropdownMenuRadioItem key={option.value} value={option.value} closeOnClick>
                                                <span className="flex-1">{option.label}</span>
                                                {option.detail !== undefined && (
                                                    <span className="text-muted-foreground">{option.detail}</span>
                                                )}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {(rates.length > 1 || (qualities.length > 1 && chosenQuality !== undefined)) && (
                            <DropdownMenu onOpenChange={setMenuOpen}>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={words.more}
                                            className={cn(ON_PICTURE, 'inline-flex @md:hidden')}
                                        />
                                    }
                                >
                                    <Ellipsis aria-hidden />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent container={menuRoom} side="top" align="end" className="w-auto min-w-40">
                                    {rates.length > 1 && (
                                        <DropdownMenuGroup>
                                            <DropdownMenuLabel>{words.speed}</DropdownMenuLabel>
                                            <DropdownMenuRadioGroup
                                                value={String(state.rate)}
                                                onValueChange={(value: string) => setRate(Number(value))}
                                            >
                                                {rates.map((rate) => (
                                                    <DropdownMenuRadioItem key={rate} value={String(rate)} closeOnClick>
                                                        {formatRate(rate)}
                                                    </DropdownMenuRadioItem>
                                                ))}
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuGroup>
                                    )}
                                    {rates.length > 1 && qualities.length > 1 && chosenQuality !== undefined && <DropdownMenuSeparator />}
                                    {qualities.length > 1 && chosenQuality !== undefined && (
                                        <DropdownMenuGroup>
                                            <DropdownMenuLabel>{words.quality}</DropdownMenuLabel>
                                            <DropdownMenuRadioGroup
                                                value={chosenQuality.value}
                                                onValueChange={(value: string) => onQualityChange?.(value)}
                                            >
                                                {qualities.map((option) => (
                                                    <DropdownMenuRadioItem key={option.value} value={option.value} closeOnClick>
                                                        <span className="flex-1">{option.label}</span>
                                                        {option.detail !== undefined && (
                                                            <span className="text-muted-foreground">{option.detail}</span>
                                                        )}
                                                    </DropdownMenuRadioItem>
                                                ))}
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuGroup>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {actions !== undefined && actions !== null && actions !== false && (
                            <div className="hidden @md:contents">{actions}</div>
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

            {covered && (
                <div
                    data-slot="video-cover"
                    className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-terminal/75 p-2 backdrop-blur-sm @lg:p-3"
                >
                    {cover}
                </div>
            )}

            {overlay !== undefined && overlay !== null && overlay !== false && (
                <div className="pointer-events-none absolute top-0 left-0 z-10 flex max-h-full max-w-full p-2 *:pointer-events-auto @lg:p-3">
                    {overlay}
                </div>
            )}
        </div>
    )
}
