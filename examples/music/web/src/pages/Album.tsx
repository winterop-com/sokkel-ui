import { DownloadButton } from '@winterop-com/sokkel-ui/DownloadButton'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StarButton } from '@winterop-com/sokkel-ui/StarButton'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { TrackList } from '@winterop-com/sokkel-ui-media/TrackList'
import { Disc3, ListPlus, MoreHorizontal, Pause, Play, Shuffle } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { ALBUM_BY_ID, ARTIST_BY_ID, albumsOfArtist, formatBytes, lengthOfSongs, minutes, songsOfAlbum } from '../catalog'
import { downloads, setFavorite, useRows, useStarred } from '../data'
import { download, removeDownload } from '../downloads'
import { PlaylistItems, SongActions, useStarredSongs } from '../parts/actions'
import { AlbumCard, AlbumMenuItems, asTrack, Nothing, playAlbum, useNowPlaying } from '../parts/songs'
import { playSongs, setPlaying } from '../player'

/**
 * One album: back and the trail through Albums and its artist, the title, the artist, year and
 * length, and Download, the star, Add to playlist and More; the cover with Play and Shuffle beside
 * the songs, the one playing marked, and more by the artist under them.
 */
export function Album({ id }: { id: string }) {
    const album = ALBUM_BY_ID.get(id)
    const now = useNowPlaying()
    const starredSongs = useStarredSongs()
    const starred = useStarred('album').has(id)
    const kept = useRows(downloads).find((row) => row.id === id)
    if (album === undefined) {
        return (
            <Nothing icon={Disc3} title="No such album" action={{ label: 'Go to the albums', onClick: () => go('/albums') }}>
                It may have been taken out of the library.
            </Nothing>
        )
    }
    const artist = ARTIST_BY_ID.get(album.artist)
    const songs = songsOfAlbum(album.id)
    const ids = songs.map((song) => song.id)
    const source = { kind: 'album' as const, label: album.title, href: `/albums/${album.id}` }
    const here = now.song?.album === album.id
    const others = albumsOfArtist(album.artist).filter((other) => other.id !== album.id)
    return (
        <Stack gap="page">
            <PageHeader
                onBack={() => window.history.back()}
                trail={[
                    { label: 'Albums', href: '#/albums' },
                    { label: artist?.name ?? album.artist, href: `#/artists/${album.artist}` },
                ]}
                title={album.title}
                meta={
                    <MetaLine
                        size="sm"
                        items={[
                            <TextLink key="artist" href={`#/artists/${album.artist}`}>
                                {artist?.name ?? album.artist}
                            </TextLink>,
                            album.year,
                            `${String(songs.length)} songs, ${minutes(lengthOfSongs(songs))}`,
                        ]}
                    />
                }
                actions={
                    <>
                        <DownloadButton
                            variant="outline"
                            size="sm"
                            compact="narrow"
                            state={kept === undefined ? 'idle' : kept.state}
                            count={kept?.done}
                            total={kept?.total ?? songs.length}
                            keptDetail={kept?.state === 'kept' ? `On this device, ${formatBytes(kept.bytes)}` : undefined}
                            onDownload={() => download(album.id)}
                            onCancel={() => removeDownload(album.id)}
                            onRemove={() => removeDownload(album.id)}
                        />
                        <StarButton variant="outline" starred={starred} onStarredChange={(on) => setFavorite('album', album.id, on)} />
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
                                <ListPlus aria-hidden />
                                Add to playlist
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <PlaylistItems songs={ids} what={`${album.title}, ${String(songs.length)} songs`} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button size="icon-sm" variant="outline" aria-label="More" title="More" />}>
                                <MoreHorizontal aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <AlbumMenuItems album={album} page />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
            />
            <Row gap="2xl" align="start" stackBelowRoom="2xl">
                <Row gap="lg" align="end" wrap className="shrink-0 @2xl:sticky @2xl:top-0 @2xl:w-44 @4xl:w-60">
                    <span className="block size-32 shrink-0 overflow-hidden rounded-surface shadow-xs ring-1 ring-border @2xl:aspect-square @2xl:size-auto @2xl:w-full">
                        <Artwork cover={album.cover} />
                    </span>
                    <Row>
                        {here && now.playing ? (
                            <Button size="sm" onClick={() => setPlaying(false)}>
                                <Pause className="fill-current" aria-hidden />
                                Pause
                            </Button>
                        ) : (
                            <Button size="sm" onClick={() => (here ? setPlaying(true) : playAlbum(album))}>
                                <Play className="fill-current" aria-hidden />
                                {here ? 'Resume' : 'Play'}
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => playAlbum(album, true)}>
                            <Shuffle aria-hidden />
                            Shuffle
                        </Button>
                    </Row>
                </Row>
                <Stack gap="2xl" className="min-w-0 flex-1">
                    <TrackList
                        tracks={songs.map((song) => asTrack(song))}
                        current={here ? now.song?.id : undefined}
                        playing={now.playing}
                        onPlay={(track) => {
                            if (track.id === now.song?.id) setPlaying(!now.playing)
                            else playSongs(ids, ids.indexOf(track.id), source)
                        }}
                        actions={(track) => <SongActions song={track.id} starred={starredSongs.has(track.id)} onAlbum={false} />}
                    />
                    {others.length > 0 && (
                        <Section variant="flat" title={`More by ${artist?.name ?? album.artist}`}>
                            <MediaGrid label={`More by ${artist?.name ?? album.artist}`}>
                                {others.map((other) => (
                                    <AlbumCard key={other.id} album={other} line={String(other.year)} />
                                ))}
                            </MediaGrid>
                        </Section>
                    )}
                </Stack>
            </Row>
        </Stack>
    )
}
