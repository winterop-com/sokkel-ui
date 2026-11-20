/**
 * The simulated feed: Tidevann's flights between real cities around southern Norway and the North
 * Sea, on a timetable that repeats every day, and a few light aircraft flying circuits. Where every
 * aircraft is follows from the time alone, so any moment of the last hour can be drawn again. Each
 * moment is written as the readsb v2 API answers `/v2/point`, and read back through the tracking
 * package's parser, as a live answer is.
 */
import type { ReadsbAircraft, ReadsbResponse } from '@winterop-com/sokkel-ui-tracking/adsb'
import type { LonLat } from '@winterop-com/sokkel-ui-tracking/track'
import { bearing, destination, distance } from '@winterop-com/sokkel-ui-tracking/geo'

const MINUTE = 60_000
const NM = 1852

/** The cities flown between, at their airports. */
export const CITIES = {
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

export type City = keyof typeof CITIES

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
    from: City
    to: City
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

/** A number from 0 to 1 that is the same every time for the same key. */
function hash(key: string): number {
    let value = 2166136261
    for (let index = 0; index < key.length; index += 1) {
        value ^= key.charCodeAt(index)
        value = Math.imul(value, 16777619)
    }
    return (value >>> 0) / 4294967296
}

/** A 24-bit address in the block no state is given, so no real aircraft has it. */
const addressOf = (key: string) =>
    `f${Math.floor(hash(key) * 0xfffff)
        .toString(16)
        .padStart(5, '0')}`

/** A squawk code: four octal digits, never one of the emergency codes. */
function squawkOf(key: string): string {
    const code = Math.floor(hash(`squawk ${key}`) * 4096)
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

function legOf(route: Route, from: City, to: City): Leg {
    const start = CITIES[from].at
    const end = CITIES[to].at
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

/** Every leg of the timetable, both ways, with the numbers its flights take. */
const LEGS = ROUTES.flatMap((route, index) => [
    { route, index, way: 0, leg: legOf(route, route.from, route.to), number: route.number, offset: route.offset },
    {
        route,
        index,
        way: 1,
        leg: legOf(route, route.to, route.from),
        number: route.number + 1,
        offset: (route.offset + route.every / 2) % route.every,
    },
])

/** Minutes from leaving the stand to reaching the other one. */
const blockOf = (leg: Leg) => TAXI_OUT + leg.climb + leg.cruise + leg.descent + TAXI_IN

/** Where an aircraft on a leg is, `minutes` after it left the stand; undefined once it has arrived. */
function flown(leg: Leg, minutes: number) {
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
            feet: 'ground' as const,
            knots: minutes < 1 ? 0 : 14,
            track: leg.course + 90,
            rate: 0,
        }
    }
    if (airborne > flying) {
        // Taxiing in, then standing at the gate.
        const rolled = (airborne - flying) * knotsToMetersPerMinute(16)
        const back = bearing(leg.to, leg.from)
        return {
            at: destination(leg.to, back + 120, Math.min(rolled, 1800)),
            feet: 'ground' as const,
            knots: rolled >= 1800 ? 0 : 16,
            track: back + 120,
            rate: 0,
        }
    }
    let along: number
    let feet: number
    let speed: number
    let rate: number
    if (airborne < leg.climb) {
        const share = airborne / leg.climb
        along = slow * airborne + ((fast - slow) * airborne * share) / 2
        feet = leg.level * share
        speed = airframe.slow + (airframe.cruise - airframe.slow) * share
        rate = leg.level / leg.climb
    } else if (airborne < leg.climb + leg.cruise) {
        along = leg.climbLength + fast * (airborne - leg.climb)
        feet = leg.level
        speed = airframe.cruise
        rate = 0
    } else {
        const into = airborne - leg.climb - leg.cruise
        const share = into / leg.descent
        along = leg.length - leg.descentLength + fast * into - ((fast - slow) * into * share) / 2
        feet = leg.level * (1 - share)
        speed = airframe.cruise - (airframe.cruise - airframe.slow) * share
        rate = -leg.level / leg.descent
    }
    const at = destination(leg.from, leg.course, Math.min(along, leg.length))
    const track = along >= leg.length - 50 ? bearing(leg.from, leg.to) : bearing(at, leg.to)
    return { at, feet: Math.max(0, Math.round(feet / 25) * 25), knots: speed, track, rate }
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

function circling(circuit: Circuit, at: number) {
    const lap = (2 * Math.PI * circuit.radius) / knotsToMetersPerMinute(circuit.knots)
    const angle = ((at / MINUTE / lap) % 1) * 360
    return {
        at: destination(circuit.center, angle, circuit.radius),
        feet: circuit.feet + Math.round(Math.sin((angle * Math.PI) / 90) * 100),
        knots: circuit.knots,
        track: (angle + 90) % 360,
        rate: Math.round(Math.cos((angle * Math.PI) / 90) * 200),
    }
}

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places

/** The simulated feed at a moment, in milliseconds since the epoch, as readsb's v2 API answers. */
export function simulate(at: number): ReadsbResponse {
    const ac: ReadsbAircraft[] = []
    const minutes = at / MINUTE
    for (const { route, index, way, leg, number, offset } of LEGS) {
        const block = blockOf(leg)
        const first = Math.floor((minutes - block - offset) / route.every)
        const last = Math.floor((minutes - offset) / route.every)
        for (let departure = first; departure <= last; departure += 1) {
            const into = minutes - (departure * route.every + offset)
            const where = flown(leg, into)
            if (where === undefined) continue
            const key = `${String(index)}-${String(way)}-${String(departure)}`
            // About one departure in five does not fly that day, so the sky is busier at some times than others.
            if (hash(`cancelled ${key}`) < 0.2) continue
            // Flights of the same leg share their number by the day's departure, a digit for each.
            const callsign = `TDV${String(number * 10 + (((departure % 10) + 10) % 10)).padStart(4, '0')}`
            const seen = round(hash(`seen ${key} ${String(Math.floor(at / 2000))}`) * 1.6, 1)
            ac.push({
                hex: addressOf(key),
                type: 'adsb_icao',
                flight: callsign.padEnd(8, ' '),
                t: route.airframe.type,
                category: route.airframe.category,
                alt_baro: where.feet,
                gs: round(where.knots + (where.knots === 0 ? 0 : hash(`gs ${key}`) * 6 - 3), 1),
                track: round(((where.track % 360) + 360) % 360, 2),
                baro_rate: Math.round(where.rate / 64) * 64,
                squawk: squawkOf(key),
                emergency: 'none',
                lat: round(where.at[1], 6),
                lon: round(where.at[0], 6),
                seen_pos: seen,
                seen: round(seen / 2, 1),
                messages: Math.floor(hash(`messages ${key}`) * 4000) + Math.floor(into * 120),
                rssi: round(-30 + hash(`rssi ${key}`) * 18, 1),
            })
        }
    }
    for (const circuit of CIRCUITS) {
        const where = circling(circuit, at)
        ac.push({
            hex: addressOf(circuit.key),
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

/** Where every simulated flight goes, by callsign, which no ADS-B message says: the timetable knows it. */
export function routeOf(callsign: string | undefined): { from: string; to: string } | undefined {
    const match = /^TDV(\d{3})\d$/.exec(callsign ?? '')
    if (match === null) return undefined
    const number = Number(match[1])
    const found = LEGS.find((leg) => leg.number === number)
    if (found === undefined) return undefined
    const [from, to] = found.way === 0 ? [found.route.from, found.route.to] : [found.route.to, found.route.from]
    return { from: CITIES[from].name, to: CITIES[to].name }
}
