/** A map page: regions colored by a value on maplibre, sites as points, the legend and a popup for the region picked. */

import './styles.css'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { BoundaryLayer } from '@winterop-com/sokkel-ui-maps/BoundaryLayer'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapPopup } from '@winterop-com/sokkel-ui-maps/MapPopup'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { PointLayer } from '@winterop-com/sokkel-ui-maps/PointLayer'
import { sequentialScale } from '@winterop-com/sokkel-ui-maps/scale'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import type { Feature, FeatureCollection } from 'geojson'
import { Globe, ListChecks } from 'lucide-react'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

const GROUPS: RailGroup[] = [
    {
        id: 'work',
        entries: [
            { id: 'jobs', label: 'Jobs', icon: ListChecks, href: '#' },
            { id: 'sites', label: 'Sites', icon: Globe, href: '#', active: true },
        ],
    },
]

/** A region as a square, a degree on a side, from its southwest corner. */
const square = (id: string, name: string, west: number, south: number, runs: number): Feature => ({
    type: 'Feature',
    id,
    properties: { name, runs },
    geometry: {
        type: 'Polygon',
        coordinates: [
            [
                [west, south],
                [west + 1, south],
                [west + 1, south + 1],
                [west, south + 1],
                [west, south],
            ],
        ],
    },
})

const REGIONS: FeatureCollection = {
    type: 'FeatureCollection',
    features: [square('north', 'North', 10, 60, 120), square('east', 'East', 11, 59, 80), square('south', 'South', 10, 58, 45)],
}

const SITES: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        { type: 'Feature', id: 'harbor', properties: { name: 'Harbor' }, geometry: { type: 'Point', coordinates: [10.5, 60.5] } },
        { type: 'Feature', id: 'quay', properties: { name: 'Quay' }, geometry: { type: 'Point', coordinates: [11.5, 59.5] } },
    ],
}

const RUNS = sequentialScale({ breaks: [50, 75, 100], hue: 'var(--chart-2)' })
const runsOf = (region: Feature) => (region.properties as { runs: number }).runs

function App() {
    const [selected, setSelected] = useState<string | null>('north')
    const region = REGIONS.features.find((feature) => feature.id === selected)
    return (
        <TooltipProvider>
            <Shell
                rail={<Rail name="Tidevann" groups={GROUPS} foot={<AccountMenu name="ada" where="tidevann.example.org" />} />}
                top={<TopBar trail={[{ label: 'Sites', href: '#' }, { label: 'By region' }]} />}
            >
                <Page>
                    <PageHeader title="Runs by region" description="The last 30 days" />
                    <MapView label="Runs by region" selected={selected} onSelectedChange={(id) => setSelected(id)} className="flex-1">
                        <BoundaryLayer id="regions" data={REGIONS} scale={RUNS} value={runsOf} />
                        <PointLayer id="sites" data={SITES} />
                        <MapOverlay corner="bottom-left">
                            <MapLegend title="Runs" description="The last 30 days" scale={RUNS} captions={['Fewer', 'More']} />
                        </MapOverlay>
                        {region !== undefined && (
                            <MapPopup
                                feature={region}
                                title={String(region.properties?.name)}
                                rows={[{ label: 'Runs', value: String(runsOf(region)) }]}
                                onClose={() => setSelected(null)}
                            />
                        )}
                    </MapView>
                </Page>
            </Shell>
        </TooltipProvider>
    )
}

const root = document.getElementById('root')
if (root === null) throw new Error('No #root element')
createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
