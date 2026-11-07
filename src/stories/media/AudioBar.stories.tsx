import { TransportButton } from '../../components/media/MediaControls'
import { TrackList } from '../../components/media/TrackList'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ListMusic } from 'lucide-react'
import { useState } from 'react'

import { MediaBar, type RepeatMode } from '../../components/media/MediaBar'
import { MetaLine } from '../../components/MetaLine'
import { Artwork, type Cover } from '../fixtures/Artwork'
import { Row, Stack } from '../../components/Layout'

interface Track {
    title: string
    artist: string
    album: string
    duration: number
    cover: Cover
}

const QUEUE: Track[] = [
    { title: 'Northern Coast', artist: 'Ada', album: 'Larkspur', duration: 245, cover: { motif: 'sun', from: 'blue', to: 'teal' } },
    { title: 'Valley Road', artist: 'Ada', album: 'Larkspur', duration: 198, cover: { motif: 'peaks', from: 'green', to: 'jade' } },
    { title: 'Harbor at Dusk', artist: 'Grace', album: 'Juniper', duration: 312, cover: { motif: 'wave', from: 'violet', to: 'pink' } },
    { title: 'Mountain Pass', artist: 'Linus', album: 'Juniper', duration: 227, cover: { motif: 'rings', from: 'teal', to: 'blue' } },
    {
        title: 'Desert Morning',
        artist: 'Margaret',
        album: 'Larkspur',
        duration: 263,
        cover: { motif: 'bands', from: 'pink', to: 'violet' },
    },
]

/** A bar at the foot of an empty screen, wired to state so its controls answer. */
function Player({ startPlaying, queue = false }: { startPlaying: boolean; queue?: boolean }) {
    const [index, setIndex] = useState(0)
    const [playing, setPlaying] = useState(startPlaying)
    const [position, setPosition] = useState(83)
    const [volume, setVolume] = useState(0.7)
    const [muted, setMuted] = useState(false)
    const [shuffle, setShuffle] = useState(false)
    const [repeat, setRepeat] = useState<RepeatMode>('all')
    const [queueOpen, setQueueOpen] = useState(queue)
    const track = QUEUE[index]
    const step = (by: number) => {
        setIndex((index + by + QUEUE.length) % QUEUE.length)
        setPosition(0)
    }
    return (
        <Row gap="none" align="stretch" justify="center" className="min-h-svh bg-background text-foreground">
            <Stack gap="none" className="min-h-svh w-full">
                <div className="flex flex-1 flex-col justify-end p-4">
                    {queueOpen && (
                        <section className="ml-auto w-full max-w-sm rounded-surface border border-border-strong bg-popover text-popover-foreground shadow-md">
                            <h2 className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">Up next</h2>
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
                                current={track.title}
                                playing={playing}
                                onPlay={(chosen) => {
                                    setIndex(QUEUE.findIndex((entry) => entry.title === chosen.id))
                                    setPosition(0)
                                }}
                            />
                        </section>
                    )}
                </div>
                <MediaBar
                    title={track.title}
                    subtitle={<MetaLine inline items={[track.artist, track.album]} />}
                    artwork={<Artwork cover={track.cover} />}
                    playing={playing}
                    onPlayingChange={setPlaying}
                    position={position}
                    duration={track.duration}
                    onSeek={setPosition}
                    buffered={[{ start: 0, end: Math.min(track.duration, position + 60) }]}
                    volume={volume}
                    onVolumeChange={setVolume}
                    muted={muted}
                    onMutedChange={setMuted}
                    onPrevious={() => {
                        step(-1)
                    }}
                    onNext={() => {
                        step(1)
                    }}
                    shuffle={shuffle}
                    onShuffleChange={setShuffle}
                    repeat={repeat}
                    onRepeatChange={setRepeat}
                    extra={
                        <TransportButton label="Queue" pressed={queueOpen} onClick={() => setQueueOpen(!queueOpen)}>
                            <ListMusic aria-hidden />
                        </TransportButton>
                    }
                />
            </Stack>
        </Row>
    )
}

const meta: Meta = { title: 'Media/Audio bar' }
export default meta

/** A track playing at a fixed position, with repeat on. */
export const Playing: StoryObj = { render: () => <Player startPlaying /> }

/** The same track paused. */
export const Paused: StoryObj = { render: () => <Player startPlaying={false} /> }

/** The queue opened from the bar's extra slot, with the playing track marked. */
export const WithQueue: StoryObj = { name: 'With queue', render: () => <Player startPlaying queue /> }
