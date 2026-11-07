import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature } from 'geojson'
import { useState } from 'react'

import { STREETS_BASEMAP } from '@winterop-com/sokkel-ui-maps/basemap'
import { BoundaryLayer } from '@winterop-com/sokkel-ui-maps/BoundaryLayer'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapPopup } from '@winterop-com/sokkel-ui-maps/MapPopup'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { colorOf, divergingScale, sequentialScale } from '@winterop-com/sokkel-ui-maps/scale'
import { NUMBER, figures, regionName, regions } from './data'
import { Page } from './Page'

const density = sequentialScale({ breaks: [50, 75, 100, 125], hue: 'var(--chart-2)' })

const change = divergingScale({
    breaks: [-10, -5, -1, 1, 5, 10],
    low: 'var(--chart-5)',
    high: 'var(--chart-2)',
    format: (value) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)}`,
})

const densityOf = (region: Feature) => figures[String(region.id)]?.density
const changeOf = (region: Feature) => figures[String(region.id)]?.change

function Density({ open }: { open: string | null }) {
    const [selected, setSelected] = useState<string | null>(open)
    const region = regions.features.find((feature) => feature.id === selected)
    const known = selected === null ? undefined : figures[selected]
    return (
        <Page title="Population density" period="By region, 2025">
            <MapView label="Population density by region" selected={selected} onSelectedChange={(id) => setSelected(id)} className="flex-1">
                <BoundaryLayer id="regions" data={regions} scale={density} value={densityOf} />
                <MapOverlay corner="bottom-left">
                    <MapLegend
                        title="Population density"
                        description="People per square kilometer"
                        scale={density}
                        captions={['Sparse', 'Dense']}
                    />
                </MapOverlay>
                {region !== undefined && known !== undefined && (
                    <MapPopup
                        feature={region as Feature}
                        title={regionName[String(region.id)]}
                        description="Region"
                        rows={[
                            {
                                label: 'People per km²',
                                value: NUMBER.format(known.density),
                                color: colorOf(density, known.density) ?? undefined,
                            },
                            { label: 'Population', value: NUMBER.format(known.population) },
                            { label: 'Area', value: `${NUMBER.format(known.area)} km²` },
                        ]}
                        action={{ label: 'Open region', onClick: () => undefined }}
                        onClose={() => setSelected(null)}
                    />
                )}
            </MapView>
        </Page>
    )
}

function Change() {
    return (
        <Page title="Population change" period="2025 against 2015">
            <MapView label="Population change by region" className="flex-1">
                <BoundaryLayer id="regions" data={regions} scale={change} value={changeOf} />
                <MapOverlay corner="bottom-left">
                    <MapLegend
                        title="Population change"
                        description="Percent, 2025 against 2015"
                        scale={change}
                        captions={['Fewer people', 'More people']}
                        noData="Not counted in 2015"
                        className="w-60"
                    />
                </MapOverlay>
            </MapView>
        </Page>
    )
}

function Boundaries() {
    return (
        <Page title="Regions" period="Thirteen regions">
            <MapView
                label="Region boundaries"
                defaultBasemap={STREETS_BASEMAP}
                defaultSelected={regions.features[0].id as string}
                className="flex-1"
            >
                <BoundaryLayer id="regions" data={regions} />
            </MapView>
        </Page>
    )
}

const meta: Meta = { title: 'Maps/Choropleth' }
export default meta

/** Population density by region, with one region selected and its popup open. */
export const WithPopup: StoryObj = { name: 'Popup', render: () => <Density open={regions.features[0].id as string} /> }
export const Sequential: StoryObj = { name: 'Sequential', render: () => <Density open={null} /> }
/** Population change in two hues out from a neutral class, with one region hatched for no data. */
export const Diverging: StoryObj = { name: 'Diverging', render: () => <Change /> }
/** Plain boundaries without a scale over the streets basemap, one region selected. */
export const Plain: StoryObj = { name: 'Boundaries', render: () => <Boundaries /> }
