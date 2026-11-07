import type { Meta, StoryObj } from '@storybook/react-vite'

import { MediaCard, MediaGrid } from '../../components/media/MediaCard'
import { formatTime } from '../../components/media/time'
import { MetaLine } from '../../components/MetaLine'
import { DropdownMenuItem } from '../../components/ui/dropdown-menu'
import { Artwork, type Cover } from '../fixtures/Artwork'
import { Stack } from '../../components/Layout'

/**
 * Albums and videos as a grid of covers: square for an album, wide for a film or an episode, with
 * its length on the frame and how far it was watched along its foot.
 */
const meta: Meta = { title: 'Media/Media card', parameters: { frame: 'padded' } }
export default meta

const ALBUMS: { title: string; artist: string; year: number; cover: Cover }[] = [
    { title: 'Open Water', artist: 'Grace', year: 2025, cover: { motif: 'wave', from: 'blue', to: 'teal' } },
    { title: 'Northern Coast', artist: 'Ada', year: 2024, cover: { motif: 'sun', from: 'violet', to: 'pink' } },
    { title: 'High Desert', artist: 'Linus', year: 2024, cover: { motif: 'peaks', from: 'amber', to: 'coral' } },
    { title: 'Glass Harbor', artist: 'Margaret', year: 2023, cover: { motif: 'rings', from: 'teal', to: 'jade' } },
    { title: 'Late Ferries', artist: 'Grace and Linus', year: 2023, cover: { motif: 'bands', from: 'blue', to: 'violet' } },
    {
        title: 'Salt and Static, Recorded Live at the Old Harbor Hall',
        artist: 'Ada',
        year: 2022,
        cover: { motif: 'dots', from: 'coral', to: 'amber' },
    },
]

const MENU = (
    <>
        <DropdownMenuItem>Play next</DropdownMenuItem>
        <DropdownMenuItem>Add to queue</DropdownMenuItem>
        <DropdownMenuItem>Go to artist</DropdownMenuItem>
    </>
)

export const Albums: StoryObj = {
    name: 'Albums',
    render: () => (
        <MediaGrid label="Albums">
            {ALBUMS.map((album, index) => (
                <MediaCard
                    key={album.title}
                    title={album.title}
                    subtitle={<MetaLine inline items={[album.artist, album.year]} />}
                    cover={<Artwork cover={album.cover} />}
                    href="#"
                    playing={index === 0}
                    onPlay={() => undefined}
                    menu={MENU}
                />
            ))}
        </MediaGrid>
    ),
}

const EPISODES: { title: string; length: number; watched?: number; cover: Cover }[] = [
    { title: 'The First Light', length: 96, watched: 1, cover: { motif: 'sun', from: 'amber', to: 'pink' } },
    { title: 'Fishing Villages', length: 1712, watched: 0.42, cover: { motif: 'wave', from: 'blue', to: 'jade' } },
    { title: 'The Island Ferry', length: 1498, cover: { motif: 'rings', from: 'teal', to: 'blue' } },
    { title: 'Cliffs and Caves', length: 1835, cover: { motif: 'peaks', from: 'violet', to: 'blue' } },
    { title: 'Evening Tide', length: 1650, cover: { motif: 'bands', from: 'coral', to: 'violet' } },
]

export const Videos: StoryObj = {
    name: 'Videos',
    render: () => (
        <MediaGrid shape="wide" label="Coastline, episodes">
            {EPISODES.map((episode, index) => (
                <MediaCard
                    key={episode.title}
                    shape="wide"
                    title={episode.title}
                    subtitle={<MetaLine inline items={['Coastline', `Episode ${String(index + 1)}`]} />}
                    cover={<Artwork cover={episode.cover} wide />}
                    badge={formatTime(episode.length)}
                    progress={episode.watched}
                    href="#"
                    onPlay={() => undefined}
                    playing={index === 1}
                />
            ))}
        </MediaGrid>
    ),
}

/** Videos in a row each, the cover beside a title of up to two lines, as a list of what plays next. */
export const Rows: StoryObj = {
    name: 'Rows',
    render: () => (
        <Stack className="max-w-md">
            {EPISODES.map((episode, index) => (
                <MediaCard
                    key={episode.title}
                    layout="row"
                    shape="wide"
                    title={
                        index === 1 ? 'Fishing Villages of the Northern Coast, from the First Boat Out to the Last One Home' : episode.title
                    }
                    subtitle={
                        <>
                            Coastline
                            <br />
                            <MetaLine inline items={[`Episode ${String(index + 1)}`, '2.4k views']} />
                        </>
                    }
                    cover={<Artwork cover={episode.cover} wide />}
                    badge={formatTime(episode.length)}
                    progress={episode.watched}
                    href="#"
                    menu={<DropdownMenuItem>Save</DropdownMenuItem>}
                />
            ))}
        </Stack>
    ),
}

export const Compact: StoryObj = {
    name: 'Narrow covers',
    render: () => (
        <div className="max-w-md">
            <MediaGrid min="6.5rem" label="Recently played">
                {ALBUMS.slice(0, 6).map((album) => (
                    <MediaCard
                        key={album.title}
                        title={album.title}
                        subtitle={album.artist}
                        cover={<Artwork cover={album.cover} />}
                        href="#"
                    />
                ))}
            </MediaGrid>
        </div>
    ),
}
