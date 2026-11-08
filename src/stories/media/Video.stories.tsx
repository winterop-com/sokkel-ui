import type { Meta, StoryObj } from '@storybook/react-vite'
import { Activity, Maximize, Pause, Play, RotateCcw, RotateCw, Volume2 } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { createStore, useStore, type Store } from '@winterop-com/sokkel-ui/hooks/use-store'
import { useShortcuts } from '@winterop-com/sokkel-ui/hooks/use-shortcuts'
import { LogView, type LogLine } from '@winterop-com/sokkel-ui/LogView'
import { captionSettings, type CaptionSettings, type CaptionStyle } from '@winterop-com/sokkel-ui/media/captions'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { useVideoStats, type VideoStats } from '@winterop-com/sokkel-ui/media/video-stats'
import {
    VideoPlayer,
    type VideoError,
    type VideoPlayerHandle,
    type VideoSource,
    type VideoTrack,
} from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { ButtonGroup } from '@winterop-com/sokkel-ui/primitives/button-group'
import { hlsSource } from '@winterop-com/sokkel-ui-media/hls-source'
import { UpNext } from '@winterop-com/sokkel-ui-media/UpNext'
import { VideoStatsOverlay, type VideoStatsRow } from '@winterop-com/sokkel-ui-media/VideoStatsOverlay'
import captions from './fixtures/captions.vtt?url'
import clip from './fixtures/clip.webm?url'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/** The clip's English captions, on as it loads. */
const ENGLISH: VideoTrack[] = [
    { src: captions, label: 'English', lang: 'en', default: true },
    { src: captions, label: 'English (plain)', lang: 'en-x-plain' },
]

/** A player in the middle of a plain page, with what plays under it. The clip is a local, silent gradient. */
function Ground({
    children,
    after,
    title = 'Coastline, morning to evening',
    meta = ['Margaret', '1:36'],
}: {
    children: ReactNode
    after?: ReactNode
    title?: string
    meta?: string[]
}) {
    return (
        <div className="min-h-svh bg-background p-4 text-foreground sm:p-8">
            <Stack>
                {children}
                <div>
                    <p className="text-sm font-medium">{title}</p>
                    <MetaLine items={meta} />
                </div>
                {after}
            </Stack>
        </div>
    )
}

/** What a player says through its events, one line each, for a log under it. */
function useEventLog() {
    const [lines, setLines] = useState<LogLine[]>([])
    const second = useRef(-1)
    const add = (line: LogLine) => {
        setLines((previous) => [...previous, line])
    }
    return {
        lines,
        onTime: (seconds: number) => {
            const whole = Math.floor(seconds)
            if (whole === second.current) return
            second.current = whole
            add({ source: 'onTime', text: formatTime(seconds) })
        },
        onPlayingChange: (playing: boolean) => {
            add({ source: 'onPlayingChange', text: playing ? 'playing' : 'paused' })
        },
        onEnded: () => {
            add({ source: 'onEnded', text: 'played to the end' })
        },
        onError: (error: VideoError) => {
            add({
                source: 'onError',
                level: error.fatal ? 'error' : 'warning',
                text: `${error.kind}${error.fatal ? ', gave up' : ', trying again'}: ${error.message}`,
            })
        },
    }
}

/** A player given `startAt`, with what its events tell written under it. */
function Resumed() {
    const log = useEventLog()
    return (
        <Ground after={<LogView lines={log.lines} follow wrap numbered={false} className="max-h-48" />}>
            <VideoPlayer
                src={clip}
                preload="auto"
                startAt={72}
                defaultControlsVisible
                title="Coastline, morning to evening"
                onTime={log.onTime}
                onPlayingChange={log.onPlayingChange}
                onEnded={log.onEnded}
                onError={log.onError}
            />
        </Ground>
    )
}

/** What the viewer has chosen for captions, as the store keeps it, one fact each. */
function Kept({ store }: { store: Store<Partial<CaptionSettings>> }) {
    const settings = captionSettings(useStore(store), { size: 0.5 })
    const track = settings.track === undefined ? 'Default track' : settings.track === null ? 'Captions off' : `Track ${settings.track}`
    return (
        <MetaLine
            items={[
                `Size ${String(Math.round(settings.size * 100))}%`,
                `Color ${settings.color}`,
                `Background ${settings.background}`,
                `Edge ${settings.edge}`,
                track,
            ]}
        />
    )
}

/** A player whose caption settings go to a store the screen holds, read back under it. */
function CaptionsKept() {
    const [store] = useState(() => createStore<Partial<CaptionSettings>>({}))
    return (
        <Ground after={<Kept store={store} />}>
            <VideoPlayer
                src={`${clip}#t=24`}
                preload="auto"
                crossOrigin="anonymous"
                defaultControlsVisible
                title="Coastline, morning to evening"
                tracks={ENGLISH}
                captionDefaults={{ size: 0.5 }}
                captionStore={store}
            />
        </Ground>
    )
}

/** One player for each look, its settings held in a store of its own so no choice reaches another. */
function Styled({ style, label }: { style: Partial<CaptionStyle>; label: string }) {
    const [store] = useState(() => createStore<Partial<CaptionSettings>>(style))
    return (
        <Stack gap="sm">
            <VideoPlayer src={`${clip}#t=24`} preload="auto" tracks={ENGLISH} captionStore={store} />
            <p className="text-sm text-muted-foreground">{label}</p>
        </Stack>
    )
}

/** A reading as an engine playing an adaptive stream might give it. */
const READING: VideoStats = {
    resolution: { width: 1920, height: 1080 },
    bitrate: 4_200_000,
    bandwidth: 18_400_000,
    bufferAhead: 12.6,
    droppedFrames: 3,
    totalFrames: 1204,
    level: 2,
    levels: 4,
    engine: 'hls.js',
    live: false,
    playing: true,
    readyState: 4,
}

/** What a server that encodes the stream as it plays knows beside the player's own reading. */
const SERVER_ROWS: VideoStatsRow[] = [
    { label: 'Transcode', value: '0.92x realtime' },
    { label: 'Encoder', value: 'h264, hardware' },
    { label: 'Encoder load', value: '2 of 4 workers' },
    { label: 'Segments', value: '38 of 412' },
    { label: 'Other streams', value: '1' },
]

/** A reading with little buffered ahead, as when the encoder falls behind. */
const THIN: VideoStats = { ...READING, bufferAhead: 1.4, droppedFrames: 41 }

/** An episode in a queue, as a series plays them one after another. */
interface Episode {
    id: string
    title: string
    subtitle: string
}

const EPISODES: Episode[] = [
    { id: 'e1', title: 'Coastline, morning to evening', subtitle: 'Harbor, episode 1' },
    { id: 'e2', title: 'The long quay at low tide', subtitle: 'Harbor, episode 2' },
    { id: 'e3', title: 'Lighthouses of the western cape, from the first lamp to the last', subtitle: 'Harbor, episode 3' },
]

/**
 * A queue of episodes, each started near its end: as one ends, `UpNext` covers the picture and
 * counts down to the next, which Play now starts at once and Cancel turns down.
 */
function Queued() {
    const [index, setIndex] = useState(0)
    const [ended, setEnded] = useState(false)
    const episode = EPISODES[index]
    const next = EPISODES.at(index + 1)
    return (
        <Ground title={episode.title} meta={[episode.subtitle, `${String(index + 1)} of ${String(EPISODES.length)} in the queue`]}>
            <VideoPlayer
                key={episode.id}
                src={clip}
                preload="auto"
                startAt={88}
                autoPlay={index > 0}
                defaultControlsVisible
                title={episode.title}
                onEnded={() => setEnded(true)}
                onPlayingChange={(playing) => {
                    if (playing) setEnded(false)
                }}
                cover={
                    ended &&
                    next !== undefined && (
                        <UpNext
                            title={next.title}
                            subtitle={next.subtitle}
                            placeholderSeed={next.id}
                            countdown={5}
                            onPlay={() => {
                                setEnded(false)
                                setIndex(index + 1)
                            }}
                            onCancel={() => setEnded(false)}
                        />
                    )
                }
            />
        </Ground>
    )
}

/** A player whose keys and controls are the screen's, driving it through its handle. */
function DrivenFromOutside() {
    const player = useRef<VideoPlayerHandle>(null)
    useShortcuts(
        [
            { id: 'video-toggle', key: 'k', label: 'Play or pause', group: 'Video', run: () => player.current?.toggle() },
            { id: 'video-back', key: 'j', label: 'Back 10 seconds', group: 'Video', repeat: true, run: () => player.current?.seekBy(-10) },
            {
                id: 'video-forward',
                key: 'l',
                label: 'Forward 10 seconds',
                group: 'Video',
                repeat: true,
                run: () => player.current?.seekBy(10),
            },
            { id: 'video-mute', key: 'm', label: 'Mute', group: 'Video', run: () => player.current?.toggleMute() },
            { id: 'video-fullscreen', key: 'f', label: 'Fullscreen', group: 'Video', run: () => player.current?.toggleFullscreen() },
        ],
        [],
    )
    return (
        <Ground
            after={
                <Row wrap>
                    <ButtonGroup>
                        <Button variant="outline" aria-label="Back 10 seconds" onClick={() => player.current?.seekBy(-10)}>
                            <RotateCcw aria-hidden />
                        </Button>
                        <Button variant="outline" onClick={() => player.current?.play()}>
                            <Play aria-hidden />
                            Play
                        </Button>
                        <Button variant="outline" onClick={() => player.current?.pause()}>
                            <Pause aria-hidden />
                            Pause
                        </Button>
                        <Button variant="outline" aria-label="Forward 10 seconds" onClick={() => player.current?.seekBy(10)}>
                            <RotateCw aria-hidden />
                        </Button>
                    </ButtonGroup>
                    <Button variant="outline" onClick={() => player.current?.toggleMute()}>
                        <Volume2 aria-hidden />
                        Mute
                    </Button>
                    <Button variant="outline" onClick={() => player.current?.toggleFullscreen()}>
                        <Maximize aria-hidden />
                        Fullscreen
                    </Button>
                </Row>
            }
        >
            <VideoPlayer ref={player} src={`${clip}#t=24`} preload="auto" keys={false} title="Coastline, morning to evening" />
        </Ground>
    )
}

/** A player fed an HTTP live stream, with its stats a button away and what its events tell written under it. */
function Streamed() {
    const log = useEventLog()
    const player = useRef<VideoPlayerHandle>(null)
    const [stats, setStats] = useState(false)
    const reading = useVideoStats(player, { enabled: stats })
    return (
        <Ground
            after={
                <Stack>
                    <Row>
                        <Button variant="outline" aria-pressed={stats} onClick={() => setStats((shown) => !shown)}>
                            <Activity aria-hidden />
                            Stats
                        </Button>
                    </Row>
                    <LogView lines={log.lines} follow wrap numbered={false} className="max-h-48" />
                </Stack>
            }
        >
            <VideoPlayer
                ref={player}
                source={hlsSource('media/stream/stream.m3u8')}
                startAt={24}
                defaultControlsVisible
                title="Coastline, morning to evening"
                overlay={stats && <VideoStatsOverlay stats={reading} onClose={() => setStats(false)} />}
                onTime={log.onTime}
                onPlayingChange={log.onPlayingChange}
                onEnded={log.onEnded}
                onError={log.onError}
            />
        </Ground>
    )
}

/** A source that fails at once, for the failure as the player says it. */
const BROKEN: VideoSource = {
    id: 'broken',
    attach: (_video, report) => {
        report({ kind: 'network', message: 'The stream answered 503', fatal: true })
        return () => undefined
    },
}

/** A player whose source fails, with its tries spent at once. */
function GaveUp() {
    const log = useEventLog()
    return (
        <Ground after={<LogView lines={log.lines} wrap numbered={false} />}>
            <VideoPlayer source={BROKEN} retries={0} title="Coastline, morning to evening" onError={log.onError} />
        </Ground>
    )
}

const meta: Meta = { title: 'Media/Video' }
export default meta

/** Paused at a frame before the first play: only the play button is drawn over the picture. */
export const PausedFrame: StoryObj = {
    name: 'Paused frame',
    render: () => (
        <Ground>
            <VideoPlayer src={`${clip}#t=24`} preload="auto" />
        </Ground>
    ),
}

/** The controls drawn over the same frame, with English captions on. */
export const ControlsShown: StoryObj = {
    name: 'Controls shown',
    render: () => (
        <Ground>
            <VideoPlayer
                src={`${clip}#t=24`}
                preload="auto"
                defaultControlsVisible
                title="Coastline, morning to evening"
                tracks={ENGLISH}
            />
        </Ground>
    ),
}

/**
 * The captions menu: the tracks and Off, then the text's size, ink, background and edge, each a
 * submenu. The app's `captionDefaults` start the text at half its usual size; what the viewer
 * picks, and the track, go to the store the app hands as `captionStore` (by default `localStorage`
 * through `useStored`), read back under the player. `crossOrigin` fetches the tracks with CORS, as
 * captions served from another origin need.
 */
export const Captions: StoryObj = { render: () => <CaptionsKept /> }

/**
 * Captions are words on the picture: outlined with no box by default, or with a drop shadow, no
 * edge on a see-through box, or a solid box in another ink and size, each drawn from the
 * `--caption-*` tokens and sized against the player's width.
 */
export const CaptionStyles: StoryObj = {
    name: 'Caption styles',
    render: () => (
        <div className="min-h-svh bg-background p-4 text-foreground sm:p-8">
            <Columns count={2} min="lg">
                <Styled style={{}} label="Outline, no background (the default)" />
                <Styled style={{ edge: 'shadow' }} label="Drop shadow" />
                <Styled style={{ edge: 'none', background: 'translucent' }} label="No edge, translucent background" />
                <Styled style={{ edge: 'none', background: 'solid', color: 'yellow', size: 0.75 }} label="Solid background, yellow, 75%" />
            </Columns>
        </div>
    ),
}

/**
 * Resumed where the viewer left off: `startAt` puts it at 1:12 once the clip has its length, and the
 * log under it shows what `onTime` (once a second here), `onEnded` and `onError` tell the screen
 * around it, as an app keeps the viewer's place.
 */
export const Resume: StoryObj = { render: () => <Resumed /> }

/**
 * Driven from outside: `keys={false}` leaves every key to the app, whose own controls and keys, bound
 * with `useShortcuts` (K plays and pauses, J and L skip ten seconds, M mutes, F fills the screen),
 * drive the player through the handle on `ref`.
 */
export const OutsideControls: StoryObj = { name: 'Outside controls', render: () => <DrivenFromOutside /> }

/**
 * An HTTP live stream through `hlsSource` from the media package: played natively where the browser
 * plays HLS itself, as Safari does, and otherwise through hls.js, loaded the first time it plays. The
 * stream is the clip cut into four segments and served with the stories.
 */
export const HlsStream: StoryObj = { name: 'HLS stream', render: () => <Streamed /> }

/**
 * How it plays, over the picture: `VideoStatsOverlay` in the player's `overlay`, here with a fixed
 * reading; an app reads one each second with `useVideoStats` from the player's handle, as the HLS
 * stream's Stats button does.
 */
export const StatsOverlay: StoryObj = {
    name: 'Stats overlay',
    render: () => (
        <Ground>
            <VideoPlayer
                src={`${clip}#t=24`}
                preload="auto"
                title="Coastline, morning to evening"
                overlay={<VideoStatsOverlay stats={READING} onClose={() => undefined} />}
            />
        </Ground>
    ),
}

/**
 * The stats with the app's verdict and its own facts: `headline` says in one sentence how it plays,
 * in `tone`'s ink, and `rows` add what the app's server knows (how fast it encodes, its encoder and
 * load, the segments ready, the other streams) under the player's reading, so the app needs no
 * overlay of its own.
 */
export const StatsVerdict: StoryObj = {
    name: 'Stats verdict',
    render: () => (
        <Ground>
            <VideoPlayer
                src={`${clip}#t=24`}
                preload="auto"
                title="Coastline, morning to evening"
                overlay={
                    <VideoStatsOverlay
                        stats={THIN}
                        headline="Buffering often: the encoder runs slower than the video plays"
                        tone="warning"
                        rows={SERVER_ROWS}
                        onClose={() => undefined}
                    />
                }
            />
        </Ground>
    ),
}

/**
 * What plays next, over the whole picture as a video ends: the player's `cover` dims the picture
 * and holds `UpNext` in its middle, the controls out of reach under it, all of it kept in full
 * screen. The countdown is held here with `paused`, so the story stays still; an app lets it run
 * and plays the next one at zero.
 */
export const UpNextCover: StoryObj = {
    name: 'Up next',
    render: () => (
        <Ground>
            <VideoPlayer
                src={`${clip}#t=95.9`}
                preload="auto"
                title="Coastline, morning to evening"
                cover={
                    <UpNext
                        title="The long quay at low tide"
                        subtitle="Harbor, episode 2"
                        placeholderSeed="e2"
                        countdown={8}
                        paused
                        onPlay={() => undefined}
                        onCancel={() => undefined}
                    />
                }
            />
        </Ground>
    ),
}

/**
 * A queue played through: each episode starts eight seconds from its end, and as it ends `UpNext`
 * counts down five seconds to the next, which Play now starts at once and Cancel turns down,
 * bringing the controls back.
 */
export const AutoplayNext: StoryObj = { name: 'Autoplay next', render: () => <Queued /> }

/** Its tries spent: the player says the video could not be played, with a button to try again. */
export const Failed: StoryObj = { render: () => <GaveUp /> }
