import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature } from 'geojson'
import { useState } from 'react'

import { BoundaryLayer } from '@winterop-com/sokkel-ui-maps/BoundaryLayer'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapPopup } from '@winterop-com/sokkel-ui-maps/MapPopup'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { PointLayer } from '@winterop-com/sokkel-ui-maps/PointLayer'
import { colorOf, sequentialScale } from '@winterop-com/sokkel-ui-maps/scale'
import { NUMBER, hexagons, manySites, regions } from './data'
import { Page } from './Page'

const reach = sequentialScale({ breaks: [20, 40, 60, 80], hue: 'var(--chart-2)', format: (value) => `${value}%` })
const reachedOf = (cell: Feature) => (cell.properties as { reached?: number } | null)?.reached

function Cells({ open }: { open: string | null }) {
    const cells = hexagons()
    const [selected, setSelected] = useState<string | null>(open)
    const cell = cells.features.find((feature) => feature.id === selected)
    return (
        <Page title="Households reached" period={`${NUMBER.format(cells.features.length)} cells, November 2026`}>
            <MapView label="Households reached by cell" selected={selected} onSelectedChange={(id) => setSelected(id)} className="flex-1">
                <BoundaryLayer id="cells" data={cells} scale={reach} value={reachedOf} />
                <BoundaryLayer id="regions" data={regions} interactive={false} opacity={0.6} label="name" />
                <MapOverlay corner="bottom-left">
                    <MapLegend title="Households reached" description="Share in each cell" scale={reach} captions={['Few', 'Most']} />
                </MapOverlay>
                {cell !== undefined && (
                    <MapPopup
                        feature={cell as Feature}
                        title={cell.properties.name}
                        description="Cell"
                        rows={[
                            {
                                label: 'Households reached',
                                value: `${cell.properties.reached}%`,
                                color: colorOf(reach, cell.properties.reached) ?? undefined,
                            },
                        ]}
                        onClose={() => setSelected(null)}
                    />
                )}
            </MapView>
        </Page>
    )
}

function Labelled() {
    const cells = hexagons()
    return (
        <Page title="Cells" period={`${NUMBER.format(cells.features.length)} cells, named where there is room`}>
            <MapView label="Cells by name" className="flex-1">
                <BoundaryLayer id="cells" data={cells} label="name" simplify />
            </MapView>
        </Page>
    )
}

function Sites() {
    const sites = manySites()
    return (
        <Page title="Sites" period={`${NUMBER.format(sites.features.length)} sites, gathered by place`}>
            <MapView label="Sites" className="flex-1">
                <BoundaryLayer id="regions" data={regions} interactive={false} label="name" />
                <PointLayer id="sites" data={sites} color="var(--chart-1)" radius={3} cluster />
            </MapView>
        </Page>
    )
}

const meta: Meta = { title: 'Maps/At scale' }
export default meta

/** Some six thousand cells colored by the share of households reached, with the regions named over them where they fit. */
export const ManyCells: StoryObj = { name: 'Many areas', render: () => <Cells open={null} /> }
/** Every cell named, with the names that would collide left out until the map zooms in. */
export const NamedCells: StoryObj = { name: 'Named areas', render: () => <Labelled /> }
/** One cell of thousands selected, with its popup open. */
export const SelectedCell: StoryObj = { name: 'Selected area', render: () => <Cells open="100-040" /> }
/** Twenty thousand sites gathered into counted clusters, which zoom in when clicked. */
export const ManySites: StoryObj = { name: 'Many points', render: () => <Sites /> }
