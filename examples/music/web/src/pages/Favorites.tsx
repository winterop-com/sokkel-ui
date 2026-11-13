import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { DraggableTrackList } from '@winterop-com/sokkel-ui-media/DraggableTrackList'
import { Play, Shuffle, Star } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { ALBUM_BY_ID, ALBUMS, ARTIST_BY_ID, songOf, type Song } from '../catalog'
import { favorites, useRows } from '../data'
import { SONG_DRAG, SongActions } from '../parts/actions'
import { AlbumCard, ArtistCard, asTrack, Nothing, useNowPlaying } from '../parts/songs'
import { playSongs, setPlaying } from '../player'

/** What the listener starred: songs, played from here as a list, albums and artists, newest first. */
export function Favorites() {
    const rows = useRows(favorites)
    const now = useNowPlaying()
    const songs = rows.filter((row) => row.kind === 'song').flatMap((row) => songOf(row.ref) ?? []) satisfies Song[]
    const albums = rows.filter((row) => row.kind === 'album').flatMap((row) => ALBUM_BY_ID.get(row.ref) ?? [])
    const artists = rows.filter((row) => row.kind === 'artist').flatMap((row) => ARTIST_BY_ID.get(row.ref) ?? [])
    const ids = songs.map((song) => song.id)
    const source = { kind: 'favorites' as const, label: 'Favorites', href: '/favorites' }
    const starred = new Set(ids)
    const empty = songs.length + albums.length + artists.length === 0
    return (
        <Stack gap="page">
            <PageHeader
                title="Favorites"
                count={`${String(songs.length)} songs, ${String(albums.length)} albums, ${String(artists.length)} artists`}
                actions={
                    songs.length > 0 && (
                        <>
                            <Button size="sm" variant="outline" onClick={() => playSongs(ids, 0, source, { shuffle: true })}>
                                <Shuffle aria-hidden />
                                Shuffle
                            </Button>
                            <Button size="sm" onClick={() => playSongs(ids, 0, source, { shuffle: false })}>
                                <Play className="fill-current" aria-hidden />
                                Play
                            </Button>
                        </>
                    )
                }
            />
            {empty && (
                <Nothing icon={Star} title="Nothing starred yet" action={{ label: 'Browse the albums', onClick: () => go('/albums') }}>
                    Star a song, an album or an artist and it is kept here.
                </Nothing>
            )}
            {songs.length > 0 && (
                <Section variant="flat" title="Songs" meta={songs.length}>
                    <DraggableTrackList
                        kind={SONG_DRAG.song}
                        tracks={songs.map((song) => asTrack(song, { artwork: true, album: true }))}
                        current={now.song?.id}
                        playing={now.playing}
                        follow={false}
                        onPlay={(track) => {
                            if (track.id === now.song?.id) setPlaying(!now.playing)
                            else playSongs(ids, ids.indexOf(track.id), source)
                        }}
                        actions={(track) => <SongActions song={track.id} starred={starred.has(track.id)} />}
                    />
                </Section>
            )}
            {albums.length > 0 && (
                <Section variant="flat" title="Albums" meta={albums.length}>
                    <MediaGrid label="Favorite albums">
                        {albums.map((album) => (
                            <AlbumCard key={album.id} album={album} />
                        ))}
                    </MediaGrid>
                </Section>
            )}
            {artists.length > 0 && (
                <Section variant="flat" title="Artists" meta={artists.length}>
                    <MediaGrid label="Favorite artists">
                        {artists.map((artist) => (
                            <ArtistCard
                                key={artist.id}
                                artist={artist}
                                albums={ALBUMS.filter((album) => album.artist === artist.id).length}
                            />
                        ))}
                    </MediaGrid>
                </Section>
            )}
        </Stack>
    )
}
