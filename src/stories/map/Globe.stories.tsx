import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature } from 'geojson'

import { BLANK_BASEMAP, SATELLITE_BASEMAP, type Basemap } from '../../components/map/basemap'
import { BoundaryLayer } from '../../components/map/BoundaryLayer'
import { MapLegend } from '../../components/map/MapLegend'
import { MapOverlay, MapView } from '../../components/map/MapView'
import { sequentialScale } from '../../components/map/scale'
import { figures, regions } from './data'
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

const meta: Meta = { title: 'Maps/Globe' }
export default meta

/** The globe in satellite imagery over a starfield, with a graticule. */
export const Satellite: StoryObj = { name: 'Satellite', render: () => <Globe basemap={SATELLITE_BASEMAP} /> }
/** The globe on the blank ground, which reaches no network. */
export const Blank: StoryObj = { name: 'Blank', render: () => <Globe basemap={BLANK_BASEMAP} /> }
