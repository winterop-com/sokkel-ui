import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature } from 'geojson'
import { useState } from 'react'

import { BoundaryLayer } from '../../components/map/BoundaryLayer'
import { MapLegend } from '../../components/map/MapLegend'
import { MapPopup } from '../../components/map/MapPopup'
import { MapOverlay, MapView } from '../../components/map/MapView'
import { PointLayer } from '../../components/map/PointLayer'
import { categoricalScale, classCounts, colorOf } from '../../components/map/scale'
import { NUMBER, places, regionName, regions, sites } from './data'
import { Page } from './Page'

const status = categoricalScale([
    { value: 'open', label: 'Open', color: 'var(--status-succeeded)' },
    { value: 'closed', label: 'Closed', color: 'var(--status-failed)' },
    { value: 'planned', label: 'Planned', color: 'var(--status-queued)' },
])

const statusOf = (place: Feature) => sites[String(place.id)]?.status
const bySize = {
    value: (place: Feature) => sites[String(place.id)]?.capacity,
    domain: [0, 800] as [number, number],
    range: [2.5, 14] as [number, number],
}
const tally = classCounts(
    status,
    places.features.map((place) => statusOf(place)),
)

const STATUS_WORDS = { open: 'Open', closed: 'Closed', planned: 'Planned' }

/** The site the status story opens on: the first open one in Bo. */
const OPEN = places.features.find((place) => statusOf(place) === 'open' && regionName[place.properties.region] === 'Bo')

function Status() {
    const [selected, setSelected] = useState<string | null>(OPEN === undefined ? null : String(OPEN.id))
    const place = places.features.find((feature) => String(feature.id) === selected)
    const site = selected === null ? undefined : sites[selected]
    return (
        <Page title="Sites" period="By status, November 2026">
            <MapView label="Sites by status" selected={selected} onSelectedChange={(id) => setSelected(id)} className="flex-1">
                <BoundaryLayer id="regions" data={regions} interactive={false} />
                <PointLayer id="sites" data={places} scale={status} value={statusOf} radius={4} />
                <MapOverlay corner="bottom-left">
                    <MapLegend
                        title="Status"
                        description={`${places.features.length} sites`}
                        scale={status}
                        shape="point"
                        counts={tally.counts}
                        className="w-44"
                    />
                </MapOverlay>
                {place !== undefined && site !== undefined && (
                    <MapPopup
                        feature={place as Feature}
                        title={place.properties.name}
                        description={`${regionName[place.properties.region]} region`}
                        rows={[
                            { label: 'Status', value: STATUS_WORDS[site.status], color: colorOf(status, site.status) ?? undefined },
                            { label: 'Capacity', value: site.capacity === null ? 'Not set' : `${NUMBER.format(site.capacity)} people` },
                        ]}
                        action={{ label: 'Open site', onClick: () => undefined }}
                        onClose={() => setSelected(null)}
                    />
                )}
            </MapView>
        </Page>
    )
}

function Sized({ cluster }: { cluster: boolean }) {
    return (
        <Page title="Capacity" period="People each site holds">
            <MapView label="Site capacity" className="flex-1">
                <BoundaryLayer id="regions" data={regions} interactive={false} />
                <PointLayer id="sites" data={places} color="var(--chart-1)" size={bySize} cluster={cluster} />
            </MapView>
        </Page>
    )
}

const meta: Meta = { title: 'Maps/Points' }
export default meta

/** Sites colored by status, with the count in each class and one site's popup open. */
export const Categorical: StoryObj = { name: 'Categories', render: () => <Status /> }
/** Sites sized by capacity, area growing with the value. */
export const SizedByValue: StoryObj = { name: 'Sized', render: () => <Sized cluster={false} /> }
/** The same sites gathered into counted clusters, which zoom in when clicked. */
export const Clustered: StoryObj = { name: 'Clustered', render: () => <Sized cluster /> }
