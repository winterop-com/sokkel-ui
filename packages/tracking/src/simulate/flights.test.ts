import { describe, expect, it } from 'vitest'

import { altitudeBand, parseReadsb, verticalTrend } from '../adsb'
import { distance } from '../geo'
import { FLIGHT_CITIES, flightRoute, flightsAt, flightTrails, simulateFlights, type FlightPhase, type SimFlight } from '../simulate'
import { FOOT, KNOT, type LonLat } from '../track'

const MINUTE = 60_000
const NOW = Date.parse('2026-11-20T14:30:00Z')

/** The first flight of the timetable that is at a phase at a moment. */
function flightIn(phase: FlightPhase, at = NOW): SimFlight {
    const found = flightsAt(at).find((flight) => flight.phase === phase)
    if (found === undefined) throw new Error(`No flight is in ${phase}.`)
    return found
}

/** A flight at another moment, by its address. */
const again = (hex: string, at: number, seed?: number) => flightsAt(at, { seed }).find((flight) => flight.hex === hex)

describe('simulateFlights', () => {
    it('gives the same sky for the same moment, however often and in whatever order it is asked', () => {
        const first = JSON.stringify(simulateFlights(NOW))
        simulateFlights(NOW + 37 * MINUTE)
        simulateFlights(NOW - 5 * 60 * MINUTE)
        expect(JSON.stringify(simulateFlights(NOW))).toBe(first)
        expect(JSON.stringify(flightsAt(NOW))).toBe(JSON.stringify(flightsAt(NOW)))
    })

    it('gives the sky the flight watch has always drawn at a moment', () => {
        const answer = simulateFlights(NOW)
        expect(answer.now).toBe(NOW)
        expect(answer.msg).toBe('No error')
        expect(answer.total).toBe(answer.ac?.length)
        expect(answer.ac?.[0]).toEqual({
            hex: 'f1ab72',
            type: 'adsb_icao',
            flight: 'TDV1004 ',
            t: 'B738',
            category: 'A3',
            alt_baro: 18850,
            gs: 334.1,
            track: 270.66,
            baro_rate: -1792,
            squawk: '7016',
            emergency: 'none',
            lat: 60.293045,
            lon: 6.672929,
            seen_pos: 1,
            seen: 0.5,
            messages: 4057,
            rssi: -19,
        })
        expect(simulateFlights(NOW + 1234).ac).toHaveLength(42)
        expect(simulateFlights(NOW + 60 * MINUTE + 1234).ac).toHaveLength(41)
    })

    it('is read by the readsb reader, every aircraft, in SI units', () => {
        const answer = simulateFlights(NOW)
        const tracks = parseReadsb(answer, { source: 'simulated' })
        expect(tracks).toHaveLength(answer.ac?.length ?? 0)
        const flights = new Map(flightsAt(NOW).map((flight) => [flight.hex, flight]))
        for (const track of tracks) {
            const flight = flights.get(track.id)
            expect(flight, track.id).toBeDefined()
            if (flight === undefined) continue
            expect(track.kind).toBe('aircraft')
            expect(track.source).toBe('simulated')
            expect(track.lon).toBeCloseTo(flight.lon, 5)
            expect(track.lat).toBeCloseTo(flight.lat, 5)
            expect(track.properties?.callsign).toBe(flight.callsign)
            expect(track.properties?.aircraftType).toBe(flight.aircraftType)
            expect(track.properties?.onGround).toBe(flight.altitude === 'ground')
            if (flight.altitude !== 'ground') expect(track.altitude).toBeCloseTo(flight.altitude * FOOT, 6)
            // The feed says a speed within three knots of the timetable's, and when it was heard, within two seconds.
            expect(Math.abs((track.speed ?? 0) / KNOT - flight.speed)).toBeLessThanOrEqual(3.05)
            expect(NOW - (track.updatedAt ?? 0)).toBeGreaterThanOrEqual(0)
            expect(NOW - (track.updatedAt ?? 0)).toBeLessThanOrEqual(2000)
        }
    })

    it('gives each aircraft an address of its own in the block no state is given, and a squawk that is no emergency', () => {
        for (const offset of [0, 3, 11, 24]) {
            const aircraft = simulateFlights(NOW + offset * 60 * MINUTE).ac ?? []
            expect(new Set(aircraft.map((each) => each.hex)).size).toBe(aircraft.length)
            for (const each of aircraft) {
                expect(each.hex).toMatch(/^f[0-9a-f]{5}$/)
                expect(each.squawk).toMatch(/^[0-7]{4}$/)
                expect(['7500', '7600', '7700']).not.toContain(each.squawk)
            }
        }
    })

    it('flies the timetable under TDV callsigns, and three light aircraft with none', () => {
        const flights = flightsAt(NOW)
        const circuits = flights.filter((flight) => flight.phase === 'circuit')
        expect(circuits).toHaveLength(3)
        for (const circuit of circuits) {
            expect(circuit.callsign).toBeUndefined()
            expect(circuit.from).toBeUndefined()
            expect(circuit.category).toBe('A1')
        }
        for (const flight of flights.filter((each) => each.phase !== 'circuit')) {
            expect(flight.callsign).toMatch(/^TDV\d{4}$/)
            expect(flight.from).not.toBe(flight.to)
            expect(flight.departed).toBeLessThanOrEqual(NOW)
        }
        const answer = simulateFlights(NOW)
        expect(answer.ac?.filter((each) => each.flight === undefined)).toHaveLength(3)
    })

    it('draws another sky from another seed, and the same one from the same seed', () => {
        const base = simulateFlights(NOW).ac?.map((each) => each.hex)
        const other = simulateFlights(NOW, { seed: 7 }).ac?.map((each) => each.hex)
        expect(other).not.toEqual(base)
        expect(simulateFlights(NOW, { seed: 7 }).ac?.map((each) => each.hex)).toEqual(other)
        expect(simulateFlights(NOW, { seed: 0 }).ac?.map((each) => each.hex)).toEqual(base)
        // The timetable is the same under every seed: only which departures fly, and what they send, differ.
        const seeded = flightsAt(NOW, { seed: 7 })
        expect(seeded.filter((flight) => flight.phase === 'circuit')).toHaveLength(3)
        for (const flight of seeded) if (flight.callsign !== undefined) expect(flightRoute(flight.callsign)).toBeDefined()
    })
})

describe('a simulated flight', () => {
    it('rolls out, climbs, cruises, descends and rolls in, between its two cities', () => {
        // Followed from the stand: a flight rolling out now, read every half minute until it is gone.
        const flight = flightIn('taxi-out')
        const departed = flight.departed ?? NOW
        const [from, to] = [FLIGHT_CITIES[flight.from ?? 'oslo'].at, FLIGHT_CITIES[flight.to ?? 'oslo'].at]
        const phases: FlightPhase[] = []
        let last: SimFlight | undefined
        for (let at = departed; at < departed + 6 * 60 * MINUTE; at += MINUTE / 2) {
            const now = again(flight.hex, at)
            if (now === undefined) break
            if (phases.at(-1) !== now.phase) phases.push(now.phase)
            if (now.phase === 'taxi-out') {
                expect(now.altitude).toBe('ground')
                expect(distance([now.lon, now.lat], from)).toBeLessThan(2000)
            }
            if (now.phase === 'climb') expect(now.rate).toBeGreaterThan(0)
            if (now.phase === 'cruise') expect(now.rate).toBe(0)
            if (now.phase === 'descent') expect(now.rate).toBeLessThan(0)
            if (now.phase === 'taxi-in') {
                expect(now.altitude).toBe('ground')
                expect(distance([now.lon, now.lat], to)).toBeLessThan(2500)
            }
            // In the air it only ever gets nearer to where it is going.
            if (last !== undefined && last.altitude !== 'ground' && now.altitude !== 'ground')
                expect(distance([now.lon, now.lat], to)).toBeLessThan(distance([last.lon, last.lat], to))
            last = now
        }
        expect(phases).toEqual(['taxi-out', 'climb', 'cruise', 'descent', 'taxi-in'])
        // Before it left the stand, and once the block is over, it is not there.
        expect(again(flight.hex, departed - 1)).toBeUndefined()
        expect(last?.phase).toBe('taxi-in')
    })

    it('reaches its level in the climb and leaves it in the descent', () => {
        const cruising = flightIn('cruise')
        expect(cruising.altitude).toBeGreaterThanOrEqual(10_000)
        const departed = cruising.departed ?? NOW
        const levels: number[] = []
        for (let at = departed; ; at += MINUTE / 4) {
            const now = again(cruising.hex, at)
            if (now === undefined) break
            levels.push(now.altitude === 'ground' ? 0 : now.altitude)
        }
        const top = Math.max(...levels)
        expect(top).toBe(cruising.altitude)
        const rise = levels.slice(0, levels.indexOf(top) + 1)
        const fall = levels.slice(levels.lastIndexOf(top))
        expect(rise).toEqual([...rise].sort((a, b) => a - b))
        expect(fall).toEqual([...fall].sort((a, b) => b - a))
    })

    it('moves no farther between two moments in the air than its speed takes it', () => {
        // Every aircraft out over two hours, read every ten seconds: no position in the air ever jumps.
        const before = new Map<string, SimFlight>()
        for (let at = NOW; at < NOW + 120 * MINUTE; at += 10_000) {
            for (const flight of flightsAt(at)) {
                const was = before.get(flight.hex)
                // On the ground an aircraft is put on the runway as it takes off, a step from where it rolled to.
                if (was !== undefined && was.altitude !== 'ground' && flight.altitude !== 'ground') {
                    const moved = distance([was.lon, was.lat], [flight.lon, flight.lat])
                    const reach = Math.max(was.speed, flight.speed, 20) * KNOT * 10
                    expect(moved, `${flight.callsign ?? flight.hex} at ${new Date(at).toISOString()}`).toBeLessThan(reach * 1.25)
                }
                before.set(flight.hex, flight)
            }
        }
        expect(before.size).toBeGreaterThan(60)
    })

    it('reads as climbing, level and descending through the readers of a live feed', () => {
        const tracks = new Map(parseReadsb(simulateFlights(NOW)).map((track) => [track.id, track]))
        expect(verticalTrend(tracks.get(flightIn('climb').hex) ?? {})).toBe('climbing')
        expect(verticalTrend(tracks.get(flightIn('cruise').hex) ?? {})).toBe('level')
        expect(verticalTrend(tracks.get(flightIn('descent').hex) ?? {})).toBe('descending')
        const ground = flightsAt(NOW).find((flight) => flight.altitude === 'ground')
        expect(altitudeBand(tracks.get(ground?.hex ?? '') ?? {})).toBe('ground')
    })
})

describe('flightRoute', () => {
    it('says where a callsign flies, each way', () => {
        expect(flightRoute('TDV1003')).toEqual({ from: 'Oslo', to: 'Bergen' })
        expect(flightRoute('TDV1011')).toEqual({ from: 'Bergen', to: 'Oslo' })
        expect(flightRoute('TDV6301')).toEqual({ from: 'Gothenburg', to: 'Aberdeen' })
    })

    it('agrees with the cities every simulated flight is between', () => {
        for (const flight of flightsAt(NOW)) {
            if (flight.from === undefined || flight.to === undefined) continue
            expect(flightRoute(flight.callsign)).toEqual({ from: FLIGHT_CITIES[flight.from].name, to: FLIGHT_CITIES[flight.to].name })
        }
    })

    it('knows no route for any other callsign, or for none', () => {
        expect(flightRoute('XYZ1')).toBeUndefined()
        expect(flightRoute('TDV9999')).toBeUndefined()
        expect(flightRoute(undefined)).toBeUndefined()
    })
})

describe('flightTrails', () => {
    it('gives each aircraft where the feed said it was, oldest first, without where it is now', () => {
        const trails = flightTrails(NOW, { minutes: 5 })
        const cruising = flightIn('cruise')
        const trail = trails.get(cruising.hex) ?? []
        expect(trail).toHaveLength(20)
        const said = (at: number): LonLat | undefined => {
            const row = simulateFlights(at).ac?.find((each) => each.hex === cruising.hex)
            return row?.lon === undefined || row.lat === undefined ? undefined : [row.lon, row.lat]
        }
        expect(trail[0]).toEqual(said(NOW - 5 * MINUTE))
        expect(trail[19]).toEqual(said(NOW - 15_000))
        expect(trail).not.toContainEqual(said(NOW))
    })

    it('starts a trail where the aircraft was first heard', () => {
        const rolling = flightIn('taxi-out')
        const minutes = Math.ceil((NOW - (rolling.departed ?? NOW)) / MINUTE)
        const trail = flightTrails(NOW, { minutes: 10 }).get(rolling.hex) ?? []
        expect(trail.length).toBeLessThanOrEqual(minutes * 4)
    })

    it('takes the step and the seed it is given', () => {
        const cruising = flightIn('cruise')
        expect(flightTrails(NOW, { minutes: 5, step: MINUTE }).get(cruising.hex)).toHaveLength(5)
        expect(flightTrails(NOW, { minutes: 0 }).size).toBe(0)
        const seeded = flightTrails(NOW, { minutes: 2, seed: 7 })
        expect([...seeded.keys()].sort()).not.toEqual([...flightTrails(NOW, { minutes: 2 }).keys()].sort())
    })

    it('draws at a moment played back the trails that moment had live', () => {
        // A watch that followed the feed every fifteen seconds for ten minutes holds what a replay works out.
        const kept = new Map<string, LonLat[]>()
        for (let at = NOW - 10 * MINUTE; at < NOW; at += 15_000) {
            for (const each of simulateFlights(at).ac ?? []) {
                if (each.lon === undefined || each.lat === undefined) continue
                kept.set(each.hex, [...(kept.get(each.hex) ?? []), [each.lon, each.lat]])
            }
        }
        const replayed = flightTrails(NOW, { minutes: 10 })
        expect(Object.fromEntries(replayed)).toEqual(Object.fromEntries(kept))
    })
})
