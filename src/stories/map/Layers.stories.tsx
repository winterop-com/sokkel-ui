import { PageHeader } from '../../components/PageHeader'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature } from 'geojson'
import { useState } from 'react'

import { BASEMAPS, SCHEME_BASEMAPS, resolveBasemap, type Basemap, type SchemeBasemaps } from '../../components/map/basemap'
import { BoundaryLayer } from '../../components/map/BoundaryLayer'
import type { LngLat } from '../../components/map/geometry'
import { GridLayer, gridValueAt } from '../../components/map/GridLayer'
import { MapLayerList } from '../../components/map/MapLayerList'
import { MapLegend } from '../../components/map/MapLegend'
import { MapPopup } from '../../components/map/MapPopup'
import { MapView } from '../../components/map/MapView'
import { PeriodSlider } from '../../components/map/PeriodSlider'
import { PointLayer } from '../../components/map/PointLayer'
import { categoricalScale, classLabels, classOf, colorOf, sequentialScale } from '../../components/map/scale'
import { useDark } from '../../hooks/use-dark'
import { MONTHS, NUMBER, places, rainfall, regions, sites } from './data'

const wet = sequentialScale({ breaks: [100, 200, 300, 400, 500, 600], hue: 'var(--chart-2)' })
const status = categoricalScale([
    { value: 'open', label: 'Open', color: 'var(--status-succeeded)' },
    { value: 'closed', label: 'Closed', color: 'var(--status-failed)' },
    { value: 'planned', label: 'Planned', color: 'var(--status-queued)' },
])
const statusOf = (place: Feature) => sites[String(place.id)]?.status

type LayerId = 'rainfall' | 'sites' | 'regions'

/**
 * Monthly rainfall on a grid, with sites and region outlines over it: the layers in a panel
 * beside the map, each shown or hidden and faded on its own, and the month chosen below the map.
 * A click reads the rainfall where it lands.
 */
function Rainfall() {
    const dark = useDark()
    const [month, setMonth] = useState('2025-08')
    const [basemap, setBasemap] = useState<Basemap | SchemeBasemaps>(SCHEME_BASEMAPS)
    const [basemapVisible, setBasemapVisible] = useState(true)
    const [basemapOpacity, setBasemapOpacity] = useState(1)
    const [shown, setShown] = useState<Record<LayerId, boolean>>({ rainfall: true, sites: true, regions: true })
    const [opacity, setOpacity] = useState<Record<LayerId, number>>({ rainfall: 0.85, sites: 1, regions: 1 })
    const [reading, setReading] = useState<LngLat | null>([-11.75, 8.45])
    const grid = rainfall[month]
    const period = MONTHS.find((candidate) => candidate.id === month)?.label ?? month
    const value = reading === null ? null : gridValueAt(grid, reading)
    const drawn = resolveBasemap(basemap, dark)
    return (
        <div className="flex min-h-svh flex-col gap-3 bg-background p-4 text-foreground md:h-svh md:flex-row md:gap-4 md:p-6">
            <div className="md:hidden">
                <PageHeader title="Rainfall" description="Monthly totals, 2025" />
            </div>
            <aside className="order-2 flex shrink-0 flex-col gap-2 md:order-1 md:w-72 md:overflow-y-auto">
                <div className="hidden md:block">
                    <PageHeader title="Rainfall" description="Monthly totals, 2025" />
                </div>
                <MapLayerList
                    layers={[
                        {
                            id: 'sites',
                            name: 'Sites',
                            description: 'By status',
                            visible: shown.sites,
                            opacity: opacity.sites,
                            legend: <MapLegend scale={status} shape="point" framed={false} />,
                        },
                        { id: 'regions', name: 'Regions', description: 'Boundaries', visible: shown.regions, opacity: opacity.regions },
                        {
                            id: 'rainfall',
                            name: 'Rainfall',
                            description: `Millimeters, ${period}`,
                            visible: shown.rainfall,
                            opacity: opacity.rainfall,
                            legend: <MapLegend scale={wet} framed={false} />,
                        },
                    ]}
                    onVisibleChange={(id, visible) => setShown((previous) => ({ ...previous, [id]: visible }))}
                    onOpacityChange={(id, next) => setOpacity((previous) => ({ ...previous, [id]: next }))}
                    basemap={{
                        basemaps: BASEMAPS,
                        value: drawn.id,
                        onValueChange: (id) => setBasemap(BASEMAPS.find((option) => option.id === id) ?? SCHEME_BASEMAPS),
                        visible: basemapVisible,
                        onVisibleChange: setBasemapVisible,
                        opacity: basemapOpacity,
                        onOpacityChange: setBasemapOpacity,
                    }}
                />
            </aside>
            <div className="order-1 flex h-[34rem] flex-col gap-3 md:order-2 md:h-auto md:min-h-0 md:flex-1">
                <MapView
                    label="Monthly rainfall"
                    basemap={basemap}
                    onBasemapChange={setBasemap}
                    basemapVisible={basemapVisible}
                    basemapOpacity={basemapOpacity}
                    onMapClick={setReading}
                    className="min-h-0 flex-1"
                >
                    <GridLayer id="rainfall" grid={grid} scale={wet} visible={shown.rainfall} opacity={opacity.rainfall} />
                    <BoundaryLayer id="regions" data={regions} visible={shown.regions} opacity={opacity.regions} interactive={false} />
                    <PointLayer
                        id="sites"
                        data={places}
                        scale={status}
                        value={statusOf}
                        radius={3}
                        visible={shown.sites}
                        opacity={opacity.sites}
                    />
                    {reading !== null && shown.rainfall && (
                        <MapPopup
                            at={reading}
                            title={value === null ? 'No reading' : `${NUMBER.format(value)} mm`}
                            description={`Rainfall, ${period}`}
                            rows={[
                                {
                                    label: 'Position',
                                    value: `${Math.abs(reading[1]).toFixed(2)}° ${reading[1] < 0 ? 'S' : 'N'}, ${Math.abs(reading[0]).toFixed(2)}° ${reading[0] < 0 ? 'W' : 'E'}`,
                                },
                                ...(value === null
                                    ? []
                                    : [
                                          {
                                              label: 'Class',
                                              value: classLabels(wet)[classOf(wet, value) ?? 0],
                                              color: colorOf(wet, value) ?? undefined,
                                          },
                                      ]),
                            ]}
                            onClose={() => setReading(null)}
                        />
                    )}
                </MapView>
                <PeriodSlider label="Rainfall month" periods={MONTHS} value={month} onValueChange={setMonth} />
            </div>
        </div>
    )
}

/** The period slider on its own, partway through a year of months. */
function Slider() {
    const [month, setMonth] = useState('2025-04')
    return <PeriodSlider label="Rainfall month" periods={MONTHS} value={month} onValueChange={setMonth} className="max-w-xl" />
}

const meta: Meta = { title: 'Maps/Layers', parameters: { frame: 'padded' } }
export default meta

/**
 * Monthly rainfall on a five-kilometer grid under sites and region outlines, with each layer shown,
 * hidden and faded from the panel, the basemap chosen there too, the month chosen below the map,
 * and the rainfall read where the map is clicked.
 */
export const LayerPanel: StoryObj = { parameters: { frame: 'none' }, name: 'Layer panel', render: () => <Rainfall /> }

/** Steps through the months, with buttons for the month before and after and a play button. */
export const Period: StoryObj = { name: 'Period slider', render: () => <Slider /> }
