import { CoverageLayer, type RangeRings, type SensorCone } from '@winterop-com/sokkel-ui-maps/CoverageLayer'
import { UNIT_METERS } from '@winterop-com/sokkel-ui-maps/geodesy'
import type { LngLat } from '@winterop-com/sokkel-ui-maps/geometry'
import { LinkLayer, type MapLink } from '@winterop-com/sokkel-ui-maps/LinkLayer'
import { MapCompass } from '@winterop-com/sokkel-ui-maps/MapCompass'
import { MapCoordinates } from '@winterop-com/sokkel-ui-maps/MapCoordinates'
import { MapFollow } from '@winterop-com/sokkel-ui-maps/MapFollow'
import { MapGoTo } from '@winterop-com/sokkel-ui-maps/MapGoTo'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapRuler } from '@winterop-com/sokkel-ui-maps/MapRuler'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { TrackLayer, trackCounts, trackLegendEntries, type Track } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { ZoneLayer, zoneLegendEntry } from '@winterop-com/sokkel-ui-maps/ZoneLayer'
import { useMemo } from 'react'

import type { ZoneRow } from '../data'
import { formatPosition, readPosition } from '../format'
import type { Settings } from '../settings'
import { HARBORS, WATCH_CENTER } from '../sim/world'

/** Where the watch's map opens: the three harbors and the sea west of them. */
const CAMERA = { center: WATCH_CENTER, zoom: 5.6 }

/** What the three harbor radars cover: each a wedge out to sea. */
const RADAR_CONES: SensorCone[] = [
    { id: 'radar-harbor', position: HARBORS.harbor, bearing: 270, width: 140, range: 90_000, tone: 'friend' },
    { id: 'radar-juniper', position: HARBORS.juniper, bearing: 255, width: 120, range: 80_000, tone: 'friend' },
    { id: 'radar-larkspur', position: HARBORS.larkspur, bearing: 290, width: 110, range: 100_000, tone: 'friend' },
]

/** Rings round harbor at round distances in the unit: every 10 NM or mi, every 20 km. */
function ringsIn(unit: Settings['unit']): RangeRings {
    const step = unit === 'km' ? 20 : 10
    return {
        id: 'harbor-rings',
        position: HARBORS.harbor,
        distances: [1, 2, 3, 4].map((times) => times * step * UNIT_METERS[unit]),
        labelBearing: 250,
    }
}

/**
 * The watch's map: its zones, the radars' cover, the lines of running tasks and the tracks, with
 * the ruler, the compass, go to, the cursor's position and the legend; `following` keeps one
 * track centered. `tools` leaves the tools off, for a map beside a list.
 */
export function WatchMap({
    label,
    tracks,
    zones,
    links = [],
    options,
    selected,
    onSelectedChange,
    following,
    onRelease,
    tools = true,
    className,
}: {
    label: string
    tracks: readonly Track[]
    zones: readonly ZoneRow[]
    links?: readonly MapLink[]
    options: Settings
    selected: string | null
    onSelectedChange: (id: string | null) => void
    /** The track the map keeps centered. */
    following?: Track
    onRelease?: () => void
    tools?: boolean
    className?: string
}) {
    const shown = useMemo(() => zones.filter((zone) => zone.visible), [zones])
    const rings = useMemo(() => [ringsIn(options.unit)], [options.unit])
    const legend = useMemo(() => trackLegendEntries(), [])
    const areas = useMemo(() => shown.map((zone) => zoneLegendEntry(zone.label, zone.tone, zone.fill)), [shown])
    const written = options.coordinates === 'mgrs' || options.format === 'dms'
    return (
        <MapView
            label={label}
            defaultBasemap={WORLD_BASEMAP}
            basemaps={[WORLD_BASEMAP]}
            camera={CAMERA}
            rotate={tools}
            selected={selected}
            onSelectedChange={(id) => onSelectedChange(id)}
            className={className}
        >
            <ZoneLayer id="zones" zones={shown} />
            {tools && options.coverage && <CoverageLayer id="cover" cones={RADAR_CONES} rings={rings} unit={options.unit} />}
            {tools && options.links && <LinkLayer id="links" links={links} unit={options.unit} />}
            <TrackLayer id="tracks" tracks={tracks} trails={options.trails} labels={tools && options.labels} />
            {tools && (
                <>
                    <MapRuler unit={options.unit} />
                    <MapCompass />
                    <MapGoTo
                        parse={readPosition}
                        words={{
                            placeholder: options.coordinates === 'mgrs' ? 'MGRS or lat, lon' : 'Lat, lon or MGRS',
                            invalid: 'Write a position as latitude, longitude or an MGRS reference.',
                        }}
                    />
                    <MapCoordinates
                        unit={options.unit}
                        formatPosition={written ? (position: LngLat) => formatPosition(position, options) : undefined}
                    />
                    <MapOverlay corner="bottom-right">
                        <MapLegend title="Affiliation" entries={legend} counts={trackCounts(tracks)} shape="point" className="w-40" />
                    </MapOverlay>
                </>
            )}
            {!tools && areas.length > 0 && (
                <MapOverlay corner="bottom-right">
                    <MapLegend title="Zones" entries={areas} shape="area" className="w-40" />
                </MapOverlay>
            )}
            {following !== undefined && onRelease !== undefined && (
                <MapFollow position={following.position} name={following.label ?? following.id} onRelease={onRelease} />
            )}
        </MapView>
    )
}
