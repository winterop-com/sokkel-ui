import type { Meta, StoryObj } from '@storybook/react-vite'
import { ListMusic } from 'lucide-react'
import { useState } from 'react'

import { MediaBar, type RepeatMode } from '../../components/media/MediaBar'
import { formatTime } from '../../components/media/time'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/cn'

interface Track {
    title: string
    artist: string
    album: string
    duration: number
    hues: [string, string]
}

const QUEUE: Track[] = [
    { title: 'Northern Coast', artist: 'Ada', album: 'Atlas', duration: 245, hues: ['var(--kind-blue)', 'var(--kind-teal)'] },
    { title: 'Valley Road', artist: 'Ada', album: 'Atlas', duration: 198, hues: ['var(--kind-green)', 'var(--kind-jade)'] },
    { title: 'Harbor at Dusk', artist: 'Grace', album: 'Juniper', duration: 312, hues: ['var(--kind-violet)', 'var(--kind-pink)'] },
    { title: 'Mountain Pass', artist: 'Linus', album: 'Juniper', duration: 227, hues: ['var(--kind-teal)', 'var(--kind-blue)'] },
    { title: 'Desert Morning', artist: 'Margaret', album: 'Atlas', duration: 263, hues: ['var(--kind-pink)', 'var(--kind-violet)'] },
]

/** A square cover drawn as a two-color gradient with a sun. */
function Artwork({ hues, id }: { hues: [string, string]; id: string }) {
    return (
        <svg viewBox="0 0 48 48" aria-hidden>
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={hues[0]} />
                    <stop offset="1" stopColor={hues[1]} />
                </linearGradient>
            </defs>
            <rect width="48" height="48" fill={`url(#${id})`} />
            <circle cx="33" cy="16" r="7" fill="var(--background)" opacity="0.55" />
            <path d="M0 36 L14 26 L24 32 L36 22 L48 30 L48 48 L0 48 Z" fill="var(--foreground)" opacity="0.18" />
        </svg>
    )
}

/** A bar at the foot of an empty screen, wired to state so its controls answer. */
function Player({ startPlaying, queue = false, narrow = false }: { startPlaying: boolean; queue?: boolean; narrow?: boolean }) {
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
        <div className="flex min-h-svh justify-center bg-background text-foreground">
            <div className={cn('flex min-h-svh w-full flex-col', narrow && 'max-w-[390px] border-x border-border')}>
                <div className="flex flex-1 flex-col justify-end p-4">
                    {queueOpen && (
                        <section className="ml-auto w-full max-w-sm rounded-surface border border-border-strong bg-popover text-popover-foreground shadow-md">
                            <h2 className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">Up next</h2>
                            <ol className="p-1">
                                {QUEUE.map((entry, at) => (
                                    <li key={entry.title}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIndex(at)
                                                setPosition(0)
                                            }}
                                            aria-current={at === index || undefined}
                                            className="flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left hover:bg-muted aria-current:bg-accent"
                                        >
                                            <span className="size-8 shrink-0 overflow-hidden rounded-mini [&>svg]:block [&>svg]:size-full">
                                                <Artwork hues={entry.hues} id={`queue-${String(at)}`} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span
                                                    className={cn(
                                                        'block truncate text-sm',
                                                        at === index ? 'font-medium text-primary-ink' : 'text-foreground',
                                                    )}
                                                >
                                                    {entry.title}
                                                </span>
                                                <span className="block truncate text-xs text-muted-foreground">{entry.artist}</span>
                                            </span>
                                            <span className="font-mono text-xs text-muted-foreground tabular-nums">
                                                {formatTime(entry.duration)}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}
                </div>
                <MediaBar
                    title={track.title}
                    subtitle={`${track.artist} · ${track.album}`}
                    artwork={<Artwork hues={track.hues} id="now-playing" />}
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
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Queue"
                            aria-pressed={queueOpen}
                            onClick={() => {
                                setQueueOpen(!queueOpen)
                            }}
                            className={queueOpen ? 'text-primary-ink' : 'text-muted-foreground'}
                        >
                            <ListMusic aria-hidden />
                        </Button>
                    }
                />
            </div>
        </div>
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

/** The bar in a phone's width at any window size: title beside the transport, over the position. */
export const PhoneWidth: StoryObj = { name: 'Phone width', render: () => <Player startPlaying narrow /> }
