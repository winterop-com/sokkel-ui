/**
 * One search over the library, for the top bar's field, the palette and the results page: artists,
 * albums and songs whose names hold every word typed, a name starting with the query first.
 */
import type { SearchGroup, SearchResult } from '@winterop-com/sokkel-ui/Search'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { Music2 } from 'lucide-react'

import { ALBUMS, ARTISTS, artistName, ALBUM_BY_ID, SONGS, type Album, type Artist, type Song } from './catalog'

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** How well `text` answers the query's words: 0 not at all, higher better. */
function score(text: string, words: readonly string[], query: string): number {
    const folded = fold(text)
    if (!words.every((word) => folded.includes(word))) return 0
    if (folded.startsWith(query)) return 3
    return folded.split(/\s+/).some((part) => part.startsWith(words[0] ?? '')) ? 2 : 1
}

export interface Found {
    artists: Artist[]
    albums: Album[]
    songs: Song[]
}

/** What in the library answers `query`, best first, up to `limit` of each kind. */
export function find(query: string, limit = Infinity): Found {
    const folded = fold(query.trim())
    const words = folded.split(/\s+/).filter((word) => word !== '')
    if (words.length === 0) return { artists: [], albums: [], songs: [] }
    const ranked = <T,>(items: readonly T[], text: (item: T) => string, also: (item: T) => string = () => '') =>
        items
            .map((item) => ({
                item,
                score: Math.max(score(text(item), words, folded), score(`${text(item)} ${also(item)}`, words, folded) > 0 ? 0.5 : 0),
            }))
            .filter((one) => one.score > 0)
            .sort((one, other) => other.score - one.score)
            .slice(0, limit)
            .map((one) => one.item)
    return {
        artists: ranked(ARTISTS, (artist) => artist.name),
        albums: ranked(
            ALBUMS,
            (album) => album.title,
            (album) => artistName(album.artist),
        ),
        songs: ranked(
            SONGS,
            (song) => song.title,
            (song) => `${artistName(song.artist)} ${ALBUM_BY_ID.get(song.album)?.title ?? ''}`,
        ),
    }
}

/** How many of each kind the field and the palette list. */
const LISTED = 5

/** The library's answer as the search's groups: artists, albums, songs, each with how many match in all. */
export function searchGroups(query: string): SearchGroup[] {
    const all = find(query)
    const groups: SearchGroup[] = [
        {
            kind: 'artists',
            title: 'Artists',
            total: all.artists.length,
            results: all.artists.slice(0, LISTED).map((artist): SearchResult => ({
                id: artist.id,
                title: artist.name,
                detail: 'Artist',
                round: true,
                artwork: <Artwork cover={artist.cover} />,
            })),
        },
        {
            kind: 'albums',
            title: 'Albums',
            total: all.albums.length,
            results: all.albums.slice(0, LISTED).map((album): SearchResult => ({
                id: album.id,
                title: album.title,
                detail: `${artistName(album.artist)}, ${String(album.year)}`,
                artwork: <Artwork cover={album.cover} />,
            })),
        },
        {
            kind: 'songs',
            title: 'Songs',
            total: all.songs.length,
            results: all.songs.slice(0, LISTED).map((song): SearchResult => ({
                id: song.id,
                title: song.title,
                detail: `${artistName(song.artist)}, ${ALBUM_BY_ID.get(song.album)?.title ?? ''}`,
                icon: Music2,
            })),
        },
    ]
    return groups.filter((group) => group.results.length > 0)
}
