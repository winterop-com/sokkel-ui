import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { useState } from 'react'

import { BLANK_BASEMAP, DARK_BASEMAP, SATELLITE_BASEMAP, type Basemap } from '@winterop-com/sokkel-ui-maps/basemap'
import { BoundaryLayer } from '@winterop-com/sokkel-ui-maps/BoundaryLayer'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapPopup } from '@winterop-com/sokkel-ui-maps/MapPopup'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { PointLayer, type PointSize } from '@winterop-com/sokkel-ui-maps/PointLayer'
import { sequentialScale } from '@winterop-com/sokkel-ui-maps/scale'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { NUMBER, figures, regions } from './data'
import cityFixture from './fixtures/cities.json'
import { Page } from './Page'

const density = sequentialScale({ breaks: [50, 75, 100, 125], hue: 'var(--chart-2)' })
const densityOf = (region: Feature) => figures[String(region.id)]?.density

/** The globe from space, with a graticule, and the regions colored where they sit on it. */
function Globe({ basemap }: { basemap: Basemap }) {
    return (
        <Page title="The globe" period="A projection, not a flat map">
            <MapView
                label="Regions on the globe"
                projection="globe"
                graticule
                defaultBasemap={basemap}
                camera={{ center: [-8, 9], zoom: 1.6 }}
                className="flex-1"
            >
                <BoundaryLayer id="regions" data={regions} scale={density} value={densityOf} />
                <MapOverlay corner="bottom-left">
                    <MapLegend title="Population density" description="People per square kilometer" scale={density} />
                </MapOverlay>
            </MapView>
        </Page>
    )
}

/** Some five hundred of the world's cities from Natural Earth, each with its country and the people living there. */
const cities = cityFixture as unknown as FeatureCollection<Point, { name: string; country: string; population: number }>

/** A city's light grows with the people living there, up to the largest city's. */
const LIGHT: PointSize = { value: 'population', domain: [0, 36_000_000], range: [1.6, 7] }

/** The world's cities as lights on the dark globe; a click flies to one and opens its card. */
function Cities({ picked = null }: { picked?: string | null }) {
    const [selected, setSelected] = useState<string | null>(picked)
    const city = cities.features.find((each) => each.id === selected)
    return (
        <Page title="The globe" period="The world's cities as lights">
            <MapView
                label="The world's cities"
                defaultProjection="globe"
                defaultBasemap={DARK_BASEMAP}
                basemaps={[DARK_BASEMAP]}
                fallbackBasemap={WORLD_BASEMAP}
                camera={{ center: [14, 30], zoom: 1.8 }}
                controls={{ projection: true }}
                selected={selected}
                onSelectedChange={(id) => setSelected(id)}
                flyToSelected={{ picks: true, zoom: 2.8 }}
                className="flex-1"
            >
                <PointLayer id="cities" data={cities} color="var(--chart-3)" size={LIGHT} glow label="name" />
                {city !== undefined && (
                    <MapPopup
                        feature={city}
                        title={city.properties.name}
                        description={city.properties.country}
                        rows={[{ label: 'People', value: NUMBER.format(city.properties.population) }]}
                        onClose={() => setSelected(null)}
                    />
                )}
            </MapView>
        </Page>
    )
}

const meta: Meta = { title: 'Maps/Globe' }
export default meta

/** The globe in satellite imagery over a starfield, with a graticule. */
export const Satellite: StoryObj = { name: 'Satellite', render: () => <Globe basemap={SATELLITE_BASEMAP} /> }
/** The globe on the blank ground, which reaches no network. */
export const Blank: StoryObj = { name: 'Blank', render: () => <Globe basemap={BLANK_BASEMAP} /> }
/**
 * Some five hundred cities as lights on the dark street map's globe, each sized by the people living
 * there and the largest named as far as their names fit, more as the globe is zoomed in. The name of
 * the city under the cursor is written whatever else is; a click picks a city and flies to it, and
 * nothing is picked by the globe coming to rest. The control at the top right rolls the globe out
 * flat and back.
 */
export const Lights: StoryObj = { name: 'Cities', globals: { theme: 'dark' }, render: () => <Cities /> }
/** One city picked: its light in the selection color, its name marked, and its card over it. */
export const Picked: StoryObj = { name: 'Selected', globals: { theme: 'dark' }, render: () => <Cities picked="nairobi-ken" /> }
