import { StarButton } from '@winterop-com/sokkel-ui/StarButton'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Disc3, ListEnd, ListMusic, ListPlus, ListStart, MicVocal, MoreHorizontal, Plus, Radio, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { go } from 'tidevann-shared/router'
import { artistName, songOf, stationFrom } from '../catalog'
import { addToPlaylist, newId, playlists, setFavorite, stations, useRows, useStarred } from '../data'
import { enqueue, playStation } from '../player'
import { askNewPlaylist } from './dialogs'

const songsWord = (count: number) => `${String(count)} ${count === 1 ? 'song' : 'songs'}`

/** Puts songs in the queue and says so. */
export function queueSongs(songs: readonly string[], where: 'next' | 'end', what?: string): void {
    enqueue(songs, where)
    toast.add({
        title: where === 'next' ? 'Playing next' : 'Added to the queue',
        description: what ?? songsWord(songs.length),
        timeout: 2500,
    })
}

/** Starts a station from an artist, an album or a song, keeps it among the listener's stations, and plays it. */
export function startRadio(kind: 'artist' | 'album' | 'song', ref: string): void {
    const made = stationFrom(kind, ref)
    if (made === undefined) return
    const existing = (stations.store.get() ?? []).find((row) => row.from.kind === kind && row.from.ref === ref)
    const id = existing?.id ?? newId('station')
    if (existing === undefined) {
        const row = { ...made, from: { kind, ref }, at: Date.now() }
        stations.change(
            (rows) => [{ id, ...row }, ...rows],
            (source) => source.create(row, id),
        )
    }
    // The station is known to the catalog before its first song is asked for.
    queueMicrotask(() => playStation(id, made.name))
}

/** The items of "Add to playlist": a new playlist with them, then each playlist. */
export function PlaylistItems({ songs, what }: { songs: readonly string[]; what?: string }) {
    const rows = useRows(playlists)
    return (
        <>
            <DropdownMenuItem onClick={() => askNewPlaylist(songs, what)}>
                <Plus aria-hidden />
                New playlist
            </DropdownMenuItem>
            {rows.length > 0 && <DropdownMenuSeparator />}
            {rows.map((playlist) => (
                <DropdownMenuItem
                    key={playlist.id}
                    onClick={() => {
                        addToPlaylist(playlist.id, songs)
                        toast.add({
                            type: 'success',
                            title: `Added to ${playlist.name}`,
                            description: what ?? songsWord(songs.length),
                            timeout: 2500,
                        })
                    }}
                >
                    <ListMusic aria-hidden />
                    {playlist.name}
                </DropdownMenuItem>
            ))}
        </>
    )
}

/** What a song's menu offers: the queue, a playlist, its album and artist, and a station from it. */
export function SongMenuItems({ song: id, extra, onAlbum = true }: { song: string; extra?: ReactNode; onAlbum?: boolean }) {
    const song = songOf(id)
    if (song === undefined) return null
    const radio = song.id.startsWith('radio:')
    return (
        <>
            <DropdownMenuItem onClick={() => queueSongs([song.id], 'next', song.title)}>
                <ListStart aria-hidden />
                Play next
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => queueSongs([song.id], 'end', song.title)}>
                <ListEnd aria-hidden />
                Add to queue
            </DropdownMenuItem>
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <ListPlus aria-hidden />
                    Add to playlist
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-52">
                    <PlaylistItems songs={[song.id]} what={song.title} />
                </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            {onAlbum && !radio && (
                <DropdownMenuItem onClick={() => go(`/albums/${song.album}`)}>
                    <Disc3 aria-hidden />
                    Go to album
                </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => go(`/artists/${song.artist}`)}>
                <MicVocal aria-hidden />
                Go to {artistName(song.artist)}
            </DropdownMenuItem>
            {!radio && (
                <DropdownMenuItem onClick={() => startRadio('song', song.id)}>
                    <Radio aria-hidden />
                    Start radio
                </DropdownMenuItem>
            )}
            {extra}
        </>
    )
}

/** A menu behind a row's "More" button. */
export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" aria-label={label} title="More" className="text-muted-foreground" />}
            >
                <MoreHorizontal aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

/** A song row's own controls: its star and its menu, with `remove` added to the menu where the song can leave a list. */
export function SongActions({
    song,
    starred,
    onAlbum,
    remove,
}: {
    song: string
    starred: boolean
    onAlbum?: boolean
    remove?: { label: string; onRemove: () => void }
}) {
    const title = songOf(song)?.title ?? song
    return (
        <>
            <StarButton starred={starred} onStarredChange={(on) => setFavorite('song', song, on)} />
            <RowMenu label={`More for ${title}`}>
                <SongMenuItems
                    song={song}
                    onAlbum={onAlbum}
                    extra={
                        remove === undefined ? undefined : (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={remove.onRemove}>
                                    <Trash2 aria-hidden />
                                    {remove.label}
                                </DropdownMenuItem>
                            </>
                        )
                    }
                />
            </RowMenu>
        </>
    )
}

/** The songs starred, for a row's star. */
export const useStarredSongs = () => useStarred('song')
