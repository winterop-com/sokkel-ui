import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { DARK_BASEMAP, type Basemap } from '@winterop-com/sokkel-ui-maps/basemap'
import { CoverageLayer, type RangeRings, type SensorCone } from '@winterop-com/sokkel-ui-maps/CoverageLayer'
import { arc } from '@winterop-com/sokkel-ui-maps/geodesy'
import type { LngLat } from '@winterop-com/sokkel-ui-maps/geometry'
import { LinkLayer, type MapLink } from '@winterop-com/sokkel-ui-maps/LinkLayer'
import { MapView, type MapCamera } from '@winterop-com/sokkel-ui-maps/MapView'
import type { MapTone } from '@winterop-com/sokkel-ui-maps/tone'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { ZoneLayer, type Zone } from '@winterop-com/sokkel-ui-maps/ZoneLayer'
import { Page } from './Page'

/** A map filling the page under its title, over one basemap, with the World basemap in its place when the tiles cannot be had. */
function Scene({
    title,
    description,
    camera,
    basemap,
    children,
}: {
    title: string
    description: string
    camera: MapCamera
    basemap: Basemap
    children: ReactNode
}) {
    return (
        <Page title={title} period={description}>
            <MapView
                label={title}
                defaultBasemap={basemap}
                basemaps={[basemap]}
                fallbackBasemap={WORLD_BASEMAP}
                camera={camera}
                className="flex-1"
            >
                {children}
            </MapView>
        </Page>
    )
}

/** A stretch of West African coast, where the dark basemap's tiles are recorded for the stories. */
const COAST_CAMERA: MapCamera = { center: [-10.4, 5.9], zoom: 6.4 }

/** Tidevann's three coastal stations, harbor, juniper and larkspur, and its inland site. */
const STATIONS: Record<'harbor' | 'juniper' | 'larkspur' | 'inland', LngLat> = {
    harbor: [-10.8, 6.31],
    juniper: [-11.37, 6.75],
    larkspur: [-9.04, 5.01],
    inland: [-9.6, 7.05],
}

/** Each coastal station's radar a wedge out to sea, and the inland site's a whole circle. */
const RADARS: SensorCone[] = [
    { id: 'radar-harbor', position: STATIONS.harbor, bearing: 215, width: 150, range: 170_000, tone: 'friend' },
    { id: 'radar-juniper', position: STATIONS.juniper, bearing: 230, width: 120, range: 140_000, tone: 'friend' },
    { id: 'radar-larkspur', position: STATIONS.larkspur, bearing: 200, width: 130, range: 160_000, tone: 'friend' },
    { id: 'radar-inland', position: STATIONS.inland, range: 120_000, tone: 'neutral' },
]

/** Rings round the inland site every 40 km, written on its south side. */
const INLAND_RINGS: RangeRings = { id: 'inland-rings', position: STATIONS.inland, distances: [40_000, 80_000, 120_000], labelBearing: 160 }

/** The coast's watched areas: a restricted water, an exercise area, a patrol box and an anchorage. */
const COAST_ZONES: Zone[] = [
    {
        id: 'restricted',
        label: 'Restricted water',
        tone: 'hostile',
        area: [
            [-12.6, 5.75],
            [-11.5, 4.95],
            [-10.95, 5.65],
            [-11.95, 6.45],
        ],
    },
    {
        id: 'exercise',
        label: 'Exercise area',
        tone: 'unknown',
        fill: 'hatched',
        area: [
            [-10.7, 3.9],
            [-9.2, 3.9],
            [-9.2, 4.95],
            [-10.7, 4.95],
        ],
    },
    {
        id: 'patrol',
        label: 'Patrol box',
        tone: 'friend',
        edge: 'dashed',
        fill: 'none',
        area: [
            [-13.2, 3.9],
            [-11.7, 3.9],
            [-11.7, 4.7],
            [-13.2, 4.7],
        ],
    },
    { id: 'anchorage', label: 'Anchorage', tone: 'neutral', area: arc([-10.75, 6.0], 30_000, 0, 360, 48) },
]

function Zones() {
    return (
        <Scene title="Coast watch" description="Watched areas, each glowing in its tone" camera={COAST_CAMERA} basemap={DARK_BASEMAP}>
            <ZoneLayer id="areas" zones={COAST_ZONES} glow />
        </Scene>
    )
}

function Sweep() {
    return (
        <Scene
            title="Coast watch"
            description="Three coastal radars and an inland one, sweeping"
            camera={COAST_CAMERA}
            basemap={DARK_BASEMAP}
        >
            <CoverageLayer id="radars" cones={RADARS} rings={[INLAND_RINGS]} sweep />
        </Scene>
    )
}

/** A small seeded generator, so the links are the same every time. */
function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
    }
}

/** Where Tidevann's links start: its home site in northern Europe. */
const HOME: LngLat = [10.75, 59.91]

/** Cities round the world the sites stand near, with how many links each draws. */
const CITIES: readonly (readonly [lng: number, lat: number, weight: number])[] = [
    [-0.13, 51.51, 8],
    [2.35, 48.86, 6],
    [13.4, 52.52, 6],
    [4.9, 52.37, 5],
    [8.68, 50.11, 6],
    [-3.7, 40.42, 3],
    [12.5, 41.9, 3],
    [18.07, 59.33, 4],
    [24.94, 60.17, 3],
    [21.01, 52.23, 3],
    [16.37, 48.21, 3],
    [28.98, 41.01, 3],
    [37.62, 55.75, 2],
    [-74.0, 40.71, 10],
    [-77.04, 38.9, 5],
    [-87.63, 41.88, 4],
    [-122.42, 37.77, 8],
    [-118.24, 34.05, 5],
    [-122.33, 47.61, 4],
    [-79.38, 43.65, 4],
    [-73.57, 45.5, 2],
    [-99.13, 19.43, 3],
    [-46.63, -23.55, 5],
    [-58.38, -34.6, 3],
    [-70.65, -33.45, 2],
    [-77.04, -12.05, 2],
    [-74.07, 4.71, 2],
    [139.69, 35.69, 8],
    [126.98, 37.57, 5],
    [121.47, 31.23, 5],
    [114.17, 22.32, 6],
    [103.82, 1.35, 7],
    [100.5, 13.76, 3],
    [106.85, -6.21, 3],
    [72.88, 19.08, 5],
    [77.21, 28.61, 4],
    [77.59, 12.97, 4],
    [55.27, 25.2, 5],
    [51.53, 25.29, 2],
    [46.68, 24.71, 2],
    [151.21, -33.87, 5],
    [144.96, -37.81, 3],
    [174.76, -36.85, 2],
    [115.86, -31.95, 2],
    [18.42, -33.92, 3],
    [28.05, -26.2, 3],
    [36.82, -1.29, 2],
    [3.38, 6.52, 3],
    [31.24, 30.04, 3],
    [-7.59, 33.57, 2],
    [-21.94, 64.15, 2],
    [-17.45, 14.69, 2],
]

/** Most links are known peers, some unknown and a few flagged. */
function toneFor(draw: number): MapTone {
    if (draw < 0.05) return 'hostile'
    if (draw < 0.17) return 'unknown'
    return 'friend'
}

/**
 * Two hundred links from home to sites near the cities, each city's sites within about a degree of
 * it, as many as its weight asks and the rest spread by weight; each link's rate skewed low, so a
 * few busy links stand out.
 */
function networkLinks(count = 200): MapLink[] {
    const next = seeded(20261120)
    const total = CITIES.reduce((sum, city) => sum + city[2], 0)
    return Array.from({ length: count }, (_, index): MapLink => {
        let pick = next() * total
        const city = CITIES.find((each) => (pick -= each[2]) < 0) ?? CITIES[0]
        const to: LngLat = [city[0] + (next() - 0.5) * 2, city[1] + (next() - 0.5) * 1.4]
        const rate = Math.round(next() ** 2.2 * 1000) / 1000
        return { id: `site-${String(index + 1).padStart(3, '0')}`, from: HOME, to, tone: toneFor(next()), rate }
    })
}

const NETWORK = networkLinks()

/** The camera on the whole world, home near the top. */
const WORLD_CAMERA: MapCamera = { center: [20, 22], zoom: 1.35 }

function Flowing() {
    return (
        <Scene
            title="Connections"
            description="Two hundred links from home, light running along each by its rate"
            camera={WORLD_CAMERA}
            basemap={WORLD_BASEMAP}
        >
            <LinkLayer id="network" links={NETWORK} path="straight" width={1} arc flow />
        </Scene>
    )
}

const meta: Meta = { title: 'Maps/Effects', parameters: { frame: 'none' }, globals: { theme: 'dark' } }
export default meta

/** Watched areas over the dark basemap, each with a soft glow in its tone just outside its edge. */
export const GlowingZones: StoryObj = { name: 'Glowing zones', render: () => <Zones /> }
/** Radar cones with a beam turning round each: a bright edge with a phosphor glow fading behind it; sectors cross from edge to edge. */
export const RadarSweep: StoryObj = { name: 'Radar sweep', render: () => <Sweep /> }
/** Two hundred links from home to sites round the world, lifted into arcs, comets running along each faster and brighter the busier it is. */
export const FlowingLinks: StoryObj = { name: 'Flowing links', render: () => <Flowing /> }
