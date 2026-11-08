import type { Meta, StoryObj } from '@storybook/react-vite'
import { ArrowUp, ListEnd, ListStart, X } from 'lucide-react'
import { useState } from 'react'

import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Columns, Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Artwork, type ArtworkCover } from '@winterop-com/sokkel-ui-media/Artwork'
import { MediaBar } from '@winterop-com/sokkel-ui-media/MediaBar'
import { queueOrdered } from '@winterop-com/sokkel-ui-media/queue'
import { TrackList } from '@winterop-com/sokkel-ui-media/TrackList'
import { useQueue } from '@winterop-com/sokkel-ui-media/use-queue'

interface Song {
    title: string
    artist: string
    duration: number
    cover: ArtworkCover
}

const SONGS: Song[] = [
    { title: 'Northern Coast', artist: 'Ada', duration: 245, cover: { motif: 'sun', from: 'blue', to: 'teal' } },
    { title: 'Valley Road', artist: 'Ada', duration: 198, cover: { motif: 'peaks', from: 'green', to: 'jade' } },
    { title: 'Harbor at Dusk', artist: 'Grace', duration: 312, cover: { motif: 'wave', from: 'violet', to: 'pink' } },
    { title: 'Mountain Pass', artist: 'Linus', duration: 227, cover: { motif: 'rings', from: 'teal', to: 'blue' } },
    { title: 'Desert Morning', artist: 'Margaret', duration: 263, cover: { motif: 'bands', from: 'pink', to: 'violet' } },
    { title: 'Low Tide', artist: 'Ada', duration: 192, cover: { motif: 'wave', from: 'blue', to: 'jade' } },
    { title: 'Salt Air', artist: 'Grace', duration: 189, cover: { motif: 'dots', from: 'amber', to: 'coral' } },
    { title: 'Breakwater', artist: 'Linus', duration: 214, cover: { motif: 'bands', from: 'jade', to: 'blue' } },
]

/**
 * A queue held by `useQueue` at the third song, repeating all, with the player bar's previous,
 * next, shuffle and repeat stepping through it. The queue's own list is on the left, where a press
 * plays a song and a row's actions add it to play next or last; what plays next is on the right in
 * the play order, where a row moves up or leaves.
 */
function QueuePlayer({ shuffle = false }: { shuffle?: boolean }) {
    const queue = useQueue(SONGS, { start: 2, shuffle, repeat: 'all', seed: 'harbor' })
    const [playing, setPlaying] = useState(true)
    const [position, setPosition] = useState(64)
    const [volume, setVolume] = useState(0.7)
    const song = queue.item ?? SONGS[0]
    const upNext = queueOrdered(queue.queue).slice(queue.queue.at + 1)
    const from = (index: number) => {
        queue.play(index)
        setPosition(0)
    }
    return (
        <TooltipProvider>
            <Stack gap="none" className="h-svh bg-background text-foreground">
                <Fill scroll className="p-4 sm:p-6">
                    <Columns count={2} min="lg" align="start">
                        <Stack as="section" gap="sm">
                            <GroupLabel as="h2">Queue</GroupLabel>
                            <TrackList
                                tracks={queue.queue.items.map((entry, index) => ({
                                    id: String(index),
                                    title: entry.title,
                                    subtitle: entry.artist,
                                    artwork: <Artwork cover={entry.cover} />,
                                    duration: entry.duration,
                                }))}
                                current={String(queue.index)}
                                playing={playing}
                                position={position}
                                progress="bar"
                                onPlay={(track) => from(Number(track.id))}
                                actions={(track) => {
                                    const entry = queue.queue.items[Number(track.id)]
                                    return (
                                        <>
                                            <IconButton label="Play next" onClick={() => queue.add([entry], 'next')}>
                                                <ListStart aria-hidden />
                                            </IconButton>
                                            <IconButton label="Play last" onClick={() => queue.add([entry], 'end')}>
                                                <ListEnd aria-hidden />
                                            </IconButton>
                                        </>
                                    )
                                }}
                            />
                        </Stack>
                        <Stack as="section" gap="sm">
                            <GroupLabel as="h2">Up next</GroupLabel>
                            <TrackList
                                variant="plain"
                                tracks={upNext.map((entry) => ({
                                    id: String(entry.index),
                                    title: entry.item.title,
                                    subtitle: entry.item.artist,
                                    artwork: <Artwork cover={entry.item.cover} />,
                                    duration: entry.item.duration,
                                }))}
                                onPlay={(track) => from(Number(track.id))}
                                actions={(track) => {
                                    const entry = upNext.find((one) => String(one.index) === track.id)
                                    if (entry === undefined) return null
                                    return (
                                        <>
                                            <IconButton
                                                label="Move up"
                                                disabled={entry.position === queue.queue.at + 1}
                                                onClick={() => queue.move(entry.position, entry.position - 1)}
                                            >
                                                <ArrowUp aria-hidden />
                                            </IconButton>
                                            <IconButton label="Remove" onClick={() => queue.remove(entry.index)}>
                                                <X aria-hidden />
                                            </IconButton>
                                        </>
                                    )
                                }}
                            />
                        </Stack>
                    </Columns>
                </Fill>
                <MediaBar
                    title={song.title}
                    artist={song.artist}
                    trackNumber={queue.index + 1}
                    trackCount={queue.queue.items.length}
                    artwork={<Artwork cover={song.cover} />}
                    playing={playing}
                    onPlayingChange={setPlaying}
                    position={position}
                    duration={song.duration}
                    onSeek={setPosition}
                    volume={volume}
                    onVolumeChange={setVolume}
                    onPrevious={() => {
                        queue.previous(position)
                        setPosition(0)
                    }}
                    onNext={
                        queue.hasNext
                            ? () => {
                                  queue.next()
                                  setPosition(0)
                              }
                            : undefined
                    }
                    shuffle={queue.shuffle}
                    onShuffleChange={(on) => queue.setShuffle(on)}
                    repeat={queue.repeat}
                    onRepeatChange={queue.setRepeat}
                />
            </Stack>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Media/Queue' }
export default meta

/** The queue in its own order, the third song playing 1:04 in with a line along its row's foot. */
export const InOrder: StoryObj = { name: 'In order', render: () => <QueuePlayer /> }

/**
 * The same queue shuffled from the seed `harbor`: the list keeps its order, and the play order on
 * the right leads on from the song playing. Turning shuffle off carries on from that song's place
 * in the list.
 */
export const Shuffled: StoryObj = { render: () => <QueuePlayer shuffle /> }
