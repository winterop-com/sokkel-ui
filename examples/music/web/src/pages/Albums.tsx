import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { Disc3, Shuffle } from 'lucide-react'
import { useState } from 'react'

import { ALBUMS, artistName, SONGS } from '../catalog'
import { setSettings, useSettings, type Settings } from '../data'
import { AlbumCard, Nothing } from '../parts/songs'
import { playSongs } from '../player'

const ORDERS: { value: Settings['albumOrder']; label: string }[] = [
    { value: 'recent', label: 'Recent' },
    { value: 'title', label: 'Title' },
    { value: 'artist', label: 'Artist' },
    { value: 'year', label: 'Year' },
]

/** Every album as covers, filtered by what is typed and in the order chosen, kept between visits. */
export function Albums() {
    const { albumOrder } = useSettings()
    const [query, setQuery] = useState('')
    const words = query.trim().toLowerCase()
    const shown = ALBUMS.filter((album) => words === '' || `${album.title} ${artistName(album.artist)}`.toLowerCase().includes(words)).sort(
        (one, other) => {
            if (albumOrder === 'title') return one.title.localeCompare(other.title)
            if (albumOrder === 'artist') return artistName(one.artist).localeCompare(artistName(other.artist)) || other.year - one.year
            if (albumOrder === 'year') return one.year - other.year || one.title.localeCompare(other.title)
            return other.year - one.year || one.title.localeCompare(other.title)
        },
    )
    return (
        <>
            <PageHeader title="Albums" count={`${String(ALBUMS.length)} albums`} />
            <Toolbar
                search={<SearchField value={query} onChange={setQuery} placeholder="Filter" />}
                end={
                    <>
                        <Segmented
                            label="Order"
                            value={albumOrder}
                            onValueChange={(value) => setSettings({ albumOrder: value })}
                            options={ORDERS}
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                                playSongs(
                                    SONGS.map((song) => song.id),
                                    0,
                                    { kind: 'tracks', label: 'Every song', href: '/tracks' },
                                    { shuffle: true },
                                )
                            }
                        >
                            <Shuffle aria-hidden />
                            Shuffle all
                        </Button>
                    </>
                }
            />
            {shown.length === 0 ? (
                <Nothing icon={Disc3} title="No album matches" action={{ label: 'Clear the filter', onClick: () => setQuery('') }}>
                    Nothing in the library is called “{query}”.
                </Nothing>
            ) : (
                <MediaGrid label="Albums">
                    {shown.map((album) => (
                        <AlbumCard key={album.id} album={album} />
                    ))}
                </MediaGrid>
            )}
        </>
    )
}
