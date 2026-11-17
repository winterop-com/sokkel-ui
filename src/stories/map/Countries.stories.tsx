import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature } from 'geojson'
import { useState } from 'react'

import { CountryLayer } from '@winterop-com/sokkel-ui-maps/CountryLayer'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapPopup } from '@winterop-com/sokkel-ui-maps/MapPopup'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { colorOf, sequentialScale } from '@winterop-com/sokkel-ui-maps/scale'
import { useWorld, WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { NUMBER } from './data'
import { Page } from './Page'

/** Tidevann's runs in October by the country of the site each ran from, by country code. */
const RUNS: Record<string, number> = {
    NOR: 1240,
    SWE: 860,
    DNK: 410,
    FIN: 380,
    DEU: 1520,
    FRA: 990,
    GBR: 1310,
    NLD: 520,
    ESP: 610,
    ITA: 470,
    POL: 300,
    USA: 2480,
    CAN: 640,
    MEX: 280,
    BRA: 720,
    ARG: 190,
    JPN: 560,
    KOR: 240,
    IND: 390,
    AUS: 430,
    ZAF: 210,
    KEN: 120,
}

const runs = sequentialScale({ breaks: [250, 500, 1000, 2000], hue: 'var(--chart-2)', format: (value) => NUMBER.format(value) })

/** Runs by country over the world, the countries with none hatched, and the map exported as a PNG from its controls. */
function ByCountry({ open }: { open: string | null }) {
    const [selected, setSelected] = useState<string | null>(open)
    const world = useWorld()
    const country = world?.features.find((feature) => feature.id === selected)
    const count = selected === null ? undefined : RUNS[selected]
    return (
        <Page title="Runs by country" period="October">
            <MapView
                label="Runs by country"
                defaultBasemap={WORLD_BASEMAP}
                basemaps={[WORLD_BASEMAP]}
                controls={{ export: true }}
                file="runs-by-country"
                selected={selected}
                onSelectedChange={(id) => setSelected(id)}
                className="flex-1"
            >
                <CountryLayer id="countries" values={RUNS} scale={runs} />
                <MapOverlay corner="bottom-left">
                    <MapLegend title="Runs" description="October" scale={runs} captions={['Fewer', 'More']} noData="No runs" />
                </MapOverlay>
                {country !== undefined && (
                    <MapPopup
                        feature={country as Feature}
                        title={country.properties.name}
                        description="Country"
                        rows={[
                            {
                                label: 'Runs',
                                value: count === undefined ? 'None' : NUMBER.format(count),
                                color: colorOf(runs, count) ?? undefined,
                            },
                        ]}
                        onClose={() => setSelected(null)}
                    />
                )}
            </MapView>
        </Page>
    )
}

/** Only the countries with runs, the rest left to the basemap. */
function OnlyValued() {
    return (
        <Page title="Runs by country" period="October, countries with runs">
            <MapView
                label="Runs by country, countries with runs only"
                defaultBasemap={WORLD_BASEMAP}
                basemaps={[WORLD_BASEMAP]}
                className="flex-1"
            >
                <CountryLayer id="countries" values={RUNS} scale={runs} unvalued="hidden" />
                <MapOverlay corner="bottom-left">
                    <MapLegend title="Runs" description="October" scale={runs} captions={['Fewer', 'More']} />
                </MapOverlay>
            </MapView>
        </Page>
    )
}

/**
 * Countries filled from the world geometry the maps package carries, Natural Earth's 1:110m
 * countries, loaded the first time a layer draws them, over the World basemap drawn from the same
 * geometry, so none of these maps reaches the network.
 */
const meta: Meta = { title: 'Maps/Countries' }
export default meta

/** Runs by country in one hue, the countries with none hatched, and an export button among the controls. */
export const Countries: StoryObj = { name: 'Countries', render: () => <ByCountry open={null} /> }
/** One country selected, with its popup open. */
export const Selected: StoryObj = { name: 'Selected', render: () => <ByCountry open="NOR" /> }
/** Only the countries with runs drawn, the rest left to the basemap. */
export const Valued: StoryObj = { name: 'Only valued', render: () => <OnlyValued /> }
