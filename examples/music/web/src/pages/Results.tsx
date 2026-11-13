import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { DraggableTrackList } from '@winterop-com/sokkel-ui-media/DraggableTrackList'
import { Search } from 'lucide-react'

import { ALBUMS } from '../catalog'
import { SONG_DRAG, SongActions, useStarredSongs } from '../parts/actions'
import { AlbumCard, ArtistCard, asTrack, Nothing, useNowPlaying } from '../parts/songs'
import { find } from '../search'
import { playSongs, setPlaying } from '../player'

/** Everything in the library that answers a search: artists, albums and songs, the songs played as a list. */
export function Results({ query }: { query: string }) {
    const found = find(query)
    const now = useNowPlaying()
    const starred = useStarredSongs()
    const ids = found.songs.map((song) => song.id)
    const total = found.artists.length + found.albums.length + found.songs.length
    return (
        <Stack gap="page">
            <PageHeader title={`“${query}”`} count={`${String(total)} found`} />
            {total === 0 && (
                <Nothing icon={Search} title="Nothing answers to that">
                    No artist, album or song in the library is called “{query}”.
                </Nothing>
            )}
            {found.artists.length > 0 && (
                <Section variant="flat" title="Artists" meta={found.artists.length}>
                    <MediaGrid label="Artists found">
                        {found.artists.map((artist) => (
                            <ArtistCard
                                key={artist.id}
                                artist={artist}
                                albums={ALBUMS.filter((album) => album.artist === artist.id).length}
                            />
                        ))}
                    </MediaGrid>
                </Section>
            )}
            {found.albums.length > 0 && (
                <Section variant="flat" title="Albums" meta={found.albums.length}>
                    <MediaGrid label="Albums found">
                        {found.albums.map((album) => (
                            <AlbumCard key={album.id} album={album} />
                        ))}
                    </MediaGrid>
                </Section>
            )}
            {found.songs.length > 0 && (
                <Section variant="flat" title="Songs" meta={found.songs.length}>
                    <DraggableTrackList
                        kind={SONG_DRAG.song}
                        tracks={found.songs.map((song) => asTrack(song, { artwork: true, album: true }))}
                        current={now.song?.id}
                        playing={now.playing}
                        follow={false}
                        onPlay={(track) => {
                            if (track.id === now.song?.id) setPlaying(!now.playing)
                            else
                                playSongs(ids, ids.indexOf(track.id), {
                                    kind: 'search',
                                    label: `Songs matching “${query}”`,
                                    href: `/search/${encodeURIComponent(query)}`,
                                })
                        }}
                        actions={(track) => <SongActions song={track.id} starred={starred.has(track.id)} />}
                    />
                </Section>
            )}
        </Stack>
    )
}
