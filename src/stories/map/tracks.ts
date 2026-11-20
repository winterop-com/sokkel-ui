import { useEffect, useState } from 'react'

import { bearing, destination, distance } from '@winterop-com/sokkel-ui-maps/geodesy'
import type { LngLat } from '@winterop-com/sokkel-ui-maps/geometry'
import type { Track, TrackAffiliation, TrackKind } from '@winterop-com/sokkel-ui-maps/TrackLayer'

/** Tidevann's harbor watch: three harbors on a coast, harbor, juniper and larkspur, and what moves between them. */
export const HARBORS: Record<'harbor' | 'juniper' | 'larkspur', LngLat> = {
    harbor: [5.27, 60.4],
    juniper: [5.62, 59.0],
    larkspur: [6.05, 62.48],
}

/** The camera the harbor watch opens on: all three harbors and the sea west of them. */
export const WATCH_CAMERA = { center: [4.6, 60.85] as LngLat, zoom: 5.6 }

/** The camera close in on harbor. */
export const HARBOR_CAMERA = { center: [4.95, 60.42] as LngLat, zoom: 8.6 }

/** The camera on harbor and the sea west of it. */
export const APPROACH_CAMERA = { center: [4.8, 60.55] as LngLat, zoom: 7.5 }

/** One thing the watch follows: who it is, and the loop of waypoints it goes round at a steady speed. */
interface Route {
    id: string
    label: string
    affiliation: TrackAffiliation
    kind: TrackKind
    /** Knots. */
    speed: number
    /** Waypoints it goes round, back to the first after the last; one waypoint stands still. */
    loop: LngLat[]
    /** How far round the loop it starts, as a share of the loop. */
    start?: number
}

const ROUTES: Route[] = [
    {
        id: 'pilot-2',
        label: 'Pilot 2',
        affiliation: 'friend',
        kind: 'vessel',
        speed: 14,
        loop: [
            [5.05, 60.38],
            [4.75, 60.33],
            [4.7, 60.5],
            [5.0, 60.52],
        ],
    },
    {
        id: 'patrol-7',
        label: 'Patrol 7',
        affiliation: 'friend',
        kind: 'vessel',
        speed: 22,
        loop: [
            [4.85, 60.45],
            [5.1, 61.4],
            [5.4, 62.3],
            [5.1, 61.4],
        ],
        start: 0.1,
    },
    {
        id: 'tug-ada',
        label: 'Tug Ada',
        affiliation: 'friend',
        kind: 'vessel',
        speed: 8,
        loop: [
            [5.35, 59.02],
            [5.15, 59.1],
            [5.25, 59.2],
        ],
    },
    {
        id: 'survey-1',
        label: 'Survey 1',
        affiliation: 'friend',
        kind: 'aircraft',
        speed: 180,
        loop: [
            [4.2, 59.6],
            [4.2, 61.6],
            [3.6, 61.6],
            [3.6, 59.6],
        ],
        start: 0.3,
    },
    {
        id: 'contact-14',
        label: 'Contact 14',
        affiliation: 'hostile',
        kind: 'vessel',
        speed: 16,
        loop: [
            [3.9, 60.9],
            [4.5, 60.7],
            [4.3, 60.2],
        ],
        start: 0.2,
    },
    {
        id: 'ferry-juniper',
        label: 'Ferry Juniper',
        affiliation: 'neutral',
        kind: 'vessel',
        speed: 20,
        loop: [
            [5.15, 59.05],
            [4.8, 59.6],
            [4.8, 60.3],
            [5.0, 60.4],
            [4.8, 60.3],
            [4.8, 59.6],
        ],
        start: 0.35,
    },
    {
        id: 'cargo-larkspur',
        label: 'Cargo Larkspur',
        affiliation: 'neutral',
        kind: 'vessel',
        speed: 12,
        loop: [
            [5.75, 62.55],
            [4.6, 62.9],
            [3.4, 63.3],
            [4.6, 62.9],
        ],
        start: 0.15,
    },
    {
        id: 'flight-312',
        label: 'Flight 312',
        affiliation: 'neutral',
        kind: 'aircraft',
        speed: 420,
        loop: [
            [5.6, 59.1],
            [6.1, 62.4],
        ],
        start: 0.4,
    },
    {
        id: 'contact-9',
        label: 'Contact 9',
        affiliation: 'unknown',
        kind: 'vessel',
        speed: 10,
        loop: [
            [4.1, 59.4],
            [4.4, 59.3],
            [4.6, 59.6],
        ],
    },
    {
        id: 'track-21',
        label: 'Track 21',
        affiliation: 'unknown',
        kind: 'aircraft',
        speed: 260,
        loop: [
            [2.6, 61.0],
            [4.4, 61.9],
            [3.0, 62.6],
        ],
        start: 0.5,
    },
    {
        id: 'new-33',
        label: 'New 33',
        affiliation: 'pending',
        kind: 'vessel',
        speed: 9,
        loop: [
            [4.4, 61.75],
            [4.7, 61.95],
            [4.95, 61.7],
        ],
    },
    {
        id: 'shore-3',
        label: 'Shore unit 3',
        affiliation: 'friend',
        kind: 'vehicle',
        speed: 30,
        loop: [
            [5.5, 60.45],
            [6.0, 60.6],
            [6.4, 60.4],
        ],
    },
    { id: 'radar-harbor', label: 'Harbor radar', affiliation: 'friend', kind: 'sensor', speed: 0, loop: [HARBORS.harbor] },
    { id: 'radar-juniper', label: 'Juniper radar', affiliation: 'friend', kind: 'sensor', speed: 0, loop: [HARBORS.juniper] },
    { id: 'radar-larkspur', label: 'Larkspur radar', affiliation: 'friend', kind: 'sensor', speed: 0, loop: [HARBORS.larkspur] },
]

const KNOT = 1852 / 60

/** Where a route stands after `minute` minutes, and the way it is going. */
function along(route: Route, minute: number): { position: LngLat; heading: number | undefined } {
    if (route.loop.length === 1 || route.speed === 0) return { position: route.loop[0], heading: undefined }
    const legs = route.loop.map((from, index) => {
        const to = route.loop[(index + 1) % route.loop.length]
        return { from, to, meters: distance(from, to) }
    })
    const total = legs.reduce((sum, leg) => sum + leg.meters, 0)
    let left = ((((route.start ?? 0) * total + route.speed * KNOT * minute) % total) + total) % total
    for (const leg of legs) {
        if (left <= leg.meters) {
            const position = destination(leg.from, bearing(leg.from, leg.to), left)
            return { position, heading: leg.meters - left < 1 ? bearing(leg.from, leg.to) : bearing(position, leg.to) }
        }
        left -= leg.meters
    }
    return { position: legs[0].from, heading: bearing(legs[0].from, legs[0].to) }
}

/** How many minutes of trail each track draws behind it. */
const TRAIL = 12

/** The harbor watch at `minute`, each track's trail the minutes before it. */
export function watchAt(minute: number, trails = true, routes: readonly Route[] = ROUTES): Track[] {
    return routes.map((route) => {
        const now = along(route, minute)
        const moving = route.speed > 0 && route.loop.length > 1
        return {
            id: route.id,
            label: route.label,
            affiliation: route.affiliation,
            kind: route.kind,
            position: now.position,
            heading: now.heading,
            trail:
                trails && moving
                    ? Array.from(
                          { length: TRAIL },
                          (_, index) => along(route, minute - (TRAIL - index) * (route.kind === 'aircraft' ? 0.5 : 5)).position,
                      )
                    : undefined,
        }
    })
}

/** A track's speed in knots, as the watch moves it. */
export function speedOf(id: string): number | undefined {
    return ROUTES.find((route) => route.id === id)?.speed
}

/** A small seeded generator, so the dense watch is the same every time. */
function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let t = state
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** The affiliations of the busy day's tracks, by share: mostly neutral traffic, a few hostile. */
const DENSE_AFFILIATIONS: [TrackAffiliation, number][] = [
    ['neutral', 0.5],
    ['friend', 0.22],
    ['unknown', 0.16],
    ['pending', 0.1],
    ['hostile', 0.02],
]

function pick(share: number): TrackAffiliation {
    let left = share
    for (const [affiliation, part] of DENSE_AFFILIATIONS) {
        if (left < part) return affiliation
        left -= part
    }
    return 'neutral'
}

/** A busy day off the coast: `count` small loops at sea, gathered near the three harbors, the same every time. */
export function denseRoutes(count = 240): Route[] {
    const next = seeded(20261120)
    const centers: LngLat[] = [
        [4.85, 60.4],
        [5.2, 59.05],
        [5.6, 62.6],
    ]
    return Array.from({ length: count }, (_, index) => {
        const center = centers[index % centers.length]
        const reach = 4_000 + next() * 30_000
        const from = destination(center, next() * 360, reach)
        const to = destination(from, next() * 360, 2_000 + next() * 6_000)
        const aircraft = next() < 0.1
        return {
            id: `dense-${String(index)}`,
            label: `${aircraft ? 'Flight' : 'Vessel'} ${String(100 + index)}`,
            affiliation: pick(next()),
            kind: aircraft ? 'aircraft' : 'vessel',
            speed: aircraft ? 140 : 6 + next() * 14,
            loop: [from, to],
            start: next(),
        }
    })
}

/** The minute of the watch, advancing one a second while the story is open, from the same start every time. */
export function useWatchClock(running = true, step = 1): number {
    const [minute, setMinute] = useState(0)
    useEffect(() => {
        if (!running) return
        const timer = window.setInterval(() => setMinute((value) => value + step), 1000)
        return () => window.clearInterval(timer)
    }, [running, step])
    return minute
}
