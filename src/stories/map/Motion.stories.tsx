import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { DARK_BASEMAP, LIGHT_BASEMAP, type SchemeBasemaps } from '@winterop-com/sokkel-ui-maps/basemap'
import { bearing, destination, distance } from '@winterop-com/sokkel-ui-maps/geodesy'
import type { LngLat } from '@winterop-com/sokkel-ui-maps/geometry'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapOverlay, MapView, type MapCamera } from '@winterop-com/sokkel-ui-maps/MapView'
import {
    TrackLayer,
    trackCounts,
    trackLegendEntries,
    type Track,
    type TrackAffiliation,
    type TrackKind,
} from '@winterop-com/sokkel-ui-maps/TrackLayer'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { Page } from './Page'

/** The dark street map in the dark scheme, which these stories open in, and the light one in the light scheme. */
const BASEMAPS: SchemeBasemaps = { light: LIGHT_BASEMAP, dark: DARK_BASEMAP }

/**
 * How much faster than the world the stories run, so the flow shows at these zooms: a second on
 * the page is half a minute at sea or in the air. Every speed a track reports is this many times
 * its own.
 */
const RATE = 30
/** How often a story's feed reports, in milliseconds; the layer moves the tracks in between. */
const REPORT = 2_000
/** Knots in meters a second. */
const KNOT = 1852 / 3600

/** A seeded stream of numbers from 0 up to 1, the same every time, so every story starts the same. */
function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let mixed = state
        mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
        mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
    }
}

/**
 * How many reports have come since the story was drawn, counted on animation frames from a fixed
 * start: the first frame is the same every time, and the feed rests while the page is hidden.
 */
function useReports(period = REPORT): number {
    const [reports, setReports] = useState(0)
    useEffect(() => {
        let frame = 0
        let start: number | null = null
        const step = (now: number) => {
            start ??= now
            const passed = Math.floor((now - start) / period)
            setReports((was) => (passed > was ? passed : was))
            frame = requestAnimationFrame(step)
        }
        frame = requestAnimationFrame(step)
        return () => cancelAnimationFrame(frame)
    }, [period])
    return reports
}

/** One thing a story moves: who it is, how fast it is shown going, and where it is bound. */
interface Unit {
    id: string
    label?: string
    affiliation: TrackAffiliation
    kind: TrackKind
    /** Meters a second as the story shows it: `RATE` times its own, but for a satellite. */
    speed: number
    at: LngLat
    heading: number
    /** The waypoints it goes round, the next one at `leg`; none for a thing that stands still. */
    loop: LngLat[]
    leg: number
    trail: LngLat[]
}

/** Moves a unit on toward its next waypoint for some seconds, taking the waypoint after it when it arrives; false once a unit with nowhere further to go has arrived. */
function advance(unit: Unit, seconds: number, tail: number, round = true): boolean {
    if (unit.loop.length === 0 || unit.speed === 0) return true
    unit.trail = [...unit.trail, unit.at].slice(-tail)
    let left = unit.speed * seconds
    for (let turns = 0; left > 0 && turns < 8; turns += 1) {
        const to = unit.loop[unit.leg]
        const away = distance(unit.at, to)
        if (away > left) {
            unit.heading = bearing(unit.at, to)
            unit.at = destination(unit.at, unit.heading, left)
            return true
        }
        unit.at = to
        left -= away
        if (!round && unit.leg === unit.loop.length - 1) return false
        unit.leg = (unit.leg + 1) % unit.loop.length
        unit.heading = bearing(unit.at, unit.loop[unit.leg])
    }
    return true
}

/** A unit as the track a feed reports of it. */
const reported = (unit: Unit): Track => ({
    id: unit.id,
    label: unit.label,
    affiliation: unit.affiliation,
    kind: unit.kind,
    position: unit.at,
    heading: unit.loop.length === 0 ? undefined : unit.heading,
    speed: unit.speed === 0 ? undefined : unit.speed,
    trail: unit.trail.length === 0 ? undefined : unit.trail,
})

/** The cities the flights go between, around the North Sea and Norway. */
const CITIES: LngLat[] = [
    [10.75, 59.91],
    [5.32, 60.39],
    [5.73, 58.97],
    [10.4, 63.43],
    [14.4, 67.28],
    [18.96, 69.65],
    [6.15, 62.47],
    [8.0, 58.15],
    [-2.1, 57.15],
    [-3.19, 55.95],
    [-1.15, 60.15],
    [-6.77, 62.01],
    [-21.9, 64.13],
    [-0.13, 51.5],
    [4.9, 52.37],
    [9.99, 53.55],
    [12.57, 55.68],
    [11.97, 57.71],
    [18.07, 59.33],
    [24.94, 60.17],
]

/** The operators a flight is named for, and whose each one's flights are. */
const OPERATORS: { sign: string; affiliation: TrackAffiliation; share: number }[] = [
    { sign: 'HBR', affiliation: 'neutral', share: 0.4 },
    { sign: 'JNP', affiliation: 'neutral', share: 0.24 },
    { sign: 'LKS', affiliation: 'friend', share: 0.22 },
    { sign: 'UNK', affiliation: 'unknown', share: 0.09 },
    { sign: 'PND', affiliation: 'pending', share: 0.03 },
    { sign: 'CTC', affiliation: 'hostile', share: 0.02 },
]

/** Where the two satellites pass over, from the south-west to the north-east and from the north to the south. */
const PASSES: LngLat[][] = [
    [
        [-16, 50],
        [30, 71],
    ],
    [
        [16, 72],
        [-4, 50],
    ],
]

/**
 * Flights between the cities, each on its way from one to another, and two satellites passing
 * over: a flight that lands leaves the picture and another takes off in its place, so the count
 * holds. Calling it with a number of reports gives the tracks as that report has them.
 */
function traffic(count: number, seed: number, tail = 9): (reports: number) => Track[] {
    const next = seeded(seed)
    let serial = 100
    let done = 0
    const pick = () => {
        let roll = next()
        for (const operator of OPERATORS) {
            roll -= operator.share
            if (roll < 0) return operator
        }
        return OPERATORS[0]
    }
    const depart = (along: number): Unit => {
        const from = CITIES[Math.floor(next() * CITIES.length)]
        let to = CITIES[Math.floor(next() * CITIES.length)]
        while (distance(from, to) < 250_000) to = CITIES[Math.floor(next() * CITIES.length)]
        const operator = pick()
        const heading = bearing(from, to)
        serial += 1 + Math.floor(next() * 7)
        const flight: Unit = {
            id: `${operator.sign}-${String(serial)}`,
            label: operator.affiliation === 'neutral' ? undefined : `${operator.sign} ${String(serial)}`,
            affiliation: operator.affiliation,
            kind: 'aircraft',
            speed: (190 + next() * 60) * RATE,
            at: destination(from, heading, distance(from, to) * along),
            heading,
            loop: [to],
            leg: 0,
            trail: [],
        }
        // It has flown its trail already when it is met mid-way; one taking off has none yet.
        if (along > 0) {
            const back = (flight.speed * REPORT) / 1000
            flight.trail = Array.from({ length: tail }, (_, index) =>
                destination(from, heading, Math.max(0, distance(from, to) * along - back * (tail - index))),
            )
        }
        return flight
    }
    const pass = (index: number): Unit => ({
        id: `SAT-${String(index + 1)}-${String(serial)}`,
        label: `Sat ${String(index + 1)}`,
        affiliation: 'friend',
        kind: 'satellite',
        // Its own speed over the ground, which is about what a flight shows at thirty times its.
        speed: 7_400,
        at: PASSES[index][0],
        heading: bearing(PASSES[index][0], PASSES[index][1]),
        loop: [PASSES[index][1]],
        leg: 0,
        trail: [],
    })
    const units: Unit[] = [...PASSES.map((_, index) => pass(index)), ...Array.from({ length: count }, () => depart(0.05 + next() * 0.9))]
    // The satellites are met part of the way over, the first further on than the second.
    for (let step = 0; step < 110; step += 1) advance(units[0], REPORT / 1000, tail, false)
    for (let step = 0; step < 60; step += 1) advance(units[1], REPORT / 1000, tail, false)
    return (reports) => {
        for (; done < reports; done += 1) {
            for (let index = 0; index < units.length; index += 1) {
                if (advance(units[index], REPORT / 1000, tail, false)) continue
                serial += 1
                units[index] = index < PASSES.length ? pass(index) : depart(0)
            }
        }
        return units.map(reported)
    }
}

/** Waypoints written flat: a longitude, its latitude, the next longitude and so on. */
function path(...numbers: number[]): LngLat[] {
    const points: LngLat[] = []
    for (let index = 0; index + 1 < numbers.length; index += 2) points.push([numbers[index], numbers[index + 1]])
    return points
}

/** A vessel or an aircraft going round a loop of waypoints at a speed in knots, starting at the waypoint a share of the way round. */
function unit(id: string, label: string, affiliation: TrackAffiliation, kind: TrackKind, knots: number, loop: LngLat[], start = 0): Unit {
    const from = Math.floor(start * loop.length) % loop.length
    const leg = (from + 1) % loop.length
    return {
        id,
        label,
        affiliation,
        kind,
        speed: knots * KNOT * RATE,
        at: loop[from],
        heading: bearing(loop[from], loop[leg]),
        loop,
        leg,
        trail: [],
    }
}

/** Something standing where it was put: a sensor, or a vessel at anchor. */
const standing = (id: string, label: string, affiliation: TrackAffiliation, kind: TrackKind, at: LngLat): Unit => ({
    id,
    label,
    affiliation,
    kind,
    speed: 0,
    at,
    heading: 0,
    loop: [],
    leg: 0,
    trail: [],
})

/**
 * Tidevann's harbor watch at sea: pilots, tugs and a patrol, ferries, cargo and trawlers, the
 * contacts it follows, a rescue helicopter, a vessel at anchor and three radars on the coast.
 */
const WATCH = (): Unit[] => [
    unit('patrol-7', 'Patrol 7', 'friend', 'vessel', 22, path(4.62, 60.2, 4.3, 60.42, 4.52, 60.62, 4.72, 60.46)),
    unit('pilot-2', 'Pilot 2', 'friend', 'vessel', 16, path(4.7, 60.4, 4.52, 60.33, 4.46, 60.47, 4.66, 60.52), 0.5),
    unit('pilot-4', 'Pilot 4', 'friend', 'vessel', 15, path(4.7, 60.56, 4.5, 60.6, 4.56, 60.67), 0.34),
    unit('tug-ada', 'Tug Ada', 'friend', 'vessel', 9, path(4.72, 60.28, 4.6, 60.25, 4.64, 60.33), 0.34),
    unit('tug-grace', 'Tug Grace', 'friend', 'vessel', 8, path(4.68, 60.45, 4.58, 60.41, 4.6, 60.49), 0.7),
    unit('rescue-3', 'Rescue 3', 'friend', 'aircraft', 45, path(3.3, 60.16, 3.3, 60.7, 4.7, 60.7, 4.7, 60.16), 0.3),
    unit('ferry-juniper', 'Ferry Juniper', 'neutral', 'vessel', 19, path(4.74, 60.24, 4.1, 60.16, 3.4, 60.2, 4.1, 60.16), 0.3),
    unit('ferry-larkspur', 'Ferry Larkspur', 'neutral', 'vessel', 18, path(4.72, 60.58, 4.0, 60.68, 3.3, 60.7, 4.0, 60.68), 0.55),
    unit('cargo-larkspur', 'Cargo Larkspur', 'neutral', 'vessel', 13, path(3.3, 60.64, 4.0, 60.57, 4.7, 60.5, 4.0, 60.57), 0.55),
    unit('cargo-harbor', 'Cargo Harbor', 'neutral', 'vessel', 12, path(3.3, 60.3, 4.0, 60.34, 4.7, 60.36, 4.0, 60.34), 0.3),
    unit('tanker-juniper', 'Tanker Juniper', 'neutral', 'vessel', 11, path(3.25, 60.46, 3.9, 60.53, 4.6, 60.43, 3.9, 60.53), 0.8),
    unit('trawler-grace', 'Trawler Grace', 'neutral', 'vessel', 7, path(3.82, 60.34, 3.96, 60.38, 3.9, 60.44, 3.76, 60.4), 0.25),
    unit('trawler-linus', 'Trawler Linus', 'neutral', 'vessel', 6, path(4.1, 60.7, 4.24, 60.72, 4.2, 60.66), 0.7),
    unit('trawler-ada', 'Trawler Ada', 'neutral', 'vessel', 6, path(3.5, 60.22, 3.62, 60.26, 3.54, 60.3), 0.4),
    unit('trawler-margaret', 'Trawler Margaret', 'neutral', 'vessel', 7, path(4.3, 60.26, 4.42, 60.3, 4.34, 60.34, 4.24, 60.3), 0.5),
    unit('contact-14', 'Contact 14', 'hostile', 'vessel', 15, path(3.5, 60.5, 3.95, 60.5, 4.05, 60.36, 3.6, 60.32)),
    unit('contact-15', 'Contact 15', 'hostile', 'vessel', 17, path(4.5, 60.14, 3.9, 60.24, 3.7, 60.12), 0.4),
    unit('contact-21', 'Contact 21', 'unknown', 'vessel', 11, path(3.35, 60.38, 3.6, 60.44, 3.42, 60.56), 0.5),
    unit('contact-22', 'Contact 22', 'pending', 'vessel', 10, path(4.36, 60.56, 4.14, 60.5, 4.24, 60.62), 0.2),
    unit('contact-23', 'Contact 23', 'unknown', 'vessel', 12, path(3.6, 60.64, 3.9, 60.6, 3.75, 60.71), 0.34),
    unit('contact-24', 'Contact 24', 'unknown', 'aircraft', 38, path(3.3, 60.14, 4.5, 60.66, 3.4, 60.7), 0.34),
    standing('anchor-margaret', 'Margaret at anchor', 'neutral', 'vessel', [4.66, 60.3]),
    standing('radar-harbor', 'Radar harbor', 'friend', 'sensor', [4.95, 60.36]),
    standing('radar-larkspur', 'Radar larkspur', 'friend', 'sensor', [4.86, 60.6]),
    standing('radar-juniper', 'Radar juniper', 'friend', 'sensor', [5.0, 60.19]),
]

/** A fleet going round its loops; calling it with a number of reports gives the tracks as that report has them. */
function fleet(units: Unit[], tail = 14): (reports: number) => Track[] {
    let done = 0
    // Each has sailed its trail before the story starts.
    for (let step = 0; step < tail; step += 1) for (const each of units) advance(each, REPORT / 1000, tail)
    return (reports) => {
        for (; done < reports; done += 1) for (const each of units) advance(each, REPORT / 1000, tail)
        return units.map(reported)
    }
}

/** The affiliations new contacts turn up with, the unknown ones most often. */
const CONTACT_AFFILIATIONS: TrackAffiliation[] = ['unknown', 'unknown', 'pending', 'unknown', 'hostile', 'neutral', 'unknown', 'friend']

/**
 * Contacts turning up at sea one after another, each drifting on a course of its own: a new one
 * with every report, and the oldest dropped once there are `most`.
 */
function contacts(seed: number, most = 18, tail = 6): (reports: number) => Track[] {
    const next = seeded(seed)
    let serial = 30
    let done = 0
    const turnUp = (): Unit => {
        const at: LngLat = [3.4 + next() * 1.3, 60.16 + next() * 0.52]
        const heading = next() * 360
        serial += 1
        return {
            id: `contact-${String(serial)}`,
            label: `Contact ${String(serial)}`,
            affiliation: CONTACT_AFFILIATIONS[Math.floor(next() * CONTACT_AFFILIATIONS.length)],
            kind: next() < 0.8 ? 'vessel' : 'aircraft',
            speed: (6 + next() * 10) * KNOT * RATE,
            at,
            heading,
            loop: [destination(at, heading, 400_000)],
            leg: 0,
            trail: [],
        }
    }
    const units: Unit[] = []
    for (let index = 0; index < 7; index += 1) {
        units.push(turnUp())
        for (const each of units) advance(each, REPORT / 1000, tail)
    }
    return (reports) => {
        for (; done < reports; done += 1) {
            for (const each of units) advance(each, REPORT / 1000, tail)
            units.push(turnUp())
            if (units.length > most) units.shift()
        }
        return units.map(reported)
    }
}

/** The box the dense picture fills: the North Sea and the lands around it. */
const DENSE_BOX = { west: -14, east: 27, south: 52.5, north: 67.5 }

/**
 * A crowded sky and sea: `count` aircraft and vessels, each on a straight course of its own inside
 * the box, turning back from its edge.
 */
function crowd(count: number, seed: number, tail = 4): (reports: number) => Track[] {
    const next = seeded(seed)
    let done = 0
    const kinds: { kind: TrackKind; knots: [number, number]; share: number }[] = [
        { kind: 'aircraft', knots: [380, 480], share: 0.62 },
        { kind: 'vessel', knots: [9, 22], share: 0.3 },
        { kind: 'vehicle', knots: [30, 50], share: 0.08 },
    ]
    // Three in a hundred are hostile, and most are neutral.
    const affiliationOf = (roll: number): TrackAffiliation =>
        roll < 0.6 ? 'neutral' : roll < 0.82 ? 'friend' : roll < 0.92 ? 'unknown' : roll < 0.97 ? 'pending' : 'hostile'
    const sortOf = (roll: number) => {
        let left = roll
        for (const each of kinds) {
            left -= each.share
            if (left < 0) return each
        }
        return kinds[0]
    }
    const units = Array.from({ length: count }, (_, index): Unit => {
        const sort = sortOf(next())
        const at: LngLat = [
            DENSE_BOX.west + next() * (DENSE_BOX.east - DENSE_BOX.west),
            DENSE_BOX.south + next() * (DENSE_BOX.north - DENSE_BOX.south),
        ]
        const heading = next() * 360
        return {
            id: `track-${String(index + 1)}`,
            affiliation: affiliationOf(next()),
            kind: sort.kind,
            speed: (sort.knots[0] + next() * (sort.knots[1] - sort.knots[0])) * KNOT * RATE,
            at,
            heading,
            loop: [destination(at, heading, 3_000_000)],
            leg: 0,
            trail: [],
        }
    })
    const move = () => {
        for (const each of units) {
            advance(each, REPORT / 1000, tail)
            const [lng, lat] = each.at
            if (lng > DENSE_BOX.west && lng < DENSE_BOX.east && lat > DENSE_BOX.south && lat < DENSE_BOX.north) continue
            // Back toward the middle of the box, on a course a little off it.
            const home: LngLat = [(DENSE_BOX.west + DENSE_BOX.east) / 2, (DENSE_BOX.south + DENSE_BOX.north) / 2]
            each.heading = bearing(each.at, home) + (next() - 0.5) * 70
            each.loop = [destination(each.at, each.heading, 3_000_000)]
        }
    }
    for (let step = 0; step < tail; step += 1) move()
    return (reports) => {
        for (; done < reports; done += 1) move()
        return units.map(reported)
    }
}

/** The camera on the North Sea and Norway, where the flights are. */
const SKY_CAMERA: MapCamera = { center: [6.5, 60.6], zoom: 4.7 }
/** The camera on the sea west of harbor, where the watch is kept. */
const SEA_CAMERA: MapCamera = { center: [4.3, 60.42], zoom: 8.8 }
/** The camera on the whole of the dense picture. */
const DENSE_CAMERA: MapCamera = { center: [6.5, 60.4], zoom: 4.4 }

/** A page of one map over the street map of the scheme, with the countries drawn from the package's own outlines where its tiles cannot be had. */
function Watch({
    title,
    description,
    camera,
    selected,
    children,
}: {
    title: string
    description: string
    camera: MapCamera
    selected?: string
    children: ReactNode
}) {
    return (
        <Page title={title} period={description}>
            <MapView
                label={title}
                defaultBasemap={BASEMAPS}
                fallbackBasemap={WORLD_BASEMAP}
                camera={camera}
                defaultSelected={selected}
                className="flex-1"
            >
                {children}
            </MapView>
        </Page>
    )
}

/** The legend of the affiliations, with how many tracks each has. */
function Legend({ tracks }: { tracks: readonly Track[] }) {
    return (
        <MapOverlay corner="bottom-right">
            <MapLegend title="Affiliation" entries={trackLegendEntries()} counts={trackCounts(tracks)} shape="point" className="w-40" />
        </MapOverlay>
    )
}

function Flowing() {
    const feed = useMemo(() => traffic(280, 7), [])
    const reports = useReports()
    const tracks = useMemo(() => feed(reports), [feed, reports])
    return (
        <Watch
            title="Flight watch"
            description="Flights over the North Sea and Norway, thirty times as fast as they fly"
            camera={SKY_CAMERA}
        >
            <TrackLayer id="flights" tracks={tracks} size={20} />
            <Legend tracks={tracks} />
        </Watch>
    )
}

function Harbor({ selected }: { selected?: string }) {
    const feed = useMemo(() => fleet(WATCH()), [])
    const reports = useReports()
    const tracks = useMemo(() => feed(reports), [feed, reports])
    return (
        <Watch
            title="Harbor watch"
            description={selected === undefined ? 'The sea west of harbor by night' : 'A patrol picked on the sea west of harbor'}
            camera={SEA_CAMERA}
            selected={selected}
        >
            <TrackLayer id="tracks" tracks={tracks} />
            <Legend tracks={tracks} />
        </Watch>
    )
}

function Appearing() {
    const feed = useMemo(() => contacts(11), [])
    const reports = useReports()
    const tracks = useMemo(() => feed(reports), [feed, reports])
    return (
        <Watch title="Harbor watch" description="Contacts turning up west of harbor" camera={SEA_CAMERA}>
            <TrackLayer id="contacts" tracks={tracks} />
            <Legend tracks={tracks} />
        </Watch>
    )
}

function Crowded() {
    const feed = useMemo(() => crowd(2_000, 23), [])
    const reports = useReports()
    const tracks = useMemo(() => feed(reports), [feed, reports])
    return (
        <Watch title="Wide watch" description="2,000 tracks in the air, at sea and on the roads" camera={DENSE_CAMERA}>
            <TrackLayer id="tracks" tracks={tracks} size={16} labels={false} />
            <Legend tracks={tracks} />
        </Watch>
    )
}

const meta: Meta = { title: 'Maps/Motion' }
export default meta

/** Some 280 flights between the cities round the North Sea, each moved on along its heading between reports that come every two seconds, glowing in its affiliation's color with its trail fading behind it; a flight that lands leaves, and the one that takes off in its place appears in a ripple. Two satellites pass over. */
export const FlowingTraffic: StoryObj = { name: 'Flowing traffic', render: () => <Flowing /> }
/** The harbor watch in the darkroom theme: vessels, contacts, a survey aircraft and two radars, lit low for a dark room, the hostile contacts pulsing. */
export const HarborAtNight: StoryObj = { name: 'Harbor at night', globals: { theme: 'dark', look: 'darkroom' }, render: () => <Harbor /> }
/** A contact turning up with every report, each in a ring that spreads and fades where it first appears, the oldest dropped. */
export const NewContacts: StoryObj = { name: 'New contacts', render: () => <Appearing /> }
/** A patrol picked: ringed in the selection color inside a halo that breathes slowly, its name marked, as it sails on. */
export const Picked: StoryObj = { name: 'Selected', render: () => <Harbor selected="patrol-7" /> }
/** Two thousand tracks moving at once, to show what the layer costs: it tells the map only of what moved far enough to see. */
export const Dense: StoryObj = { name: 'Dense', render: () => <Crowded /> }
