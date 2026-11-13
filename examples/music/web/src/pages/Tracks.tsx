import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DraggableTrackList } from '@winterop-com/sokkel-ui-media/DraggableTrackList'
import { Music2, Shuffle } from 'lucide-react'
import { useState } from 'react'

import { ALBUM_BY_ID, artistName, lengthOfSongs, minutes, SONGS } from '../catalog'
import { SONG_DRAG, SongActions, useStarredSongs } from '../parts/actions'
import { asTrack, Nothing, useNowPlaying } from '../parts/songs'
import { playSongs } from '../player'

type Order = 'title' | 'artist' | 'album' | 'length'

/** Every song in the library, filtered and ordered, played from the one pressed through the rest of the list. */
export function Tracks() {
    const [query, setQuery] = useState('')
    const [order, setOrder] = useState<Order>('artist')
    const now = useNowPlaying()
    const starred = useStarredSongs()
    const words = query.trim().toLowerCase()
    const shown = SONGS.filter(
        (song) =>
            words === '' ||
            `${song.title} ${artistName(song.artist)} ${ALBUM_BY_ID.get(song.album)?.title ?? ''}`.toLowerCase().includes(words),
    ).sort((one, other) => {
        if (order === 'title') return one.title.localeCompare(other.title)
        if (order === 'length') return other.duration - one.duration
        if (order === 'album')
            return (
                (ALBUM_BY_ID.get(one.album)?.title ?? '').localeCompare(ALBUM_BY_ID.get(other.album)?.title ?? '') ||
                one.disc - other.disc ||
                one.number - other.number
            )
        return artistName(one.artist).localeCompare(artistName(other.artist)) || one.title.localeCompare(other.title)
    })
    const ids = shown.map((song) => song.id)
    const source = { kind: 'tracks' as const, label: words === '' ? 'Every song' : `Songs matching “${query.trim()}”`, href: '/tracks' }
    return (
        <>
            <PageHeader title="Tracks" count={`${String(SONGS.length)} songs, ${minutes(lengthOfSongs(SONGS))}`} />
            <Toolbar
                search={<SearchField value={query} onChange={setQuery} placeholder="Filter" />}
                end={
                    <>
                        <Segmented
                            label="Order"
                            value={order}
                            onValueChange={setOrder}
                            options={[
                                { value: 'artist', label: 'Artist' },
                                { value: 'title', label: 'Title' },
                                { value: 'album', label: 'Album' },
                                { value: 'length', label: 'Longest' },
                            ]}
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={ids.length === 0}
                            onClick={() => playSongs(ids, 0, source, { shuffle: true })}
                        >
                            <Shuffle aria-hidden />
                            Shuffle
                        </Button>
                    </>
                }
            />
            {shown.length === 0 ? (
                <Nothing icon={Music2} title="No song matches" action={{ label: 'Clear the filter', onClick: () => setQuery('') }}>
                    No song, artist or album in the library is called “{query}”.
                </Nothing>
            ) : (
                <DraggableTrackList
                    kind={SONG_DRAG.song}
                    tracks={shown.map((song) => asTrack(song, { artwork: true, album: true }))}
                    current={now.song?.id}
                    playing={now.playing}
                    follow={false}
                    onPlay={(track) => playSongs(ids, ids.indexOf(track.id), source)}
                    actions={(track) => <SongActions song={track.id} starred={starred.has(track.id)} />}
                />
            )}
        </>
    )
}
