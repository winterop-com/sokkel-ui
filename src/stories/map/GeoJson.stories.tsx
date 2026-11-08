import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { useState } from 'react'

import { GeoJsonLayer, geoJsonEntry } from '@winterop-com/sokkel-ui-maps/GeoJsonLayer'
import { MapLayerList } from '@winterop-com/sokkel-ui-maps/MapLayerList'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapPopup } from '@winterop-com/sokkel-ui-maps/MapPopup'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { categoricalScale } from '@winterop-com/sokkel-ui-maps/scale'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { Page } from './Page'

type Kind = 'park' | 'river' | 'road' | 'town'

interface Place {
    name: string
    kind: Kind
    /** The region it lies in, or the regions it crosses. */
    region: string
}

const place = (id: string, properties: Place, geometry: Geometry): Feature<Geometry, Place> => ({
    type: 'Feature',
    id,
    properties,
    geometry,
})

/**
 * Sierra Leone drawn plainly: four national parks as areas, three rivers and two highways as lines,
 * the ferry to Lungi as a line with its landing (one feature of two geometries), and eight towns as
 * points. The shapes are simplified by hand.
 */
const GEOGRAPHY: FeatureCollection<Geometry, Place> = {
    type: 'FeatureCollection',
    features: [
        place(
            'outamba-kilimi',
            { name: 'Outamba-Kilimi National Park', kind: 'park', region: 'Northern' },
            {
                type: 'Polygon',
                coordinates: [
                    [
                        [-12.45, 9.62],
                        [-12.15, 9.6],
                        [-12.05, 9.78],
                        [-12.2, 9.95],
                        [-12.42, 9.88],
                        [-12.45, 9.62],
                    ],
                ],
            },
        ),
        place(
            'loma-mountains',
            { name: 'Loma Mountains National Park', kind: 'park', region: 'Northern' },
            {
                type: 'Polygon',
                coordinates: [
                    [
                        [-11.2, 9.05],
                        [-11.0, 9.05],
                        [-10.95, 9.2],
                        [-11.08, 9.28],
                        [-11.22, 9.18],
                        [-11.2, 9.05],
                    ],
                ],
            },
        ),
        place(
            'gola',
            { name: 'Gola Rainforest National Park', kind: 'park', region: 'Eastern' },
            {
                type: 'Polygon',
                coordinates: [
                    [
                        [-11.05, 7.45],
                        [-10.8, 7.38],
                        [-10.62, 7.55],
                        [-10.68, 7.82],
                        [-10.95, 7.85],
                        [-11.08, 7.65],
                        [-11.05, 7.45],
                    ],
                ],
            },
        ),
        place(
            'western-area-peninsula',
            { name: 'Western Area Peninsula National Park', kind: 'park', region: 'Western Area' },
            {
                type: 'Polygon',
                coordinates: [
                    [
                        [-13.22, 8.42],
                        [-13.12, 8.43],
                        [-13.05, 8.33],
                        [-13.0, 8.22],
                        [-13.08, 8.15],
                        [-13.17, 8.25],
                        [-13.22, 8.42],
                    ],
                ],
            },
        ),
        place(
            'rokel',
            { name: 'Rokel River', kind: 'river', region: 'Northern, North West' },
            {
                type: 'LineString',
                coordinates: [
                    [-11.1, 9.55],
                    [-11.45, 9.3],
                    [-11.8, 9.0],
                    [-12.1, 8.8],
                    [-12.45, 8.68],
                    [-12.75, 8.6],
                    [-13.0, 8.55],
                ],
            },
        ),
        place(
            'sewa',
            { name: 'Sewa River', kind: 'river', region: 'Eastern, Southern' },
            {
                type: 'LineString',
                coordinates: [
                    [-10.95, 9.05],
                    [-11.2, 8.7],
                    [-11.5, 8.3],
                    [-11.7, 8.0],
                    [-11.95, 7.6],
                    [-12.2, 7.35],
                ],
            },
        ),
        place(
            'moa',
            { name: 'Moa River', kind: 'river', region: 'Eastern, Southern' },
            {
                type: 'LineString',
                coordinates: [
                    [-10.55, 8.5],
                    [-10.7, 8.15],
                    [-10.98, 7.9],
                    [-11.2, 7.5],
                    [-11.45, 7.1],
                ],
            },
        ),
        place(
            'freetown-kenema',
            { name: 'Freetown to Kenema highway', kind: 'road', region: 'Western Area, Southern, Eastern' },
            {
                type: 'LineString',
                coordinates: [
                    [-13.234, 8.484],
                    [-12.95, 8.4],
                    [-12.75, 8.35],
                    [-12.3, 8.2],
                    [-11.738, 7.964],
                    [-11.19, 7.877],
                ],
            },
        ),
        place(
            'masiaka-makeni',
            { name: 'Masiaka to Makeni highway', kind: 'road', region: 'North West, Northern' },
            {
                type: 'LineString',
                coordinates: [
                    [-12.75, 8.35],
                    [-12.5, 8.55],
                    [-12.3, 8.7],
                    [-12.044, 8.886],
                ],
            },
        ),
        place(
            'lungi-ferry',
            { name: 'Ferry to Lungi', kind: 'road', region: 'Western Area' },
            {
                type: 'GeometryCollection',
                geometries: [
                    {
                        type: 'LineString',
                        coordinates: [
                            [-13.22, 8.5],
                            [-13.21, 8.56],
                            [-13.195, 8.616],
                        ],
                    },
                    { type: 'Point', coordinates: [-13.195, 8.616] },
                ],
            },
        ),
        place('freetown', { name: 'Freetown', kind: 'town', region: 'Western Area' }, { type: 'Point', coordinates: [-13.234, 8.484] }),
        place('bo', { name: 'Bo', kind: 'town', region: 'Southern' }, { type: 'Point', coordinates: [-11.738, 7.964] }),
        place('kenema', { name: 'Kenema', kind: 'town', region: 'Eastern' }, { type: 'Point', coordinates: [-11.19, 7.877] }),
        place('makeni', { name: 'Makeni', kind: 'town', region: 'Northern' }, { type: 'Point', coordinates: [-12.044, 8.886] }),
        place('koidu', { name: 'Koidu', kind: 'town', region: 'Eastern' }, { type: 'Point', coordinates: [-10.971, 8.644] }),
        place('port-loko', { name: 'Port Loko', kind: 'town', region: 'North West' }, { type: 'Point', coordinates: [-12.787, 8.766] }),
        place('kabala', { name: 'Kabala', kind: 'town', region: 'Northern' }, { type: 'Point', coordinates: [-11.552, 9.589] }),
        place('bonthe', { name: 'Bonthe', kind: 'town', region: 'Southern' }, { type: 'Point', coordinates: [-12.505, 7.526] }),
    ],
}

const only = (...kinds: Kind[]): FeatureCollection<Geometry, Place> => ({
    type: 'FeatureCollection',
    features: GEOGRAPHY.features.filter((feature) => kinds.includes(feature.properties.kind)),
})

const PARKS = only('park')
const WATER_AND_ROADS = only('river', 'road')
const TOWNS = only('town')

const KIND_WORDS: Record<Kind, string> = { park: 'National park', river: 'River', road: 'Highway', town: 'Town' }

const kinds = categoricalScale([
    { value: 'park', label: 'National parks', color: 'var(--chart-3)' },
    { value: 'river', label: 'Rivers', color: 'var(--chart-2)' },
    { value: 'road', label: 'Highways and the ferry', color: 'var(--chart-4)' },
    { value: 'town', label: 'Towns', color: 'var(--chart-5)' },
])

const SHAPE: Record<Kind, 'area' | 'line' | 'point'> = { park: 'area', river: 'line', road: 'line', town: 'point' }

/** Every kind keyed in its color, each by the shape the map draws it as. */
const KIND_ENTRIES = kinds.categories.map((category) => geoJsonEntry(category.label, category.color, SHAPE[category.value as Kind]))

function Plain() {
    return (
        <Page title="Geography" period="Parks, rivers, highways and towns">
            <MapView label="Parks, rivers, highways and towns" className="flex-1">
                <GeoJsonLayer id="geography" data={GEOGRAPHY} />
                <MapOverlay corner="bottom-left">
                    <MapLegend
                        title="Geography"
                        entries={[
                            geoJsonEntry('National parks', 'var(--chart-1)', 'area'),
                            geoJsonEntry('Rivers and highways', 'var(--chart-1)', 'line'),
                            geoJsonEntry('Towns', 'var(--chart-1)', 'point'),
                        ]}
                    />
                </MapOverlay>
            </MapView>
        </Page>
    )
}

function ByKind() {
    return (
        <Page title="Geography" period="By kind">
            <MapView label="Parks, rivers, highways and towns by kind" className="flex-1">
                <GeoJsonLayer id="geography" data={GEOGRAPHY} scale={kinds} value="kind" />
                <MapOverlay corner="bottom-left">
                    <MapLegend title="Kind" entries={KIND_ENTRIES} />
                </MapOverlay>
            </MapView>
        </Page>
    )
}

/** The towns the Freetown to Kenema highway joins. */
const ON_THE_HIGHWAY = ['freetown', 'bo', 'kenema']

function Chosen() {
    const [selected, setSelected] = useState<string | null>('freetown-kenema')
    const feature = GEOGRAPHY.features.find((one) => one.id === selected)
    return (
        <Page title="Geography" period="One feature chosen">
            <MapView
                label="Parks, rivers, highways and towns"
                selected={selected}
                onSelectedChange={(id) => setSelected(id)}
                className="flex-1"
            >
                <GeoJsonLayer
                    id="geography"
                    data={GEOGRAPHY}
                    color="var(--muted-foreground)"
                    highlighted={selected === 'freetown-kenema' ? ON_THE_HIGHWAY : []}
                />
                <MapOverlay corner="bottom-left">
                    <MapLegend
                        entries={[
                            geoJsonEntry('Chosen', 'var(--map-selection)', 'line'),
                            geoJsonEntry('Towns on it', 'var(--map-highlight)', 'point'),
                            geoJsonEntry('Everything else', 'var(--muted-foreground)', 'area'),
                        ]}
                    />
                </MapOverlay>
                {feature !== undefined && (
                    <MapPopup
                        feature={feature}
                        title={feature.properties.name}
                        description={KIND_WORDS[feature.properties.kind]}
                        rows={[{ label: feature.properties.region.includes(',') ? 'Regions' : 'Region', value: feature.properties.region }]}
                        onClose={() => setSelected(null)}
                    />
                )}
            </MapView>
        </Page>
    )
}

type LayerId = 'towns' | 'lines' | 'parks'

function Panel() {
    const [shown, setShown] = useState<Record<LayerId, boolean>>({ towns: true, lines: true, parks: true })
    const [opacity, setOpacity] = useState<Record<LayerId, number>>({ towns: 1, lines: 1, parks: 1 })
    return (
        <Stack gap="none" className="h-svh bg-background text-foreground">
            <SplitPane
                defaultShare={0.74}
                minShare={0.5}
                maxShare={0.85}
                first={
                    <MapView label="Parks, rivers, highways and towns as layers" framed={false}>
                        <GeoJsonLayer id="parks" data={PARKS} color="var(--chart-3)" visible={shown.parks} opacity={opacity.parks} />
                        <GeoJsonLayer
                            id="lines"
                            data={WATER_AND_ROADS}
                            scale={kinds}
                            value="kind"
                            visible={shown.lines}
                            opacity={opacity.lines}
                        />
                        <GeoJsonLayer id="towns" data={TOWNS} color="var(--chart-5)" visible={shown.towns} opacity={opacity.towns} />
                    </MapView>
                }
                second={
                    <Stack gap="sm" className="p-4">
                        <PageHeader title="Geography" description="Three GeoJSON layers" />
                        <MapLayerList
                            layers={[
                                {
                                    id: 'towns',
                                    name: 'Towns',
                                    description: 'Points',
                                    visible: shown.towns,
                                    opacity: opacity.towns,
                                    legend: <MapLegend entries={[geoJsonEntry('Town', 'var(--chart-5)', 'point')]} framed={false} />,
                                },
                                {
                                    id: 'lines',
                                    name: 'Rivers and highways',
                                    description: 'Lines, by kind',
                                    visible: shown.lines,
                                    opacity: opacity.lines,
                                    legend: <MapLegend entries={KIND_ENTRIES.slice(1, 3)} framed={false} />,
                                },
                                {
                                    id: 'parks',
                                    name: 'National parks',
                                    description: 'Areas',
                                    visible: shown.parks,
                                    opacity: opacity.parks,
                                    legend: (
                                        <MapLegend entries={[geoJsonEntry('National park', 'var(--chart-3)', 'area')]} framed={false} />
                                    ),
                                },
                            ]}
                            onVisibleChange={(id, visible) => setShown((previous) => ({ ...previous, [id]: visible }))}
                            onOpacityChange={(id, next) => setOpacity((previous) => ({ ...previous, [id]: next }))}
                        />
                    </Stack>
                }
            />
        </Stack>
    )
}

const meta: Meta = { title: 'Maps/GeoJSON' }
export default meta

/** Parks as areas, rivers and highways as lines and towns as points, all from one collection in one color. */
export const OneColor: StoryObj = { name: 'One color', render: () => <Plain /> }

/** The same collection colored by each feature's `kind`, and keyed in the legend by the shape each kind is drawn as. */
export const ByProperty: StoryObj = { name: 'By property', render: () => <ByKind /> }

/**
 * The Freetown to Kenema highway chosen, in the selection color with its popup halfway along it, and
 * the towns it joins highlighted. A click chooses another feature; the ferry to Lungi is one feature
 * of a line and its landing.
 */
export const WithPopup: StoryObj = { name: 'Popup', render: () => <Chosen /> }

/**
 * Parks, waters and highways, and towns as three layers beside a panel that shows, hides and fades
 * each, with its legend, the map and the panel sharing a split.
 */
export const LayerPanel: StoryObj = { name: 'Layer panel', render: () => <Panel /> }
