import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { LinkLayer, type MapLink } from '@winterop-com/sokkel-ui-maps/LinkLayer'
import { MapCompass } from '@winterop-com/sokkel-ui-maps/MapCompass'
import { MapCoordinates } from '@winterop-com/sokkel-ui-maps/MapCoordinates'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapRuler } from '@winterop-com/sokkel-ui-maps/MapRuler'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { TrackLayer, type Track } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { flowTracks, type ConnectionFlow } from '@winterop-com/sokkel-ui-tracking/network'
import { useMemo } from 'react'

import { homeOf, type ColorBy, type Prefs } from '../model'
import { coloring } from '../tones'
import type { Snapshot, WatchState } from '../watch'

/** The connections of each remote host, by its address. */
export function connectionsByHost(snapshot: Snapshot): Map<string, ConnectionFlow[]> {
    const hosts = new Map<string, ConnectionFlow[]>()
    for (const connection of snapshot.connections) {
        const list = hosts.get(connection.remoteAddress)
        if (list === undefined) hosts.set(connection.remoteAddress, [connection])
        else list.push(connection)
    }
    return hosts
}

/** This machine, standing at home in the primary color whatever the map is colored by. */
const HOME_COLORS = { friend: 'var(--primary)' }

/**
 * Every remote host this machine talks to, placed where the lookup says, with a link from home to
 * each: colored by the state of the host's connections or by the process that moves the most with
 * it. A host or a link picked shows the host's connections in the side panel.
 */
export function MapPage({
    state,
    snapshot,
    prefs,
    selected,
    onSelect,
    onColorBy,
}: {
    state: WatchState
    snapshot: Snapshot
    prefs: Prefs
    selected: string | null
    onSelect: (id: string | null) => void
    onColorBy: (by: ColorBy) => void
}) {
    const home = homeOf(prefs.home)
    const byHost = useMemo(() => connectionsByHost(snapshot), [snapshot])
    const paint = useMemo(() => coloring(prefs.colorBy, snapshot.connections), [prefs.colorBy, snapshot])
    const { hosts, links } = useMemo(() => {
        const placed = flowTracks(snapshot.remotes, {
            home: home.at,
            classify: (track) => paint.toneOf(byHost.get(String(track.properties?.address)) ?? []),
        })
        const shown: Track[] = placed.tracks.map((track) => ({
            id: track.id,
            position: [track.lon, track.lat],
            affiliation: track.affiliation,
            kind: 'other',
            label: String(track.properties?.place ?? track.label).split(',')[0],
        }))
        const toneById = new Map(placed.tracks.map((track) => [track.id, track.affiliation]))
        const drawn: MapLink[] = placed.links.map((link) => ({ id: link.id, from: link.from, to: link.to, tone: toneById.get(link.id) }))
        return { hosts: shown, links: drawn }
    }, [snapshot, home.at, paint, byHost])
    const homeTrack: Track[] = useMemo(
        () => [{ id: 'home', position: home.at, affiliation: 'friend', kind: 'sensor', label: 'This machine' }],
        [home.at],
    )
    const counts = paint.tones.map((tone) => hosts.filter((host) => host.affiliation === tone).length)
    const unplaced = snapshot.remotes.length - hosts.length
    const where = state.geo?.kind === 'geolite' ? 'GeoLite2' : 'the built-in lookup'

    return (
        <Stack gap="section" className="h-full">
            <PageHeader
                title="Map"
                count={`${String(hosts.length)} of ${String(snapshot.remotes.length)} hosts placed`}
                actions={
                    <Segmented<ColorBy>
                        label="Color by"
                        size="sm"
                        value={prefs.colorBy}
                        onValueChange={onColorBy}
                        options={[
                            { value: 'state', label: 'State' },
                            { value: 'process', label: 'Process' },
                        ]}
                    />
                }
            />
            <MapView
                label="Remote hosts this machine talks to"
                defaultBasemap={WORLD_BASEMAP}
                basemaps={[WORLD_BASEMAP]}
                camera={{ center: [home.at[0] - 20, 28], zoom: 1 }}
                selected={selected}
                onSelectedChange={(id) => onSelect(id !== null && id.startsWith('flow:') ? id : null)}
                notes={[
                    `Placed by ${where}, to the city at best; a host in the cloud shows where its data center is.`,
                    ...(unplaced > 0
                        ? [
                              `${String(unplaced)} ${unplaced === 1 ? 'host is' : 'hosts are'} not on the map: private, loopback or not known to the lookup.`,
                          ]
                        : []),
                ]}
                file="network-map"
                className="min-h-80 flex-1"
            >
                <LinkLayer id="links" links={links} colors={paint.colors} />
                <TrackLayer id="hosts" tracks={hosts} colors={paint.colors} trails={false} size={18} transition={0} />
                <TrackLayer id="home" tracks={homeTrack} colors={HOME_COLORS} trails={false} interactive={false} transition={0} />
                <MapRuler />
                <MapCompass />
                <MapCoordinates />
                <MapOverlay corner="bottom-right">
                    <MapLegend
                        title={prefs.colorBy === 'state' ? 'State' : 'Process'}
                        entries={paint.legend}
                        counts={counts}
                        shape="line"
                        className="w-44"
                    />
                </MapOverlay>
            </MapView>
        </Stack>
    )
}
