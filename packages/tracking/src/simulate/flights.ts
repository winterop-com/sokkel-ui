/**
 * Simulated flights: a timetable between real cities round southern Norway and the North Sea that
 * repeats every day, and a few light aircraft flying circuits. Where every aircraft is follows from
 * the moment and the seed alone, so any moment can be drawn again and a moment played back is what
 * it was live. Each moment is written as the readsb v2 API answers `/v2/point`, for `parseReadsb`.
 */
import type { ReadsbAircraft, ReadsbResponse } from '../adsb'
import { bearing, destination, distance } from '../geo'
import type { LonLat } from '../track'

const MINUTE = 60_000
const NM = 1852

/** The cities flown between, at their airports. */
export const FLIGHT_CITIES = {
    oslo: { name: 'Oslo', at: [11.1004, 60.1939] },
    bergen: { name: 'Bergen', at: [5.2181, 60.2934] },
    stavanger: { name: 'Stavanger', at: [5.6378, 58.8767] },
    kristiansand: { name: 'Kristiansand', at: [8.0854, 58.2042] },
    trondheim: { name: 'Trondheim', at: [10.924, 63.4578] },
    alesund: { name: 'Ålesund', at: [6.1197, 62.5625] },
    haugesund: { name: 'Haugesund', at: [5.2084, 59.3453] },
    aberdeen: { name: 'Aberdeen', at: [-2.1978, 57.2019] },
    edinburgh: { name: 'Edinburgh', at: [-3.3725, 55.95] },
    london: { name: 'London', at: [-0.4543, 51.47] },
    amsterdam: { name: 'Amsterdam', at: [4.7639, 52.3086] },
    hamburg: { name: 'Hamburg', at: [9.9882, 53.6304] },
    copenhagen: { name: 'Copenhagen', at: [12.656, 55.618] },
    gothenburg: { name: 'Gothenburg', at: [12.2798, 57.6628] },
    stockholm: { name: 'Stockholm', at: [17.9186, 59.6519] },
} satisfies Record<string, { name: string; at: LonLat }>

export type FlightCity = keyof typeof FLIGHT_CITIES

/** What a simulated aircraft is doing: rolling out, climbing, cruising, descending, rolling in, or flying a circuit. */
export type FlightPhase = 'taxi-out' | 'climb' | 'cruise' | 'descent' | 'taxi-in' | 'circuit'

export interface FlightSimOptions {
    /** What the flights are drawn from: which fly, their addresses and squawks. The same seed, the same sky. 0 by default. */
    seed?: number
}

/** One simulated aircraft at a moment, as the timetable has it, before a feed rounds it. */
export interface SimFlight {
    /** Its 24-bit address in hex, in the block no state is given. */
    hex: string
    /** Its callsign; a light aircraft flying a circuit gives none. */
    callsign?: string
    /** Its type designator, such as `B738`. */
    aircraftType: string
    /** Its emitter category, such as `A3`. */
    category: string
    /** The cities it flies between; none for a circuit. */
    from?: FlightCity
    to?: FlightCity
    phase: FlightPhase
    /** When it left the stand, in milliseconds since the epoch; none for a circuit. */
    departed?: number
    lon: number
    lat: number
    /** Feet, or `ground`. */
    altitude: number | 'ground'
    /** Knots over the ground. */
    speed: number
    /** Degrees true over the ground. */
    track: number
    /** Feet a minute, up or down. */
    rate: number
}

/** What flies a route: its type designator, emitter category, and speeds in knots. */
interface Airframe {
    type: string
    category: string
    cruise: number
    /** The speed it leaves the runway and meets it at. */
    slow: number
    /** Feet a minute in the climb, and in the descent. */
    climb: number
    descend: number
}

const JET: Omit<Airframe, 'type'> = { category: 'A3', cruise: 450, slow: 160, climb: 2_200, descend: 1_800 }
const REGIONAL: Omit<Airframe, 'type'> = { category: 'A3', cruise: 420, slow: 150, climb: 2_000, descend: 1_700 }
const PROP: Omit<Airframe, 'type'> = { category: 'A2', cruise: 290, slow: 120, climb: 1_400, descend: 1_300 }

/** One route of the timetable, flown both ways. */
interface Route {
    from: FlightCity
    to: FlightCity
    airframe: Airframe
    /** The cruising altitude, in feet; a short route tops out lower. */
    level: number
    /** Minutes between departures each way. */
    every: number
    /** Minutes past the hour the first departure leaves. */
    offset: number
    /** The flight numbers each way. */
    number: number
}

const ROUTES: readonly Route[] = [
    { from: 'oslo', to: 'bergen', airframe: { type: 'B738', ...JET }, level: 31_000, every: 30, offset: 0, number: 100 },
    { from: 'oslo', to: 'stavanger', airframe: { type: 'A20N', ...JET }, level: 33_000, every: 40, offset: 10, number: 110 },
    { from: 'oslo', to: 'trondheim', airframe: { type: 'B38M', ...JET }, level: 30_000, every: 35, offset: 5, number: 120 },
    { from: 'oslo', to: 'kristiansand', airframe: { type: 'E190', ...REGIONAL }, level: 21_000, every: 60, offset: 25, number: 130 },
    { from: 'oslo', to: 'london', airframe: { type: 'A20N', ...JET }, level: 37_000, every: 70, offset: 15, number: 200 },
    { from: 'oslo', to: 'amsterdam', airframe: { type: 'B738', ...JET }, level: 36_000, every: 80, offset: 40, number: 210 },
    { from: 'oslo', to: 'copenhagen', airframe: { type: 'E195', ...REGIONAL }, level: 34_000, every: 50, offset: 20, number: 220 },
    { from: 'oslo', to: 'stockholm', airframe: { type: 'E190', ...REGIONAL }, level: 32_000, every: 60, offset: 35, number: 230 },
    { from: 'bergen', to: 'stavanger', airframe: { type: 'DH8D', ...PROP }, level: 15_000, every: 45, offset: 12, number: 300 },
    { from: 'bergen', to: 'trondheim', airframe: { type: 'B738', ...JET }, level: 29_000, every: 75, offset: 30, number: 310 },
    { from: 'bergen', to: 'aberdeen', airframe: { type: 'AT76', ...PROP }, level: 21_000, every: 90, offset: 50, number: 320 },
    { from: 'bergen', to: 'amsterdam', airframe: { type: 'A20N', ...JET }, level: 36_000, every: 90, offset: 5, number: 330 },
    { from: 'bergen', to: 'alesund', airframe: { type: 'DH8D', ...PROP }, level: 13_000, every: 60, offset: 45, number: 340 },
    { from: 'stavanger', to: 'aberdeen', airframe: { type: 'AT76', ...PROP }, level: 19_000, every: 80, offset: 20, number: 400 },
    { from: 'stavanger', to: 'london', airframe: { type: 'B738', ...JET }, level: 35_000, every: 100, offset: 55, number: 410 },
    { from: 'stavanger', to: 'copenhagen', airframe: { type: 'E190', ...REGIONAL }, level: 32_000, every: 90, offset: 8, number: 420 },
    { from: 'haugesund', to: 'oslo', airframe: { type: 'B738', ...JET }, level: 29_000, every: 75, offset: 18, number: 500 },
    { from: 'kristiansand', to: 'bergen', airframe: { type: 'DH8D', ...PROP }, level: 17_000, every: 90, offset: 33, number: 510 },
    { from: 'trondheim', to: 'stavanger', airframe: { type: 'B738', ...JET }, level: 33_000, every: 90, offset: 42, number: 520 },
    { from: 'alesund', to: 'oslo', airframe: { type: 'E190', ...REGIONAL }, level: 27_000, every: 70, offset: 28, number: 530 },
    { from: 'edinburgh', to: 'stockholm', airframe: { type: 'A20N', ...JET }, level: 38_000, every: 120, offset: 14, number: 600 },
    { from: 'london', to: 'trondheim', airframe: { type: 'B38M', ...JET }, level: 37_000, every: 120, offset: 47, number: 610 },
    { from: 'hamburg', to: 'bergen', airframe: { type: 'E195', ...REGIONAL }, level: 35_000, every: 110, offset: 3, number: 620 },
    { from: 'gothenburg', to: 'aberdeen', airframe: { type: 'AT76', ...PROP }, level: 23_000, every: 120, offset: 38, number: 630 },
]

/** Minutes an aircraft taxis before it takes off and after it lands. */
const TAXI_OUT = 7
const TAXI_IN = 5

/** A number from 0 to 1 that is the same every time for the same key and seed. */
function hash(key: string, seed: number): number {
    let value = (2166136261 ^ seed) >>> 0
    for (let index = 0; index < key.length; index += 1) {
        value ^= key.charCodeAt(index)
        value = Math.imul(value, 16777619)
    }
    return (value >>> 0) / 4294967296
}

/** A 24-bit address in the block no state is given, so no real aircraft has it. */
const addressOf = (key: string, seed: number) =>
    `f${Math.floor(hash(key, seed) * 0xfffff)
        .toString(16)
        .padStart(5, '0')}`

/** A squawk code: four octal digits, never one of the emergency codes. */
function squawkOf(key: string, seed: number): string {
    const code = Math.floor(hash(`squawk ${key}`, seed) * 4096)
    const digits = code.toString(8).padStart(4, '0')
    return ['7500', '7600', '7700'].includes(digits) ? '2000' : digits
}

/** One leg as flown: its distances and times, worked out once from the route. */
interface Leg {
    from: LonLat
    to: LonLat
    course: number
    /** Meters along the great circle. */
    length: number
    /** The altitude it levels at, in feet: the route's, or lower when the leg is too short to reach it. */
    level: number
    /** Minutes climbing, cruising and descending, and the meters each covers. */
    climb: number
    cruise: number
    descent: number
    climbLength: number
    descentLength: number
    airframe: Airframe
}

const knotsToMetersPerMinute = (knots: number) => (knots * NM) / 60

function legOf(route: Route, from: FlightCity, to: FlightCity): Leg {
    const start = FLIGHT_CITIES[from].at
    const end = FLIGHT_CITIES[to].at
    const length = distance(start, end)
    const { airframe } = route
    const average = knotsToMetersPerMinute((airframe.cruise + airframe.slow) / 2)
    const climbAt = (level: number) => level / airframe.climb
    const descentAt = (level: number) => level / airframe.descend
    // A leg too short to climb to the route's level and come down again tops out lower, so climb and descent meet.
    const full = average * (climbAt(route.level) + descentAt(route.level))
    const level = full > length * 0.9 ? Math.round((route.level * (length * 0.9)) / full / 1000) * 1000 : route.level
    const climb = climbAt(level)
    const descent = descentAt(level)
    const climbLength = average * climb
    const descentLength = average * descent
    const cruise = Math.max(0, (length - climbLength - descentLength) / knotsToMetersPerMinute(airframe.cruise))
    return {
        from: start,
        to: end,
        course: bearing(start, end),
        length,
        level,
        climb,
        cruise,
        descent,
        climbLength,
        descentLength,
        airframe,
    }
}

/** One way along a route: its leg, the cities at its ends and the numbers its flights take. */
interface Way {
    route: Route
    /** The route's place in the timetable. */
    index: number
    /** 0 out, 1 back. */
    way: number
    from: FlightCity
    to: FlightCity
    leg: Leg
    number: number
    offset: number
}

/** Every leg of the timetable, both ways. */
const WAYS: readonly Way[] = ROUTES.flatMap((route, index) => [
    {
        route,
        index,
        way: 0,
        from: route.from,
        to: route.to,
        leg: legOf(route, route.from, route.to),
        number: route.number,
        offset: route.offset,
    },
    {
        route,
        index,
        way: 1,
        from: route.to,
        to: route.from,
        leg: legOf(route, route.to, route.from),
        number: route.number + 1,
        offset: (route.offset + route.every / 2) % route.every,
    },
])

/** Minutes from leaving the stand to reaching the other one. */
const blockOf = (leg: Leg) => TAXI_OUT + leg.climb + leg.cruise + leg.descent + TAXI_IN

/** Where an aircraft is and how it goes, in the units a feed says them: feet, knots, degrees and feet a minute. */
interface Flown {
    at: LonLat
    feet: number | 'ground'
    knots: number
    track: number
    rate: number
    phase: FlightPhase
}

/** Where an aircraft on a leg is, `minutes` after it left the stand; undefined once it has arrived. */
function flown(leg: Leg, minutes: number): Flown | undefined {
    const { airframe } = leg
    const fast = knotsToMetersPerMinute(airframe.cruise)
    const slow = knotsToMetersPerMinute(airframe.slow)
    const airborne = minutes - TAXI_OUT
    const flying = leg.climb + leg.cruise + leg.descent
    if (minutes < 0 || airborne > flying + TAXI_IN) return undefined
    if (airborne < 0) {
        // Taxiing out: a slow roll toward the runway, close by the stand.
        const rolled = Math.max(0, minutes - 1) * knotsToMetersPerMinute(14)
        return {
            at: destination(leg.from, leg.course + 90, Math.min(rolled, 1500)),
            feet: 'ground',
            knots: minutes < 1 ? 0 : 14,
            track: leg.course + 90,
            rate: 0,
            phase: 'taxi-out',
        }
    }
    if (airborne > flying) {
        // Taxiing in, then standing at the gate.
        const rolled = (airborne - flying) * knotsToMetersPerMinute(16)
        const back = bearing(leg.to, leg.from)
        return {
            at: destination(leg.to, back + 120, Math.min(rolled, 1800)),
            feet: 'ground',
            knots: rolled >= 1800 ? 0 : 16,
            track: back + 120,
            rate: 0,
            phase: 'taxi-in',
        }
    }
    let along: number
    let feet: number
    let speed: number
    let rate: number
    let phase: FlightPhase
    if (airborne < leg.climb) {
        const share = airborne / leg.climb
        along = slow * airborne + ((fast - slow) * airborne * share) / 2
        feet = leg.level * share
        speed = airframe.slow + (airframe.cruise - airframe.slow) * share
        rate = leg.level / leg.climb
        phase = 'climb'
    } else if (airborne < leg.climb + leg.cruise) {
        along = leg.climbLength + fast * (airborne - leg.climb)
        feet = leg.level
        speed = airframe.cruise
        rate = 0
        phase = 'cruise'
    } else {
        const into = airborne - leg.climb - leg.cruise
        const share = into / leg.descent
        along = leg.length - leg.descentLength + fast * into - ((fast - slow) * into * share) / 2
        feet = leg.level * (1 - share)
        speed = airframe.cruise - (airframe.cruise - airframe.slow) * share
        rate = -leg.level / leg.descent
        phase = 'descent'
    }
    const at = destination(leg.from, leg.course, Math.min(along, leg.length))
    const track = along >= leg.length - 50 ? bearing(leg.from, leg.to) : bearing(at, leg.to)
    return { at, feet: Math.max(0, Math.round(feet / 25) * 25), knots: speed, track, rate, phase }
}

/** A light aircraft flying a circuit round a field all day, with no callsign. */
interface Circuit {
    key: string
    type: string
    center: LonLat
    /** Meters across the circuit. */
    radius: number
    feet: number
    knots: number
}

const CIRCUITS: readonly Circuit[] = [
    { key: 'circuit-oslo', type: 'C172', center: [11.03, 59.97], radius: 9_000, feet: 2_500, knots: 95 },
    { key: 'circuit-stavanger', type: 'PA28', center: [5.75, 58.95], radius: 7_000, feet: 1_800, knots: 90 },
    { key: 'circuit-kristiansand', type: 'C172', center: [8.25, 58.3], radius: 8_000, feet: 3_000, knots: 100 },
]

function circling(circuit: Circuit, at: number): Flown {
    const lap = (2 * Math.PI * circuit.radius) / knotsToMetersPerMinute(circuit.knots)
    const angle = ((at / MINUTE / lap) % 1) * 360
    return {
        at: destination(circuit.center, angle, circuit.radius),
        feet: circuit.feet + Math.round(Math.sin((angle * Math.PI) / 90) * 100),
        knots: circuit.knots,
        track: (angle + 90) % 360,
        rate: Math.round(Math.cos((angle * Math.PI) / 90) * 200),
        phase: 'circuit',
    }
}

/** One flight of the timetable in the air or on the ground at a moment, with what its feed's values are drawn from. */
interface Flying {
    /** What its address, squawk and the rest are drawn from: its route, way and departure. */
    key: string
    way: Way
    callsign: string
    /** Minutes since it left the stand. */
    into: number
    /** The departure's count since the epoch, along its way. */
    departure: number
    where: Flown
}

/** Every flight of the timetable that is out at a moment, in the timetable's order. */
function flying(at: number, seed: number): Flying[] {
    const found: Flying[] = []
    const minutes = at / MINUTE
    for (const way of WAYS) {
        const { route, leg } = way
        const block = blockOf(leg)
        const first = Math.floor((minutes - block - way.offset) / route.every)
        const last = Math.floor((minutes - way.offset) / route.every)
        for (let departure = first; departure <= last; departure += 1) {
            const into = minutes - (departure * route.every + way.offset)
            const where = flown(leg, into)
            if (where === undefined) continue
            const key = `${String(way.index)}-${String(way.way)}-${String(departure)}`
            // About one departure in five does not fly that day, so the sky is busier at some times than others.
            if (hash(`cancelled ${key}`, seed) < 0.2) continue
            // Flights of the same leg share their number by the day's departure, a digit for each.
            const callsign = `TDV${String(way.number * 10 + (((departure % 10) + 10) % 10)).padStart(4, '0')}`
            found.push({ key, way, callsign, into, departure, where })
        }
    }
    return found
}

const turned = (degrees: number) => ((degrees % 360) + 360) % 360

/** The simulated aircraft at a moment, in milliseconds since the epoch: the timetable's flights, then the circuits. */
export function flightsAt(at: number, options: FlightSimOptions = {}): SimFlight[] {
    const seed = options.seed ?? 0
    return [
        ...flying(at, seed).map(({ key, way, callsign, departure, where }): SimFlight => ({
            hex: addressOf(key, seed),
            callsign,
            aircraftType: way.route.airframe.type,
            category: way.route.airframe.category,
            from: way.from,
            to: way.to,
            phase: where.phase,
            departed: (departure * way.route.every + way.offset) * MINUTE,
            lon: where.at[0],
            lat: where.at[1],
            altitude: where.feet,
            speed: where.knots,
            track: turned(where.track),
            rate: where.rate,
        })),
        ...CIRCUITS.map((circuit): SimFlight => {
            const where = circling(circuit, at)
            return {
                hex: addressOf(circuit.key, seed),
                aircraftType: circuit.type,
                category: 'A1',
                phase: 'circuit',
                lon: where.at[0],
                lat: where.at[1],
                altitude: where.feet,
                speed: where.knots,
                track: where.track,
                rate: where.rate,
            }
        }),
    ]
}

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places

/**
 * The simulated sky at a moment, in milliseconds since the epoch, as readsb's v2 API answers
 * `/v2/point`: knots, feet and feet a minute, positions to six places, and how long ago each was
 * heard. `parseReadsb` reads it as it reads a live answer.
 */
export function simulateFlights(at: number, options: FlightSimOptions = {}): ReadsbResponse {
    const seed = options.seed ?? 0
    const ac: ReadsbAircraft[] = []
    for (const { key, way, callsign, into, where } of flying(at, seed)) {
        const seen = round(hash(`seen ${key} ${String(Math.floor(at / 2000))}`, seed) * 1.6, 1)
        ac.push({
            hex: addressOf(key, seed),
            type: 'adsb_icao',
            flight: callsign.padEnd(8, ' '),
            t: way.route.airframe.type,
            category: way.route.airframe.category,
            alt_baro: where.feet,
            gs: round(where.knots + (where.knots === 0 ? 0 : hash(`gs ${key}`, seed) * 6 - 3), 1),
            track: round(turned(where.track), 2),
            baro_rate: Math.round(where.rate / 64) * 64,
            squawk: squawkOf(key, seed),
            emergency: 'none',
            lat: round(where.at[1], 6),
            lon: round(where.at[0], 6),
            seen_pos: seen,
            seen: round(seen / 2, 1),
            messages: Math.floor(hash(`messages ${key}`, seed) * 4000) + Math.floor(into * 120),
            rssi: round(-30 + hash(`rssi ${key}`, seed) * 18, 1),
        })
    }
    for (const circuit of CIRCUITS) {
        const where = circling(circuit, at)
        ac.push({
            hex: addressOf(circuit.key, seed),
            type: 'adsb_icao',
            t: circuit.type,
            category: 'A1',
            alt_baro: where.feet,
            gs: where.knots,
            track: round(where.track, 2),
            baro_rate: Math.round(where.rate / 64) * 64,
            squawk: '7000',
            lat: round(where.at[1], 6),
            lon: round(where.at[0], 6),
            seen_pos: 1.2,
            seen: 0.6,
            messages: 900,
            rssi: -27.4,
        })
    }
    return { now: at, msg: 'No error', total: ac.length, ctime: at, ptime: 1, ac }
}

export interface FlightTrailOptions extends FlightSimOptions {
    /** How far back the trails reach, in minutes. */
    minutes: number
    /** How far apart two points of a trail are, in milliseconds. 15 seconds by default. */
    step?: number
}

/**
 * Where each simulated aircraft was over the minutes before a moment, by its address, oldest first
 * and without where it is now: the trail a watch that had followed the feed would hold, worked out
 * from the moments before, so a moment played back draws the trails it had live.
 */
export function flightTrails(at: number, options: FlightTrailOptions): Map<string, LonLat[]> {
    const step = Math.max(1, options.step ?? 15_000)
    const steps = Math.round((options.minutes * MINUTE) / step)
    const trails = new Map<string, LonLat[]>()
    for (let back = steps; back >= 1; back -= 1) {
        for (const aircraft of simulateFlights(at - back * step, options).ac ?? []) {
            if (aircraft.lon === undefined || aircraft.lat === undefined) continue
            const trail = trails.get(aircraft.hex)
            if (trail === undefined) trails.set(aircraft.hex, [[aircraft.lon, aircraft.lat]])
            else trail.push([aircraft.lon, aircraft.lat])
        }
    }
    return trails
}

/** Where a simulated flight goes, by its callsign, which no ADS-B message says: the timetable knows it. */
export function flightRoute(callsign: string | undefined): { from: string; to: string } | undefined {
    const match = /^TDV(\d{3})\d$/.exec(callsign ?? '')
    if (match === null) return undefined
    const number = Number(match[1])
    const found = WAYS.find((way) => way.number === number)
    if (found === undefined) return undefined
    return { from: FLIGHT_CITIES[found.from].name, to: FLIGHT_CITIES[found.to].name }
}
