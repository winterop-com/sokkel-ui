import type { Meta, StoryObj } from '@storybook/react-vite'
import { X } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { StarButton } from '@winterop-com/sokkel-ui/StarButton'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Artwork, type ArtworkCover } from '@winterop-com/sokkel-ui-media/Artwork'
import { ReorderableTrackList, type Track } from '@winterop-com/sokkel-ui-media/ReorderableTrackList'

interface Song {
    id: string
    title: string
    artist: string
    album: string
    duration: number
    cover: ArtworkCover
}

const SONGS: Song[] = [
    {
        id: 'a',
        title: 'Harbor at Dusk',
        artist: 'Grace',
        album: 'Open Water',
        duration: 312,
        cover: { motif: 'wave', from: 'blue', to: 'teal' },
    },
    {
        id: 'b',
        title: 'Dry Heat',
        artist: 'Linus',
        album: 'High Desert',
        duration: 224,
        cover: { motif: 'peaks', from: 'amber', to: 'coral' },
    },
    {
        id: 'c',
        title: 'Still Pond',
        artist: 'Margaret',
        album: 'Slow Current',
        duration: 301,
        cover: { motif: 'bands', from: 'jade', to: 'blue' },
    },
    {
        id: 'd',
        title: 'Flat Country',
        artist: 'Ada',
        album: 'Lowlands',
        duration: 256,
        cover: { motif: 'bands', from: 'green', to: 'jade' },
    },
    {
        id: 'e',
        title: 'Sea Glass',
        artist: 'Eelgrass',
        album: 'Sea Glass',
        duration: 198,
        cover: { motif: 'dots', from: 'jade', to: 'teal' },
    },
    {
        id: 'f',
        title: 'Pilot Light',
        artist: 'The Tidelines',
        album: 'Pilot Light',
        duration: 241,
        cover: { motif: 'sun', from: 'pink', to: 'coral' },
    },
    {
        id: 'g',
        title: 'Lantern Rock',
        artist: 'Northwater Choir',
        album: 'Lantern Rock',
        duration: 287,
        cover: { motif: 'peaks', from: 'coral', to: 'amber' },
    },
]

const asTrack = (song: Song): Track => ({
    id: song.id,
    title: song.title,
    subtitle: song.artist,
    meta: song.album,
    artwork: <Artwork cover={song.cover} />,
    duration: song.duration,
})

/** The songs in an order of the listener's own, a move putting one where it was dropped. */
function useOrder(from: readonly Song[]) {
    const [songs, setSongs] = useState(from)
    const move = (at: number, to: number) =>
        setSongs((now) => {
            const next = [...now]
            const [moved] = next.splice(at, 1)
            next.splice(to, 0, moved)
            return next
        })
    const remove = (id: string) => setSongs((now) => now.filter((song) => song.id !== id))
    return { songs, move, remove }
}

function Ground({ children, width = '' }: { children: ReactNode; width?: string }) {
    return (
        <div className="min-h-svh bg-background p-4 text-foreground sm:p-8">
            <div className={`mx-auto ${width}`}>{children}</div>
        </div>
    )
}

const meta: Meta = {
    title: 'Media/Reorderable track list',
    decorators: [
        (Story) => (
            <TooltipProvider>
                <Story />
            </TooltipProvider>
        ),
    ],
}
export default meta

/**
 * A playlist the listener orders: a row's grip drags it, the rest moving aside to show where it
 * lands, and Escape puts it back; with the grip focused the arrows move it a place. The star and
 * remove come before the grip, and the second song is playing.
 */
export const Playlist: StoryObj = {
    render: function Render() {
        const { songs, move, remove } = useOrder(SONGS)
        const [stars, setStars] = useState<ReadonlySet<string>>(() => new Set(['c']))
        return (
            <Ground>
                <ReorderableTrackList
                    tracks={songs.map(asTrack)}
                    current="b"
                    playing
                    onPlay={() => undefined}
                    onMove={move}
                    actions={(track) => (
                        <>
                            <StarButton
                                starred={stars.has(track.id)}
                                onStarredChange={(on) =>
                                    setStars((now) =>
                                        on ? new Set([...now, track.id]) : new Set([...now].filter((id) => id !== track.id)),
                                    )
                                }
                            />
                            <IconButton label="Remove from the playlist" onClick={() => remove(track.id)}>
                                <X aria-hidden />
                            </IconButton>
                        </>
                    )}
                />
            </Ground>
        )
    },
}

/**
 * What plays next in a narrow column on the page's own ground, as a queue's side panel holds it,
 * thirty songs long so a row held at the column's edge scrolls it.
 */
export const UpNext: StoryObj = {
    name: 'Up next',
    render: function Render() {
        const { songs, move, remove } = useOrder(
            Array.from({ length: 30 }, (_, index) => {
                const song = SONGS[index % SONGS.length]
                return { ...song, id: `${song.id}${String(index)}` }
            }),
        )
        return (
            <Stack gap="none" className="h-svh bg-background text-foreground">
                <Fill scroll className="mx-auto w-full max-w-sm p-2">
                    <ReorderableTrackList
                        tracks={songs.map(asTrack)}
                        variant="plain"
                        onPlay={() => undefined}
                        onMove={move}
                        actions={(track) => (
                            <IconButton label="Remove from the queue" onClick={() => remove(track.id)}>
                                <X aria-hidden />
                            </IconButton>
                        )}
                    />
                </Fill>
            </Stack>
        )
    },
}
