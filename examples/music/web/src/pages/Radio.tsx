import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { MediaCard, MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { TrackList } from '@winterop-com/sokkel-ui-media/TrackList'
import { Trash2 } from 'lucide-react'

import { songOf, STATIONS, STYLE_NAMES, type Station } from '../catalog'
import { stations, useRows } from '../data'
import { asTrack } from '../parts/songs'
import { playStation, upNext, usePlayer } from '../player'

/**
 * Radio: stations that never run out, each making new songs in its style one after another, and
 * the stations the listener started from an artist, an album or a song. What the station playing
 * makes next is listed while it plays.
 */
export function Radio() {
    const state = usePlayer()
    const made = useRows(stations)
    const playingStation = state.radio?.station
    const card = (station: Station, removable: boolean) => (
        <MediaCard
            key={station.id}
            title={station.name}
            subtitle={station.about}
            cover={<Artwork cover={station.cover} />}
            badge={STYLE_NAMES[station.style]}
            onSelect={() => playStation(station.id, station.name)}
            playing={state.playing && playingStation === station.id}
            onPlay={() => playStation(station.id, station.name)}
            menu={
                removable ? (
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() =>
                            stations.change(
                                (rows) => rows.filter((row) => row.id !== station.id),
                                (source) => source.remove(station.id),
                            )
                        }
                    >
                        <Trash2 aria-hidden />
                        Remove station
                    </DropdownMenuItem>
                ) : undefined
            }
        />
    )
    const coming = playingStation === undefined ? [] : upNext(state).flatMap(({ entry }) => songOf(entry.song) ?? [])
    return (
        <Stack gap="page">
            <PageHeader
                title="Radio"
                description="Stations that never run out: each one makes a new song in its style as the last one ends."
            />
            {coming.length > 0 && (
                <Section variant="flat" title="Coming up" meta={state.source?.label}>
                    <TrackList tracks={coming.map((song) => asTrack(song, { artwork: true }))} follow={false} />
                </Section>
            )}
            <Section variant="flat" title="Stations" meta={STATIONS.length}>
                <MediaGrid label="Stations">{STATIONS.map((station) => card(station, false))}</MediaGrid>
            </Section>
            <Section
                variant="flat"
                title="Your stations"
                meta={made.length}
                description={
                    made.length === 0 ? 'Start radio from an artist, an album or a song, from its menu, and it is kept here.' : undefined
                }
            >
                {made.length > 0 && <MediaGrid label="Your stations">{made.map((station) => card(station, true))}</MediaGrid>}
            </Section>
        </Stack>
    )
}
