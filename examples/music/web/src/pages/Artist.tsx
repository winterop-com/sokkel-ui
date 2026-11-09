import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StarButton } from '@winterop-com/sokkel-ui/StarButton'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { TrackList } from '@winterop-com/sokkel-ui-media/TrackList'
import { MicVocal, Play, Radio, Shuffle } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { ARTIST_BY_ID, albumsOfArtist, lengthOfSongs, minutes, songsOfArtist, STYLE_NAMES } from '../catalog'
import { history, setFavorite, useRows, useStarred } from '../data'
import { SongActions, startRadio, useStarredSongs } from '../parts/actions'
import { AlbumCard, asTrack, Nothing, playArtist, useNowPlaying } from '../parts/songs'
import { playSongs, setPlaying } from '../player'

/** How many of an artist's songs the page lists as the most played. */
const TOP = 5

/** One artist: who they are, play and shuffle everything by them, their most played songs, and their albums. */
export function Artist({ id }: { id: string }) {
    const artist = ARTIST_BY_ID.get(id)
    const now = useNowPlaying()
    const starredSongs = useStarredSongs()
    const starred = useStarred('artist').has(id)
    const plays = useRows(history)
    if (artist === undefined) {
        return (
            <Nothing icon={MicVocal} title="No such artist" action={{ label: 'Go to the artists', onClick: () => go('/artists') }}>
                They may have been taken out of the library.
            </Nothing>
        )
    }
    const albums = albumsOfArtist(artist.id)
    const songs = songsOfArtist(artist.id)
    // Their songs played most lately first, then the first songs of their newest albums.
    const counts = new Map<string, number>()
    for (const play of plays) counts.set(play.song, (counts.get(play.song) ?? 0) + 1)
    const top = [...songs]
        .sort((one, other) => (counts.get(other.id) ?? 0) - (counts.get(one.id) ?? 0) || one.number - other.number)
        .slice(0, TOP)
    const ids = top.map((song) => song.id)
    return (
        <Stack gap="page">
            <PageHeader
                onBack={() => window.history.back()}
                trail={[{ label: 'Artists', href: '#/artists' }]}
                title={artist.name}
                description={artist.about}
                meta={
                    <MetaLine
                        size="sm"
                        items={[
                            STYLE_NAMES[artist.style],
                            `${String(albums.length)} ${albums.length === 1 ? 'album' : 'albums'}`,
                            `${String(songs.length)} songs, ${minutes(lengthOfSongs(songs))}`,
                        ]}
                    />
                }
                actions={
                    <>
                        <StarButton variant="outline" starred={starred} onStarredChange={(on) => setFavorite('artist', artist.id, on)} />
                        <Button size="sm" variant="outline" onClick={() => startRadio('artist', artist.id)}>
                            <Radio aria-hidden />
                            Radio
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => playArtist(artist, true)}>
                            <Shuffle aria-hidden />
                            Shuffle
                        </Button>
                        <Button size="sm" onClick={() => playArtist(artist)}>
                            <Play className="fill-current" aria-hidden />
                            Play
                        </Button>
                    </>
                }
            />
            <Section variant="flat" title="Most played">
                <TrackList
                    tracks={top.map((song) => asTrack(song, { artwork: true, album: true }))}
                    current={now.song?.id}
                    playing={now.playing}
                    follow={false}
                    onPlay={(track) => {
                        if (track.id === now.song?.id) setPlaying(!now.playing)
                        else playSongs(ids, ids.indexOf(track.id), { kind: 'artist', label: artist.name, href: `/artists/${artist.id}` })
                    }}
                    actions={(track) => <SongActions song={track.id} starred={starredSongs.has(track.id)} />}
                />
            </Section>
            <Section variant="flat" title="Albums" meta={albums.length}>
                <MediaGrid label={`Albums by ${artist.name}`}>
                    {albums.map((album) => (
                        <AlbumCard key={album.id} album={album} line={String(album.year)} />
                    ))}
                </MediaGrid>
            </Section>
        </Stack>
    )
}
