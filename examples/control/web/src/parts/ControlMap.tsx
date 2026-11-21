import { DARK_BASEMAP, SATELLITE_BASEMAP } from '@winterop-com/sokkel-ui-maps/basemap'
import { CoverageLayer } from '@winterop-com/sokkel-ui-maps/CoverageLayer'
import { GeoJsonLayer } from '@winterop-com/sokkel-ui-maps/GeoJsonLayer'
import { LinkLayer } from '@winterop-com/sokkel-ui-maps/LinkLayer'
import { MapView, type MapProjection, type MapViewProps } from '@winterop-com/sokkel-ui-maps/MapView'
import { PointLayer } from '@winterop-com/sokkel-ui-maps/PointLayer'
import { TrackLayer } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { ZoneLayer } from '@winterop-com/sokkel-ui-maps/ZoneLayer'
import type { AltitudeBand } from '@winterop-com/sokkel-ui-tracking/adsb'
import type { ReactNode } from 'react'

import type { Picture } from '../picture'

/** The layers of the control map, topmost first, as a layer list names them. */
export const LAYERS = [
    { id: 'flights', name: 'Flights', description: 'Aircraft, by altitude' },
    { id: 'vessels', name: 'Vessels', description: 'Vessels and the coast’s radars' },
    { id: 'satellites', name: 'Satellites', description: 'In orbit, with the station’s view' },
    { id: 'machine', name: 'Network', description: 'Home to each host' },
    { id: 'disasters', name: 'Disasters', description: 'Where an alert holds' },
    { id: 'quakes', name: 'Earthquakes', description: 'The last day, by magnitude' },
    { id: 'warnings', name: 'Weather warnings', description: 'The areas warned' },
] as const

export type LayerId = (typeof LAYERS)[number]['id']

/** The color each altitude band is drawn in. */
export const BAND_COLORS: Record<AltitudeBand, string> = {
    ground: 'var(--muted-foreground)',
    low: 'var(--chart-3)',
    medium: 'var(--chart-2)',
    high: 'var(--chart-4)',
}

const BASEMAPS = [DARK_BASEMAP, SATELLITE_BASEMAP, WORLD_BASEMAP]

export interface ControlMapProps extends Pick<
    MapViewProps,
    'bounds' | 'camera' | 'controls' | 'interactive' | 'onViewChange' | 'basemaps'
> {
    picture: Picture
    /** The layers left out. */
    hidden?: ReadonlySet<string>
    selected: string | null
    onSelect: (key: string | null) => void
    projection?: MapProjection
    labels?: boolean
    trails?: boolean
    /** The map's overlays: its tools and its legend. */
    children?: ReactNode
}

/**
 * The control site's map: every source a layer of its own over the dark street map. Warned areas
 * glow, each earthquake is a disc as wide as it was strong, the radars and the station's view sweep,
 * and light runs along the machine's connections.
 */
export function ControlMap({
    picture,
    hidden,
    selected,
    onSelect,
    projection,
    labels = true,
    trails = true,
    basemaps,
    children,
    ...view
}: ControlMapProps) {
    const shown = (id: LayerId) => hidden?.has(id) !== true
    return (
        <MapView
            label="Control map"
            defaultBasemap={DARK_BASEMAP}
            basemaps={basemaps ?? BASEMAPS}
            fallbackBasemap={WORLD_BASEMAP}
            projection={projection}
            selected={selected}
            onSelectedChange={(id) => onSelect(id)}
            rotate
            framed={false}
            className="h-full"
            {...view}
        >
            <ZoneLayer id="warnings" zones={picture.zones} fill="hatched" glow labels={false} visible={shown('warnings')} />
            <CoverageLayer id="quakes" cones={picture.quakes} bands={5} visible={shown('quakes')} />
            <CoverageLayer id="cover" cones={picture.cover} sweep={{ period: 6000 }} visible={shown('satellites') || shown('vessels')} />
            <LinkLayer id="machine" links={picture.links} path="great-circle" arc flow interactive={false} visible={shown('machine')} />
            <GeoJsonLayer id="path" data={picture.path} color="var(--track-friend)" interactive={false} visible={shown('satellites')} />
            <PointLayer id="disasters" data={picture.disasters} color="var(--warning)" radius={7} visible={shown('disasters')} />
            <TrackLayer id="hosts" tracks={picture.hosts} labels={false} trails={false} size={14} visible={shown('machine')} />
            <TrackLayer
                id="vessels"
                tracks={picture.vessels}
                labels={labels && picture.vessels.length < 200}
                trails={trails}
                size={picture.vessels.length < 200 ? undefined : 12}
                visible={shown('vessels')}
            />
            <TrackLayer
                id="flights"
                tracks={picture.flights}
                bands={BAND_COLORS}
                labels={labels}
                trails={trails}
                visible={shown('flights')}
            />
            <TrackLayer
                id="satellites"
                tracks={picture.satellites}
                labels={labels}
                trails={false}
                size={22}
                visible={shown('satellites')}
            />
            {children}
        </MapView>
    )
}
