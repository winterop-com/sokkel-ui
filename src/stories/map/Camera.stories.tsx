import type { Meta, StoryObj } from '@storybook/react-vite'
import type { FeatureCollection, Point } from 'geojson'
import { useState } from 'react'

import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { DARK_BASEMAP } from '@winterop-com/sokkel-ui-maps/basemap'
import type { LngLat } from '@winterop-com/sokkel-ui-maps/geometry'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { PointLayer } from '@winterop-com/sokkel-ui-maps/PointLayer'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { Page } from './Page'

/** Towns on the coast and across the sea from it, by name. */
const TOWNS: Record<string, { name: string; at: LngLat }> = {
    bergen: { name: 'Bergen', at: [5.32, 60.39] },
    stavanger: { name: 'Stavanger', at: [5.73, 58.97] },
    alesund: { name: 'Ålesund', at: [6.15, 62.47] },
    lerwick: { name: 'Lerwick', at: [-1.15, 60.15] },
}

const towns: FeatureCollection<Point, { name: string }> = {
    type: 'FeatureCollection',
    features: Object.entries(TOWNS).map(([id, town]) => ({
        type: 'Feature',
        id,
        properties: { name: town.name },
        geometry: { type: 'Point', coordinates: town.at },
    })),
}

/** A map whose selection is held by a control outside its canvas, which a list beside a map would be. */
function Flights() {
    const [selected, setSelected] = useState<string | null>('bergen')
    return (
        <Page title="The coast" period="A town picked in the list is flown to">
            <MapView
                label="Towns on the coast"
                defaultBasemap={DARK_BASEMAP}
                basemaps={[DARK_BASEMAP]}
                fallbackBasemap={WORLD_BASEMAP}
                camera={{ center: [4.95, 60.42], zoom: 8.6 }}
                selected={selected}
                onSelectedChange={(id) => setSelected(id)}
                flyToSelected
                className="flex-1"
            >
                <PointLayer id="towns" data={towns} radius={6} glow label="name" />
                <MapOverlay corner="bottom-left">
                    <Segmented
                        label="Town"
                        value={selected ?? ''}
                        onValueChange={setSelected}
                        options={Object.entries(TOWNS).map(([id, town]) => ({ value: id, label: town.name }))}
                    />
                </MapOverlay>
            </MapView>
        </Page>
    )
}

/** A town seen close up on a map that leans as it is zoomed in. */
function Leaning() {
    return (
        <Page title="Bergen" period="Close up, the map leans toward the horizon">
            <MapView
                label="Bergen"
                defaultBasemap={DARK_BASEMAP}
                basemaps={[DARK_BASEMAP]}
                fallbackBasemap={WORLD_BASEMAP}
                camera={{ center: TOWNS.bergen.at, zoom: 12.4 }}
                pitchWithZoom
                className="flex-1"
            />
        </Page>
    )
}

const meta: Meta = { title: 'Maps/Camera', globals: { theme: 'dark' } }
export default meta

/**
 * `flyToSelected`: a town picked in the control at the foot of the map is a selection made outside
 * the map, and the camera flies to it, zooming out over the sea between and in again. A town already
 * in view is left where it is, and a town picked on the map itself is not flown to. A drag let go of
 * glides on and slows to a stop.
 */
export const FlyTo: StoryObj = { name: 'Fly to', render: () => <Flights /> }
/** `pitchWithZoom`: level from afar, the map leans further toward the horizon the closer it is zoomed in, here over a town's streets. */
export const Pitch: StoryObj = { name: 'Pitch', render: () => <Leaning /> }
