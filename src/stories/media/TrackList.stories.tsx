import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ListEnd } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { MediaBar } from '@winterop-com/sokkel-ui-media/MediaBar'
import { TrackList, type Track } from '@winterop-com/sokkel-ui-media/TrackList'
import { StarButton } from '@winterop-com/sokkel-ui/StarButton'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Artwork, type ArtworkCover } from '@winterop-com/sokkel-ui-media/Artwork'

const COVER: ArtworkCover = { motif: 'wave', from: 'blue', to: 'teal' }

const ALBUM: Track[] = [
    { id: '1', number: 1, title: 'Leaving the Sound', duration: 214 },
    { id: '2', number: 2, title: 'Low Tide', duration: 247 },
    { id: '3', number: 3, title: 'Breakwater', subtitle: 'Grace and Linus', duration: 198 },
    { id: '4', number: 4, title: 'Harbor at Dusk', duration: 312 },
    { id: '5', number: 5, title: 'Salt Air', duration: 189 },
]

/** An album over two discs, each numbered from one. */
const SET: Track[] = [
    { id: 's1', disc: 1, number: 1, title: 'Low Water', duration: 214 },
    { id: 's2', disc: 1, number: 2, title: 'The Harbor Wall', duration: 247 },
    { id: 's3', disc: 1, number: 3, title: 'Juniper Point', duration: 198 },
    { id: 's4', disc: 1, number: 4, title: 'Larkspur Fields', duration: 263 },
    { id: 's5', disc: 2, number: 1, title: 'Spring Tide', duration: 189 },
    { id: 's6', disc: 2, number: 2, title: 'The Long Bay', duration: 312 },
    { id: 's7', disc: 2, number: 3, title: 'High Water', duration: 236 },
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
].map(({ cover, ...track }) => ({ ...track, artwork: <Artwork cover={cover as ArtworkCover} /> }))

const EPISODES: Track[] = [
    { title: 'The First Light', cover: { motif: 'sun', from: 'amber', to: 'pink' }, duration: 96 },
    { title: 'Fishing Villages', cover: { motif: 'wave', from: 'blue', to: 'jade' }, duration: 1712 },
    { title: 'The Island Ferry', cover: { motif: 'rings', from: 'teal', to: 'blue' }, duration: 1498 },
].map((episode, index) => ({
    id: `e${String(index + 1)}`,
    title: episode.title,
    subtitle: `Episode ${String(index + 1)}`,
    artwork: <Artwork cover={episode.cover as ArtworkCover} wide />,
    duration: episode.duration,
}))

const WORDS = ['Harbor', 'Tide', 'Coast', 'Valley', 'Morning', 'Ridge', 'Island', 'Ferry', 'Lantern', 'Current', 'Shore', 'Field']

/** A long playlist of sixty songs, each title and length drawn from its place. */
const PLAYLIST: Track[] = Array.from({ length: 60 }, (_, index) => ({
    id: `p${String(index + 1)}`,
    number: index + 1,
    title: `${WORDS[index % WORDS.length]} ${WORDS[(index * 5 + 3) % WORDS.length].toLowerCase()}`,
    subtitle: ['Ada', 'Grace', 'Linus', 'Margaret'][index % 4],
    duration: 150 + ((index * 47) % 180),
}))

function Ground({ children, width = '' }: { children: ReactNode; width?: string }) {
    return (
        <div className="min-h-svh bg-background p-4 text-foreground sm:p-8">
            <div className={`mx-auto ${width}`}>{children}</div>
        </div>
    )
}

const meta: Meta = {
    title: 'Media/Track list',
    decorators: [
        (Story) => (
            <TooltipProvider>
                <Story />
            </TooltipProvider>
        ),
    ],
}
export default meta

/** Which rows are starred, held so a press on a star takes. */
function useStars(from: readonly string[]) {
    const [stars, setStars] = useState<ReadonlySet<string>>(() => new Set(from))
    const star = (id: string, starred: boolean) =>
        setStars((now) => {
            const next = new Set(now)
            if (starred) next.add(id)
            else next.delete(id)
            return next
        })
    return [stars, star] as const
}

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

/** The playing row 1:23 in, its length giving way to the time still to play. */
export const TimeLeft: StoryObj = {
    name: 'Time left',
    render: () => (
        <Ground>
            <TrackList tracks={ALBUM} current="4" playing position={83} progress="left" onPlay={() => undefined} />
        </Ground>
    ),
}

/** The playing row 1:23 in, a line along its foot as long as it has played. */
export const Progress: StoryObj = {
    render: () => (
        <Ground>
            <TrackList tracks={ALBUM} current="4" playing position={83} progress="bar" onPlay={() => undefined} />
        </Ground>
    ),
}

/**
 * An album over two discs, each track given its `disc`: a head over the first track of each, the
 * numbers starting over on the second, its second track playing.
 */
export const Discs: StoryObj = {
    render: () => (
        <Ground>
            <TrackList tracks={SET} current="s6" playing onPlay={() => undefined} />
        </Ground>
    ),
}

/**
 * An album's tracks with each row's actions at its end, always in view: add the track to the
 * queue, and its favorite star, filled on the starred ones.
 */
export const Actions: StoryObj = {
    render: function Render() {
        const [stars, star] = useStars(['2', '4'])
        return (
            <Ground>
                <TrackList
                    tracks={ALBUM}
                    current="4"
                    playing
                    onPlay={() => undefined}
                    actions={(track) => (
                        <>
                            <IconButton label="Add to queue">
                                <ListEnd aria-hidden />
                            </IconButton>
                            <StarButton starred={stars.has(track.id)} onStarredChange={(starred) => star(track.id, starred)} />
                        </>
                    )}
                />
            </Ground>
        )
    },
}

/** Tracks from several albums with covers, the album as the meta column and a favorite star on each row. */
export const WithArtwork: StoryObj = {
    name: 'With artwork',
    render: function Render() {
        const [stars, star] = useStars(['a', 'c'])
        return (
            <Ground>
                <TrackList
                    tracks={MIXED}
                    current="a"
                    playing
                    onPlay={() => undefined}
                    actions={(track) => <StarButton starred={stars.has(track.id)} onStarredChange={(starred) => star(track.id, starred)} />}
                />
            </Ground>
        )
    },
}

/** Episodes with wide frames on the page's own ground, as a column beside a video. */
export const Episodes: StoryObj = {
    render: () => (
        <Ground width="max-w-sm">
            <TrackList tracks={EPISODES} current="e1" variant="plain" artwork="wide" onPlay={() => undefined} />
        </Ground>
    ),
}

/**
 * A playlist of sixty songs in a pane that scrolls, the forty-first playing: brought to the middle
 * on the first draw, and kept in view as next and previous in the bar move the playing row, but
 * only when it is out of view, and never while the list is being scrolled or just after.
 */
export const LongList: StoryObj = {
    name: 'Long list',
    render: function Render() {
        const [index, setIndex] = useState(40)
        const [position, setPosition] = useState(83)
        const [playing, setPlaying] = useState(true)
        const [volume, setVolume] = useState(0.7)
        const track = PLAYLIST[index]
        const go = (to: number) => {
            setIndex(Math.min(PLAYLIST.length - 1, Math.max(0, to)))
            setPosition(0)
        }
        return (
            <Stack gap="none" className="h-svh bg-background text-foreground">
                <Fill scroll className="p-4 sm:p-6">
                    <TrackList
                        tracks={PLAYLIST}
                        current={track.id}
                        playing={playing}
                        position={position}
                        progress="left"
                        onPlay={(chosen) => go(PLAYLIST.indexOf(chosen))}
                    />
                </Fill>
                <MediaBar
                    title={track.title}
                    artist={track.subtitle}
                    trackNumber={index + 1}
                    trackCount={PLAYLIST.length}
                    placeholderSeed={track.id}
                    playing={playing}
                    onPlayingChange={setPlaying}
                    position={position}
                    duration={track.duration}
                    onSeek={setPosition}
                    volume={volume}
                    onVolumeChange={setVolume}
                    onPrevious={index > 0 ? () => go(index - 1) : undefined}
                    onNext={index < PLAYLIST.length - 1 ? () => go(index + 1) : undefined}
                />
            </Stack>
        )
    },
}
