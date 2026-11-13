import { InlineEdit } from '@winterop-com/sokkel-ui/InlineEdit'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenuItem, DropdownMenuSeparator } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Artwork, coverFor } from '@winterop-com/sokkel-ui-media/Artwork'
import { MediaCard, MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { ReorderableTrackList } from '@winterop-com/sokkel-ui-media/ReorderableTrackList'
import { ListMusic, Pencil, Play, Plus, Shuffle, Trash2 } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { lengthOfSongs, minutes, songOf, type Song } from '../catalog'
import { changePlaylist, playlists, useRows, type Playlist } from '../data'
import { queueSongs, RowMenu, SONG_DRAG, SongActions, useStarredSongs } from '../parts/actions'
import { askDelete, askNewPlaylist, askRename } from '../parts/dialogs'
import { asTrack, Nothing, useNowPlaying } from '../parts/songs'
import { player, playSongs, setPlaying, usePlayer } from '../player'

const songsOf = (playlist: Playlist): Song[] => playlist.entries.flatMap((entry) => songOf(entry.song) ?? [])

/** How a playlist plays: its songs in its order, as the queue from it. */
function playPlaylist(playlist: Playlist, start = 0, shuffle?: boolean): void {
    playSongs(
        playlist.entries.map((entry) => entry.song),
        start,
        { kind: 'playlist', label: playlist.name, href: `/playlists/${playlist.id}` },
        { shuffle },
    )
}

const lineOf = (playlist: Playlist) => {
    const songs = songsOf(playlist)
    if (songs.length === 0) return 'No songs yet'
    return `${String(songs.length)} ${songs.length === 1 ? 'song' : 'songs'}, ${minutes(lengthOfSongs(songs))}`
}

/** Every playlist as a card, the newest changed first, and New to make one. */
export function Playlists() {
    const rows = [...useRows(playlists)].sort((one, other) => other.updated - one.updated)
    const state = usePlayer()
    return (
        <Stack gap="page">
            <PageHeader
                title="Playlists"
                count={`${String(rows.length)} playlists`}
                actions={
                    <Button size="sm" onClick={() => askNewPlaylist()}>
                        <Plus aria-hidden />
                        New
                    </Button>
                }
            />
            {rows.length === 0 ? (
                <Nothing icon={ListMusic} title="No playlists yet" action={{ label: 'New playlist', onClick: () => askNewPlaylist() }}>
                    Make one here, or add an album or a song to one from its menu.
                </Nothing>
            ) : (
                <MediaGrid label="Playlists">
                    {rows.map((playlist) => (
                        <MediaCard
                            key={playlist.id}
                            title={playlist.name}
                            subtitle={lineOf(playlist)}
                            cover={<Artwork cover={coverFor(`playlist:${playlist.id}`)} />}
                            href={`#/playlists/${playlist.id}`}
                            playing={
                                state.playing && state.source?.kind === 'playlist' && state.source.href === `/playlists/${playlist.id}`
                            }
                            onPlay={playlist.entries.length === 0 ? undefined : () => playPlaylist(playlist)}
                            menu={
                                <>
                                    <DropdownMenuItem
                                        disabled={playlist.entries.length === 0}
                                        onClick={() => playPlaylist(playlist, 0, true)}
                                    >
                                        <Shuffle aria-hidden />
                                        Shuffle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => askRename(playlist.id)}>
                                        <Pencil aria-hidden />
                                        Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem variant="destructive" onClick={() => askDelete(playlist.id)}>
                                        <Trash2 aria-hidden />
                                        Delete
                                    </DropdownMenuItem>
                                </>
                            }
                        />
                    ))}
                </MediaGrid>
            )}
        </Stack>
    )
}

/**
 * One playlist: its name, edited in place, and what it is for; Play, Shuffle and a menu to rename
 * it, put it in the queue or delete it; its songs, each dragged by its grip into the order wanted
 * or taken off from its menu.
 */
export function PlaylistPage({ id }: { id: string }) {
    const playlist = useRows(playlists).find((row) => row.id === id)
    const now = useNowPlaying()
    const starred = useStarredSongs()
    if (playlist === undefined) {
        return (
            <Nothing icon={ListMusic} title="No such playlist" action={{ label: 'Go to the playlists', onClick: () => go('/playlists') }}>
                It may have been deleted.
            </Nothing>
        )
    }
    const songs = songsOf(playlist)
    const here = player.get().source?.href === `/playlists/${playlist.id}`
    const entries = playlist.entries.filter((entry) => songOf(entry.song) !== undefined)
    const move = (from: number, to: number) => {
        const next = [...entries]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        changePlaylist(playlist.id, { entries: next })
    }
    const remove = (key: string) => changePlaylist(playlist.id, { entries: playlist.entries.filter((entry) => entry.key !== key) })
    return (
        <Stack gap="page">
            <PageHeader
                onBack={() => window.history.back()}
                title={
                    <InlineEdit
                        label="Name"
                        variant="title"
                        value={playlist.name}
                        validate={(name) => (name.trim() === '' ? 'Give it a name' : null)}
                        onSave={(name) => changePlaylist(playlist.id, { name: name.trim() })}
                    />
                }
                description={
                    <InlineEdit
                        label="Description"
                        value={playlist.description}
                        placeholder="What it is for"
                        onSave={(description) => changePlaylist(playlist.id, { description: description.trim() })}
                    />
                }
                meta={
                    <MetaLine
                        size="sm"
                        items={[
                            lineOf(playlist),
                            <span key="at">
                                Changed <RelativeTime date={playlist.updated} />
                            </span>,
                        ]}
                    />
                }
                actions={
                    <>
                        <RowMenu label="More">
                            <DropdownMenuItem
                                disabled={songs.length === 0}
                                onClick={() =>
                                    queueSongs(
                                        entries.map((entry) => entry.song),
                                        'end',
                                        playlist.name,
                                    )
                                }
                            >
                                <Plus aria-hidden />
                                Add to queue
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => askRename(playlist.id)}>
                                <Pencil aria-hidden />
                                Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => askDelete(playlist.id)}>
                                <Trash2 aria-hidden />
                                Delete
                            </DropdownMenuItem>
                        </RowMenu>
                        <Button size="sm" variant="outline" disabled={songs.length === 0} onClick={() => playPlaylist(playlist, 0, true)}>
                            <Shuffle aria-hidden />
                            Shuffle
                        </Button>
                        <Button size="sm" disabled={songs.length === 0} onClick={() => playPlaylist(playlist, 0, false)}>
                            <Play className="fill-current" aria-hidden />
                            Play
                        </Button>
                    </>
                }
            />
            {entries.length === 0 ? (
                <Nothing
                    icon={ListMusic}
                    title="Nothing on this playlist yet"
                    action={{ label: 'Browse the albums', onClick: () => go('/albums') }}
                >
                    Add a song from its menu, or a whole album from its page.
                </Nothing>
            ) : (
                <ReorderableTrackList
                    kind={SONG_DRAG.listed}
                    tracks={entries.map((entry) => {
                        const song = songOf(entry.song)
                        return song === undefined
                            ? { id: entry.key, title: entry.song, duration: 0 }
                            : { ...asTrack(song, { artwork: true, album: true }), id: entry.key }
                    })}
                    current={here ? entries.find((entry) => entry.song === now.song?.id)?.key : undefined}
                    playing={now.playing}
                    follow={false}
                    onPlay={(track) => {
                        const index = entries.findIndex((entry) => entry.key === track.id)
                        if (here && entries[index]?.song === now.song?.id) setPlaying(!now.playing)
                        else playPlaylist(playlist, index)
                    }}
                    onMove={move}
                    actions={(track) => {
                        const entry = entries.find((one) => one.key === track.id)
                        if (entry === undefined) return null
                        return (
                            <SongActions
                                song={entry.song}
                                starred={starred.has(entry.song)}
                                remove={{ label: 'Remove from this playlist', onRemove: () => remove(entry.key) }}
                            />
                        )
                    }}
                />
            )}
        </Stack>
    )
}
