import type { Meta, StoryObj } from '@storybook/react-vite'
import { Heart } from 'lucide-react'
import type { ReactNode } from 'react'

import { TrackList, type Track } from '../../components/media/TrackList'
import { Button } from '../../components/ui/button'
import { Artwork, type Cover } from '../fixtures/Artwork'

const COVER: Cover = { motif: 'wave', from: 'blue', to: 'teal' }

const ALBUM: Track[] = [
    { id: '1', number: 1, title: 'Leaving the Sound', duration: 214 },
    { id: '2', number: 2, title: 'Low Tide', duration: 247 },
    { id: '3', number: 3, title: 'Breakwater', subtitle: 'Grace and Linus', duration: 198 },
    { id: '4', number: 4, title: 'Harbor at Dusk', duration: 312 },
    { id: '5', number: 5, title: 'Salt Air', duration: 189 },
]

const MIXED: Track[] = [
    { id: 'a', title: 'Harbor at Dusk', subtitle: 'Grace', meta: 'Open Water', duration: 312, cover: COVER },
    {
        id: 'b',
        title: 'Dry Heat',
        subtitle: 'Linus',
        meta: 'High Desert',
        duration: 224,
        cover: { motif: 'peaks', from: 'amber', to: 'coral' },
    },
    {
        id: 'c',
        title: 'Still Pond',
        subtitle: 'Margaret',
        meta: 'Slow Current',
        duration: 301,
        cover: { motif: 'bands', from: 'jade', to: 'blue' },
    },
    {
        id: 'd',
        title: 'Flat Country',
        subtitle: 'Ada',
        meta: 'Lowlands',
        duration: 256,
        cover: { motif: 'bands', from: 'green', to: 'jade' },
    },
].map(({ cover, ...track }) => ({ ...track, artwork: <Artwork cover={cover as Cover} /> }))

const EPISODES: Track[] = [
    { title: 'The First Light', cover: { motif: 'sun', from: 'amber', to: 'pink' }, duration: 96 },
    { title: 'Fishing Villages', cover: { motif: 'wave', from: 'blue', to: 'jade' }, duration: 1712 },
    { title: 'The Island Ferry', cover: { motif: 'rings', from: 'teal', to: 'blue' }, duration: 1498 },
].map((episode, index) => ({
    id: `e${String(index + 1)}`,
    title: episode.title,
    subtitle: `Episode ${String(index + 1)}`,
    artwork: <Artwork cover={episode.cover as Cover} wide />,
    duration: episode.duration,
}))

function Ground({ children, width = 'max-w-2xl' }: { children: ReactNode; width?: string }) {
    return (
        <div className="min-h-svh bg-background p-4 text-foreground sm:p-8">
            <div className={`mx-auto ${width}`}>{children}</div>
        </div>
    )
}

const meta: Meta = { title: 'Media/Track list' }
export default meta

/** An album's tracks by number, the fourth playing: a speaker for its number and the title in the accent. */
export const Numbered: StoryObj = {
    render: () => (
        <Ground>
            <TrackList tracks={ALBUM} current="4" playing onPlay={() => undefined} />
        </Ground>
    ),
}

/** The same list paused, the playing mark a play glyph. */
export const Paused: StoryObj = {
    render: () => (
        <Ground>
            <TrackList tracks={ALBUM} current="4" onPlay={() => undefined} />
        </Ground>
    ),
}

/** Tracks from several albums with covers, the album as the meta column and a favorite button on each row. */
export const WithArtwork: StoryObj = {
    name: 'With artwork',
    render: () => (
        <Ground>
            <TrackList
                tracks={MIXED}
                current="a"
                playing
                onPlay={() => undefined}
                actions={(track) => (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Add ${String(track.title)} to favorites`}
                        className="text-muted-foreground"
                    >
                        <Heart aria-hidden />
                    </Button>
                )}
            />
        </Ground>
    ),
}

/** Episodes with wide frames on the page's own ground, as a column beside a video. */
export const Episodes: StoryObj = {
    render: () => (
        <Ground width="max-w-sm">
            <TrackList tracks={EPISODES} current="e1" variant="plain" artwork="wide" onPlay={() => undefined} />
        </Ground>
    ),
}
