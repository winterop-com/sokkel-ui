import { TransportButton } from '@winterop-com/sokkel-ui/media/MediaControls'
import { TrackList } from '@winterop-com/sokkel-ui-media/TrackList'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ListMusic } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { useMediaSession } from '@winterop-com/sokkel-ui-media/use-media-session'
import { MediaBar, type MediaBarLayout, type RepeatMode } from '@winterop-com/sokkel-ui-media/MediaBar'
import { chapterIndex } from '@winterop-com/sokkel-ui-media/chapters'
import { SoundVisualizer } from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import { Artwork, type ArtworkCover } from '@winterop-com/sokkel-ui-media/Artwork'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { FRAME } from './fixtures/sound'
import { waveformOf } from './fixtures/waveform'

interface Track {
    title: string
    artist: string
    album: string
    year: number
    duration: number
    cover: ArtworkCover
}

const QUEUE: Track[] = [
    {
        title: 'Northern Coast',
        artist: 'Ada',
        album: 'Larkspur',
        year: 2024,
        duration: 245,
        cover: { motif: 'sun', from: 'blue', to: 'teal' },
    },
    {
        title: 'Valley Road',
        artist: 'Ada',
        album: 'Larkspur',
        year: 2024,
        duration: 198,
        cover: { motif: 'peaks', from: 'green', to: 'jade' },
    },
    {
        title: 'Harbor at Dusk',
        artist: 'Grace',
        album: 'Juniper',
        year: 2023,
        duration: 312,
        cover: { motif: 'wave', from: 'violet', to: 'pink' },
    },
    {
        title: 'Mountain Pass',
        artist: 'Linus',
        album: 'Juniper',
        year: 2023,
        duration: 227,
        cover: { motif: 'rings', from: 'teal', to: 'blue' },
    },
    {
        title: 'Desert Morning',
        artist: 'Margaret',
        album: 'Larkspur',
        year: 2024,
        duration: 263,
        cover: { motif: 'bands', from: 'pink', to: 'violet' },
    },
]

/** The heights every layout is shown at, in pixels: the one line, then the layout's growth. */
const HEIGHTS = [64, 110, 150, 200, 300] as const

interface BarOptions {
    startPlaying?: boolean
    layout?: MediaBarLayout
    /** The height the bar starts at, in pixels. */
    size?: number
    /** Whether the faint visualizer rises behind the words once the bar grows. */
    visualizer?: boolean
    fullscreen?: boolean
}

/** Which track of the queue plays and how far in, held where the queue can change it too. */
function useTrack() {
    const [index, setIndex] = useState(0)
    const [position, setPosition] = useState(83)
    return { index, setIndex, position, setPosition }
}

/** A bar wired to state so its controls answer, playing the first track of the queue 1:23 in. */
function Bar({
    startPlaying = true,
    layout,
    size,
    visualizer = false,
    fullscreen = false,
    queueOpen = false,
    onQueue,
    playback,
}: BarOptions & { queueOpen?: boolean; onQueue?: () => void; playback?: ReturnType<typeof useTrack> }) {
    const own = useTrack()
    const { index, setIndex, position, setPosition } = playback ?? own
    const [playing, setPlaying] = useState(startPlaying)
    const [volume, setVolume] = useState(0.7)
    const [muted, setMuted] = useState(false)
    const [shuffle, setShuffle] = useState(false)
    const [repeat, setRepeat] = useState<RepeatMode>('all')
    const track = QUEUE[index]
    const waveform = useMemo(() => waveformOf(index + 1), [index])
    const step = (by: number) => {
        setIndex((index + by + QUEUE.length) % QUEUE.length)
        setPosition(0)
    }
    return (
        <MediaBar
            layout={layout}
            title={track.title}
            artist={track.artist}
            album={track.album}
            year={track.year}
            trackNumber={index + 1}
            trackCount={QUEUE.length}
            artwork={<Artwork cover={track.cover} />}
            playing={playing}
            onPlayingChange={setPlaying}
            position={position}
            duration={track.duration}
            onSeek={setPosition}
            buffered={[{ start: 0, end: Math.min(track.duration, position + 60) }]}
            waveform={waveform}
            visualizer={visualizer ? <SoundVisualizer frame={FRAME} label="What is playing" /> : undefined}
            volume={volume}
            onVolumeChange={setVolume}
            muted={muted}
            onMutedChange={setMuted}
            onPrevious={() => step(-1)}
            onNext={() => step(1)}
            shuffle={shuffle}
            onShuffleChange={setShuffle}
            repeat={repeat}
            onRepeatChange={setRepeat}
            defaultSize={size}
            defaultFullscreen={fullscreen}
            extra={
                <TransportButton label="Queue" pressed={queueOpen} onClick={onQueue}>
                    <ListMusic aria-hidden />
                </TransportButton>
            }
        />
    )
}

/** A bar at the foot of an empty screen, with the queue it opens over the screen. */
function Player({ queue = false, ...options }: BarOptions & { queue?: boolean }) {
    const [queueOpen, setQueueOpen] = useState(queue)
    const playback = useTrack()
    return (
        <Row gap="none" align="stretch" justify="center" className="min-h-svh bg-background text-foreground">
            <Stack gap="none" className="min-h-svh w-full">
                <Stack gap="none" justify="end" className="flex-1 p-4">
                    {queueOpen && (
                        <section className="ml-auto w-full max-w-sm rounded-surface border border-border-strong bg-popover text-popover-foreground shadow-md">
                            <PaneHeader title="Up next" />
                            <TrackList
                                variant="plain"
                                className="p-1"
                                tracks={QUEUE.map((entry) => ({
                                    id: entry.title,
                                    title: entry.title,
                                    subtitle: entry.artist,
                                    artwork: <Artwork cover={entry.cover} />,
                                    duration: entry.duration,
                                }))}
                                current={QUEUE[playback.index].title}
                                playing
                                onPlay={(chosen) => {
                                    playback.setIndex(QUEUE.findIndex((entry) => entry.title === chosen.id))
                                    playback.setPosition(0)
                                }}
                            />
                        </section>
                    )}
                </Stack>
                <Bar {...options} playback={playback} queueOpen={queueOpen} onQueue={() => setQueueOpen(!queueOpen)} />
            </Stack>
        </Row>
    )
}

/** A book read aloud: its chapters, where each starts in seconds, and its length. */
const BOOK = {
    title: 'Tidewater Almanac',
    author: 'Grace',
    duration: 6 * 3600 + 12 * 60,
    cover: { motif: 'bands', from: 'teal', to: 'jade' } satisfies ArtworkCover,
    chapters: [
        { title: 'Low Water', start: 0 },
        { title: 'The Harbor Wall', start: 2_140 },
        { title: 'Juniper Point', start: 4_310 },
        { title: 'Larkspur Fields', start: 7_020 },
        { title: 'Northern Coast', start: 9_480 },
        { title: 'The Long Bay', start: 12_600 },
        { title: 'Spring Tide', start: 15_900 },
        { title: 'High Water', start: 19_200 },
    ],
}
const BOOK_STARTS = BOOK.chapters.map((chapter) => chapter.start)

/** A bar at the foot of an empty screen. */
function Foot({ children }: { children: ReactNode }) {
    return (
        <Stack gap="none" justify="end" className="min-h-svh bg-background text-foreground">
            {children}
        </Stack>
    )
}

/** The book playing 12:34 into its third chapter at 1.25x, told to the system as the chapter of the book. */
function Book() {
    const [playing, setPlaying] = useState(true)
    const [position, setPosition] = useState(4_310 + 754)
    const [rate, setRate] = useState(1.25)
    const [volume, setVolume] = useState(0.8)
    const [muted, setMuted] = useState(false)
    const chapter = BOOK.chapters[Math.max(0, chapterIndex(BOOK_STARTS, position))]
    const seek = (seconds: number) => setPosition(Math.min(BOOK.duration, Math.max(0, seconds)))
    useMediaSession({
        title: chapter.title,
        artist: BOOK.author,
        album: BOOK.title,
        duration: BOOK.duration,
        position,
        rate,
        playing,
        handlers: {
            play: () => setPlaying(true),
            pause: () => setPlaying(false),
            seekbackward: (seconds) => seek(position - seconds),
            seekforward: (seconds) => seek(position + seconds),
            seekto: seek,
        },
    })
    return (
        <Foot>
            <MediaBar
                title={chapter.title}
                artist={BOOK.author}
                album={BOOK.title}
                artwork={<Artwork cover={BOOK.cover} />}
                playing={playing}
                onPlayingChange={setPlaying}
                position={position}
                duration={BOOK.duration}
                onSeek={seek}
                chapters={BOOK_STARTS}
                timeline="chapter"
                skip={15}
                rate={rate}
                onRateChange={setRate}
                volume={volume}
                onVolumeChange={setVolume}
                muted={muted}
                onMutedChange={setMuted}
            />
        </Foot>
    )
}

/** A station on the air: what it says it plays, under its name. */
function Radio() {
    const [playing, setPlaying] = useState(true)
    const [volume, setVolume] = useState(0.7)
    const [muted, setMuted] = useState(false)
    useMediaSession({
        title: 'Morning on the coast',
        artist: 'Harbor Radio',
        playing,
        handlers: { play: () => setPlaying(true), pause: () => setPlaying(false), stop: () => setPlaying(false) },
    })
    return (
        <Foot>
            <MediaBar
                live
                title="Morning on the coast"
                artist="Harbor Radio"
                artwork={<Artwork cover={{ motif: 'rings', from: 'violet', to: 'blue' }} />}
                playing={playing}
                onPlayingChange={setPlaying}
                position={0}
                duration={0}
                onSeek={() => undefined}
                volume={volume}
                onVolumeChange={setVolume}
                muted={muted}
                onMutedChange={setMuted}
            />
        </Foot>
    )
}

/** One layout at each height, from the one line up, each bar labeled with the height it starts at. */
function Ladder({ layout }: { layout: MediaBarLayout }) {
    return (
        <Stack gap="xl" className="min-h-svh bg-background py-6 text-foreground">
            {HEIGHTS.map((height) => (
                <Stack key={height} as="section" gap="sm">
                    <GroupLabel as="h2" className="px-4">
                        {height} px
                    </GroupLabel>
                    <Bar layout={layout} size={height} visualizer />
                </Stack>
            ))}
        </Stack>
    )
}

const meta: Meta = { title: 'Media/Audio bar' }
export default meta

/** A track playing at a fixed position, with repeat on, in the one-line bar; its top edge drags it taller. */
export const Playing: StoryObj = { render: () => <Player /> }

/** The same track paused. */
export const Paused: StoryObj = { render: () => <Player startPlaying={false} /> }

/** The queue opened from the bar's extra slot, with the playing track marked. */
export const WithQueue: StoryObj = { name: 'With queue', render: () => <Player queue /> }

/**
 * A radio station with `live`: a Live mark where the position would be, no length, nothing to
 * seek or skip, and previous and next drawn disabled, as the app gives no handler. It tells the
 * system what plays through `useMediaSession`, with play, pause and stop.
 */
export const LiveRadio: StoryObj = { name: 'Live radio', render: () => <Radio /> }

/**
 * A book read aloud: `chapters` make previous and next step by chapter and say so, seeking to the
 * chapter starts; `timeline="chapter"` measures the time within the chapter playing; `skip` adds
 * the 15 second jumps around them, the interval on their glyphs; `onRateChange` the speed menu,
 * at 1.25x. Dragged taller, the line over the title counts the chapter. `useMediaSession` tells the
 * system the chapter, the book and the position at its speed, and answers its play, pause and
 * seek controls.
 */
export const Audiobook: StoryObj = { render: () => <Book /> }

/**
 * The default layout, `rows`, at each height. Up to 96 pixels it is the one line; from there the
 * cover spans two rows, what plays, the transport and the volume in the top one over a waveform
 * as wide as the rest of the bar, which grows from 18 to 96 pixels. The visualizer rises faintly
 * behind the top row from 96 pixels, standing on the waveform.
 */
export const Rows: StoryObj = { render: () => <Ladder layout="rows" /> }

/**
 * `panel` at each height. From 104 pixels it is the large now-playing panel, the cover flush and
 * as tall as the bar, the words and the waveform over the transport, everything scaling with the
 * height; the visualizer rises behind the words.
 */
export const Panel: StoryObj = { render: () => <Ladder layout="panel" /> }

/**
 * `stage` at each height. From 96 pixels a stage centered on the bar holds the words over a wide
 * waveform with the transport under it, between the cover and the volume; the visualizer rises
 * behind the stage.
 */
export const Stage: StoryObj = { render: () => <Ladder layout="stage" /> }

/**
 * The fullscreen view of `rows`, as the bar's corner button opens it: the head and the waveform
 * pulled apart with the visualizer between them, its kind picked in the corner. Drawn open over
 * the window here; the button asks the browser for its fullscreen.
 */
export const RowsFullscreen: StoryObj = {
    name: 'Rows fullscreen',
    render: () => <Player layout="rows" size={200} visualizer fullscreen />,
}

/** The fullscreen view of `panel`: the liner large at the lower left over the visualizer, the transport along the foot. */
export const PanelFullscreen: StoryObj = {
    name: 'Panel fullscreen',
    render: () => <Player layout="panel" size={200} visualizer fullscreen />,
}

/** The fullscreen view of `stage`: the cover inside the visualizer on the middle line, everything centered under it. */
export const StageFullscreen: StoryObj = {
    name: 'Stage fullscreen',
    render: () => <Player layout="stage" size={200} visualizer fullscreen />,
}
