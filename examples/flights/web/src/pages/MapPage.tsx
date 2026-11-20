import { destination } from '@winterop-com/sokkel-ui-maps/geodesy'
import { LinkLayer, type MapLink } from '@winterop-com/sokkel-ui-maps/LinkLayer'
import { MapCompass } from '@winterop-com/sokkel-ui-maps/MapCompass'
import { MapCoordinates } from '@winterop-com/sokkel-ui-maps/MapCoordinates'
import { MapFollow } from '@winterop-com/sokkel-ui-maps/MapFollow'
import { MapGoTo } from '@winterop-com/sokkel-ui-maps/MapGoTo'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapRuler } from '@winterop-com/sokkel-ui-maps/MapRuler'
import { MapOverlay, MapView, type MapProjection, type MapViewport } from '@winterop-com/sokkel-ui-maps/MapView'
import { TrackLayer, trackCounts, trackLegendEntries } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import type { TrackAffiliation } from '@winterop-com/sokkel-ui-tracking/track'
import { useMemo, useState } from 'react'

import { REGION, trailFor } from '../feed'
import { ALTITUDE_BANDS, BAND_COLORS, bandName, nameOf, toMapTrack, type Flight } from '../flights'
import type { Settings } from '../settings'
import { FLIGHTS_BASEMAPS, FALLBACK_BASEMAP } from '../basemaps'

/** The sides the watch tells apart: its own flights, everyone else's, and those giving no callsign. */
const SIDES: readonly TrackAffiliation[] = ['friend', 'neutral', 'unknown']
const SIDE_WORDS = { friend: 'Tidevann', neutral: 'Other', unknown: 'No callsign' }

/** How long an aircraft glides to where it was read next: a little under the simulation's two seconds, and longer between live reads. */
const GLIDE = { simulated: 1600, live: 2000 }

/** How far ahead of an aircraft its route is drawn: where it gets to in this many seconds, holding its speed. */
const AHEAD = 3600

/** What the map's own buttons are: the usual ones, and the switch between the flat map and the globe. */
const CONTROLS = { projection: true }

/**
 * Each airborne aircraft's route ahead: the great circle it flies along from where it is, on the
 * heading and at the speed it reports, as far as it gets in an hour, in its side's color when `sides`
 * says the map is painted by side. One that reports no heading or stands still has none.
 */
function routesAhead(flights: readonly Flight[], sides: boolean): MapLink[] {
    return flights.flatMap((flight) => {
        if (flight.heading === undefined || flight.speed === undefined || flight.speed < 30) return []
        const from: [number, number] = [flight.lon, flight.lat]
        const to = destination(from, flight.heading, flight.speed * AHEAD)
        return [{ id: `route:${flight.id}`, from, to, tone: sides ? flight.affiliation : undefined }]
    })
}

/**
 * The map of the area: every aircraft turned to its track, painted by altitude or by side, its trail
 * behind it; a press picks one, Follow keeps it in the middle, and the ruler, go to, the compass and
 * the cursor's position stand in the corners. The globe button rolls the map up into a globe, where
 * each aircraft's route ahead is drawn along its great circle.
 */
export function MapPage({
    flights,
    at,
    options,
    selected,
    onSelect,
    followed,
    onRelease,
    onView,
}: {
    flights: readonly Flight[]
    at: number
    options: Settings
    selected: string | null
    onSelect: (id: string | null) => void
    followed: Flight | undefined
    onRelease: () => void
    onView: (view: MapViewport) => void
}) {
    const tracks = useMemo(
        () => flights.map((flight) => toMapTrack({ ...flight, trail: trailFor(flight, at, options.trail) }, options)),
        [flights, at, options],
    )
    const [projection, setProjection] = useState<MapProjection>('mercator')
    const globe = projection === 'globe'
    const byAltitude = options.colorBy === 'altitude'
    const routes = useMemo(() => (globe ? routesAhead(flights, !byAltitude) : []), [globe, flights, byAltitude])
    const source = flights[0]?.source === 'adsb.lol' ? 'live' : 'simulated'
    const unit = options.units === 'aviation' ? 'nmi' : 'km'
    return (
        <MapView
            label="Flight watch"
            basemaps={FLIGHTS_BASEMAPS}
            fallbackBasemap={FALLBACK_BASEMAP}
            camera={{ center: REGION.center, zoom: REGION.zoom }}
            projection={projection}
            onProjectionChange={setProjection}
            controls={CONTROLS}
            selected={selected}
            onSelectedChange={(id) => onSelect(id)}
            onViewChange={onView}
            rotate
            framed={false}
            file="flight-watch"
            className="h-full"
        >
            <LinkLayer id="routes" links={routes} dashed interactive={false} visible={globe} />
            <TrackLayer
                id="flights"
                tracks={tracks}
                trails={options.trail > 0}
                labels={options.labels}
                bands={byAltitude ? BAND_COLORS : undefined}
                transition={GLIDE[source]}
            />
            <MapRuler unit={unit} />
            <MapCompass />
            <MapGoTo zoom={9} />
            <MapCoordinates format={options.coordinates} scale unit={unit} />
            {followed !== undefined && (
                <MapFollow
                    position={[followed.lon, followed.lat]}
                    name={nameOf(followed)}
                    zoom={8}
                    duration={GLIDE[source]}
                    onRelease={onRelease}
                />
            )}
            <MapOverlay corner="bottom-right">
                {byAltitude ? (
                    <MapLegend
                        title="Altitude"
                        entries={ALTITUDE_BANDS.map((band) => ({ label: bandName(band, options.units), color: BAND_COLORS[band] }))}
                        counts={ALTITUDE_BANDS.map((band) => tracks.filter((track) => track.band === band).length)}
                        shape="point"
                        className="w-52"
                    />
                ) : (
                    <MapLegend
                        title="Affiliation"
                        entries={trackLegendEntries(SIDE_WORDS, SIDES)}
                        counts={trackCounts(tracks, SIDES)}
                        shape="point"
                        className="w-44"
                    />
                )}
            </MapOverlay>
        </MapView>
    )
}
