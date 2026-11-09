import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { MediaCard } from '@winterop-com/sokkel-ui-media/MediaCard'
import type { Track } from '@winterop-com/sokkel-ui-media/TrackList'
import { Download, ListEnd, ListPlus, ListStart, MicVocal, Radio, Shuffle, Star, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { go } from 'tidevann-shared/router'
import { albumOf, artistName, songsOfAlbum, songsOfArtist, type Album, type Artist, type Song } from '../catalog'
import { downloads, setFavorite, useRows, useStarred } from '../data'
import { download } from '../downloads'
import { currentSong, playSongs, usePlayer } from '../player'
import { PlaylistItems, queueSongs, startRadio } from './actions'

/** A song as a track list's row: its number on its album, or its cover; the artist under the title where it differs, or always. */
export function asTrack(song: Song, { artwork = false, album = false }: { artwork?: boolean; album?: boolean } = {}): Track {
    const on = albumOf(song)
    const by = artistName(song.artist)
    return {
        id: song.id,
        title: song.title,
        subtitle: artwork
            ? song.with === undefined
                ? by
                : `${by} with ${song.with}`
            : song.with === undefined
              ? undefined
              : `with ${song.with}`,
        number: artwork ? undefined : song.number,
        artwork: artwork ? <Artwork cover={on.cover} /> : undefined,
        meta: album ? on.title : undefined,
        duration: song.duration,
        disc: artwork ? undefined : song.disc,
    }
}

/** The song playing, and whether it plays, for marking it in a list. */
export function useNowPlaying(): { song: Song | undefined; playing: boolean } {
    const state = usePlayer()
    return { song: currentSong(state), playing: state.playing }
}

const ids = (songs: readonly Song[]) => songs.map((song) => song.id)

/** Plays an album from its first song, or shuffled. */
export function playAlbum(album: Album, shuffle = false): void {
    playSongs(ids(songsOfAlbum(album.id)), 0, { kind: 'album', label: album.title, href: `/albums/${album.id}` }, { shuffle })
}

export function playArtist(artist: Artist, shuffle = false): void {
    playSongs(ids(songsOfArtist(artist.id)), 0, { kind: 'artist', label: artist.name, href: `/artists/${artist.id}` }, { shuffle })
}

/** What an album's menu offers, on its card and its page. */
export function AlbumMenuItems({ album, page = false }: { album: Album; page?: boolean }) {
    const songs = ids(songsOfAlbum(album.id))
    const kept = useRows(downloads).some((row) => row.id === album.id)
    const starred = useStarred('album').has(album.id)
    return (
        <>
            <DropdownMenuItem onClick={() => playAlbum(album, true)}>
                <Shuffle aria-hidden />
                Shuffle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => queueSongs(songs, 'next', album.title)}>
                <ListStart aria-hidden />
                Play next
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => queueSongs(songs, 'end', album.title)}>
                <ListEnd aria-hidden />
                Add to queue
            </DropdownMenuItem>
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <ListPlus aria-hidden />
                    Add to playlist
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-52">
                    <PlaylistItems songs={songs} what={`${album.title}, ${String(songs.length)} songs`} />
                </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            {!page && (
                <DropdownMenuItem onClick={() => setFavorite('album', album.id, !starred)}>
                    <Star aria-hidden />
                    {starred ? 'Remove from favorites' : 'Add to favorites'}
                </DropdownMenuItem>
            )}
            {!page && !kept && (
                <DropdownMenuItem onClick={() => download(album.id)}>
                    <Download aria-hidden />
                    Download
                </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => go(`/artists/${album.artist}`)}>
                <MicVocal aria-hidden />
                Go to {artistName(album.artist)}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => startRadio('album', album.id)}>
                <Radio aria-hidden />
                Start radio
            </DropdownMenuItem>
        </>
    )
}

/** An album's card in a grid: its cover, title and artist, played from its button, its menu at its corner. */
export function AlbumCard({ album, line }: { album: Album; line?: ReactNode }) {
    const now = useNowPlaying()
    return (
        <MediaCard
            title={album.title}
            subtitle={line ?? <MetaLine inline items={[artistName(album.artist), album.year]} />}
            cover={<Artwork cover={album.cover} />}
            href={`#/albums/${album.id}`}
            playing={now.playing && now.song?.album === album.id}
            onPlay={() => playAlbum(album)}
            menu={<AlbumMenuItems album={album} />}
        />
    )
}

/** An artist's card: drawn cover, name, how many albums, played from its button. */
export function ArtistCard({ artist, albums }: { artist: Artist; albums: number }) {
    const now = useNowPlaying()
    const starred = useStarred('artist').has(artist.id)
    return (
        <MediaCard
            title={artist.name}
            subtitle={`${String(albums)} ${albums === 1 ? 'album' : 'albums'}`}
            cover={<Artwork cover={artist.cover} />}
            href={`#/artists/${artist.id}`}
            playing={now.playing && now.song?.artist === artist.id && now.song.album.startsWith('radio:') === false}
            onPlay={() => playArtist(artist)}
            menu={
                <>
                    <DropdownMenuItem onClick={() => playArtist(artist, true)}>
                        <Shuffle aria-hidden />
                        Shuffle
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFavorite('artist', artist.id, !starred)}>
                        <Star aria-hidden />
                        {starred ? 'Remove from favorites' : 'Add to favorites'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => startRadio('artist', artist.id)}>
                        <Radio aria-hidden />
                        Start radio
                    </DropdownMenuItem>
                </>
            }
        />
    )
}

/** What a page with nothing in it says, and the way to fill it. */
export function Nothing({
    icon: Icon,
    title,
    children,
    action,
}: {
    icon: LucideIcon
    title: string
    children: ReactNode
    action?: { label: string; onClick: () => void }
}) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Icon aria-hidden />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{children}</EmptyDescription>
            </EmptyHeader>
            {action !== undefined && (
                <EmptyContent>
                    <Button size="sm" variant="outline" onClick={action.onClick}>
                        {action.label}
                    </Button>
                </EmptyContent>
            )}
        </Empty>
    )
}
