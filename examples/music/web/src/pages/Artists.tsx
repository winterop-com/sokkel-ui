import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { MicVocal } from 'lucide-react'
import { useState } from 'react'

import { ALBUMS, ARTISTS } from '../catalog'
import { ArtistCard, Nothing } from '../parts/songs'

const albumsBy = (artist: string) => ALBUMS.filter((album) => album.artist === artist).length

/** Every artist, by name or by how many albums they made, filtered by what is typed. */
export function Artists() {
    const [query, setQuery] = useState('')
    const [order, setOrder] = useState<'name' | 'albums'>('name')
    const words = query.trim().toLowerCase()
    const shown = ARTISTS.filter((artist) => words === '' || artist.name.toLowerCase().includes(words)).sort((one, other) =>
        order === 'albums'
            ? albumsBy(other.id) - albumsBy(one.id) || one.name.localeCompare(other.name)
            : one.name.localeCompare(other.name),
    )
    return (
        <>
            <PageHeader title="Artists" count={`${String(ARTISTS.length)} artists, ${String(ALBUMS.length)} albums`} />
            <Toolbar
                search={<SearchField value={query} onChange={setQuery} placeholder="Filter" />}
                end={
                    <Segmented
                        label="Order"
                        value={order}
                        onValueChange={setOrder}
                        options={[
                            { value: 'name', label: 'Name' },
                            { value: 'albums', label: 'Most albums' },
                        ]}
                    />
                }
            />
            {shown.length === 0 ? (
                <Nothing icon={MicVocal} title="No artist matches" action={{ label: 'Clear the filter', onClick: () => setQuery('') }}>
                    No artist in the library is called “{query}”.
                </Nothing>
            ) : (
                <MediaGrid label="Artists">
                    {shown.map((artist) => (
                        <ArtistCard key={artist.id} artist={artist} albums={albumsBy(artist.id)} />
                    ))}
                </MediaGrid>
            )}
        </>
    )
}
