import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature } from 'geojson'

import { MapLegend } from '../../components/map/MapLegend'
import { categoricalScale, classCounts, divergingScale, sequentialScale } from '../../components/map/scale'
import { figures, places, regions, sites } from './data'
import { Row } from '../../components/Layout'

const density = sequentialScale({ breaks: [50, 75, 100, 125], hue: 'var(--chart-2)' })
const rainfall = sequentialScale({ breaks: [100, 200, 300, 400, 500, 600], hue: 'var(--chart-2)' })
const change = divergingScale({
    breaks: [-10, -5, -1, 1, 5, 10],
    low: 'var(--chart-5)',
    high: 'var(--chart-2)',
    format: (value) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)}`,
})
const status = categoricalScale([
    { value: 'open', label: 'Open', color: 'var(--status-succeeded)' },
    { value: 'closed', label: 'Closed', color: 'var(--status-failed)' },
    { value: 'planned', label: 'Planned', color: 'var(--status-queued)' },
])
const land = categoricalScale([
    { value: 'forest', label: 'Forest' },
    { value: 'farmland', label: 'Farmland' },
    { value: 'grassland', label: 'Grassland' },
    { value: 'wetland', label: 'Wetland' },
    { value: 'built', label: 'Built up' },
])

const regionValues = (read: (region: Feature) => unknown) => regions.features.map((region) => read(region))
const densities = classCounts(
    density,
    regionValues((region) => figures[String(region.id)]?.density),
)
const changes = classCounts(
    change,
    regionValues((region) => figures[String(region.id)]?.change),
)
const statuses = classCounts(
    status,
    places.features.map((place) => sites[String(place.id)]?.status),
)

/** Every kind of legend, each in its own card, over the page ground. */
function Legends() {
    return (
        <Row gap="lg" align="start" wrap>
            <MapLegend
                title="Population density"
                description="People per square kilometer"
                scale={density}
                captions={['Sparse', 'Dense']}
            />
            <MapLegend
                title="Population density"
                description="Regions in each class"
                scale={density}
                layout="list"
                counts={densities.counts}
            />
            <MapLegend
                title="Population change"
                description="Percent, 2025 against 2015"
                scale={change}
                captions={['Fewer people', 'More people']}
                noData="Not counted in 2015"
                className="w-60"
            />
            <MapLegend
                title="Population change"
                description="Regions in each class"
                scale={change}
                layout="list"
                counts={changes.counts}
                noData="Not counted in 2015"
                noDataCount={changes.noData}
            />
            <MapLegend title="Rainfall" description="Millimeters in the month" scale={rainfall} className="w-64" />
            <MapLegend
                title="Site status"
                scale={status}
                shape="point"
                counts={statuses.counts}
                noData
                noDataCount={statuses.noData}
                className="w-44"
            />
            <MapLegend title="Land cover" scale={land} />
        </Row>
    )
}

const meta: Meta = { title: 'Maps/Legends', parameters: { frame: 'padded' } }
export default meta

/** Categorical, sequential and diverging legends, as ramps and as lists with counts and no data. */
export const All: StoryObj = { name: 'Legends', render: () => <Legends /> }
