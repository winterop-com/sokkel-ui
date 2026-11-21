import { describe, expect, it } from 'vitest'

import { evaluateCheck, httpCheck } from '../checks'
import { incidentsAt, parseGdacs, parseMetAlerts, parseUsgsQuakes } from '../events'
import { parseOmmCsv, parseStationPosition, satelliteTracks, STATION_ID } from '../orbits'
import { serverSpell, simulateAnswer } from './health'
import { simulateDisasters, simulateQuakes, simulateWarnings } from './incidents'
import { ORBIT_EPOCH, simulateOmmCsv, simulateStation } from './orbits'

const NOW = Date.parse('2026-11-20T18:00:00Z')
const HOUR = 3_600_000

describe('the simulated incidents', () => {
    it('are the same for the same moment and seed, and differ by seed', () => {
        expect(simulateQuakes(NOW)).toEqual(simulateQuakes(NOW))
        expect(simulateWarnings(NOW, { seed: 3 })).toEqual(simulateWarnings(NOW, { seed: 3 }))
        expect(simulateQuakes(NOW, { seed: 1 })).not.toEqual(simulateQuakes(NOW, { seed: 2 }))
    })

    it('give a day of earthquakes the USGS reader reads whole, newest first', () => {
        const feed = simulateQuakes(NOW)
        const quakes = parseUsgsQuakes(feed)
        expect(quakes).toHaveLength(feed.features.length)
        expect(quakes.length).toBeGreaterThan(20)
        for (const quake of quakes) {
            expect(quake.at).toBeLessThanOrEqual(NOW)
            expect(quake.at).toBeGreaterThan(NOW - 24 * HOUR)
            expect(quake.magnitude).toBeGreaterThanOrEqual(2.5)
            expect(Math.abs(quake.lon)).toBeLessThanOrEqual(180)
        }
        expect(quakes.map((quake) => quake.at)).toEqual(quakes.map((quake) => quake.at).sort((a, b) => b - a))
    })

    it('keep an earthquake as it was while it stays in the day', () => {
        const before = parseUsgsQuakes(simulateQuakes(NOW))
        const after = parseUsgsQuakes(simulateQuakes(NOW + HOUR))
        const kept = after.filter((quake) => quake.at <= NOW)
        expect(kept.length).toBeGreaterThan(0)
        for (const quake of kept) expect(before.find((other) => other.id === quake.id)).toEqual(quake)
    })

    it('give disasters that hold at the moment, which the GDACS reader reads', () => {
        const disasters = parseGdacs(simulateDisasters(NOW))
        expect(disasters.length).toBeGreaterThan(0)
        expect(incidentsAt(disasters, NOW)).toHaveLength(disasters.length)
        expect(new Set(disasters.map((disaster) => disaster.id)).size).toBe(disasters.length)
        for (const disaster of disasters) expect(disaster.kind).not.toBe('other')
    })

    it('give weather warnings with their areas, none of them over', () => {
        let most = 0
        for (let hour = 0; hour < 48; hour += 6) {
            const warnings = parseMetAlerts(simulateWarnings(NOW + hour * HOUR))
            most = Math.max(most, warnings.length)
            for (const warning of warnings) {
                expect(warning.area).toBeDefined()
                expect(warning.until).toBeGreaterThanOrEqual(NOW + hour * HOUR)
                expect(['moderate', 'severe', 'extreme']).toContain(warning.severity)
            }
        }
        expect(most).toBeGreaterThan(0)
    })
})

describe('the simulated satellites', () => {
    it('are a catalog the OMM reader reads, each placed at any moment', () => {
        const satellites = parseOmmCsv(simulateOmmCsv())
        expect(satellites).toHaveLength(12)
        expect(satellites[0]).toMatchObject({ id: STATION_ID, name: 'STATION', epoch: ORBIT_EPOCH })
        const tracks = satelliteTracks(satellites, NOW)
        expect(tracks).toHaveLength(12)
        expect(tracks[0].altitude).toBeGreaterThan(350_000)
        expect(tracks[0].altitude).toBeLessThan(480_000)
    })

    it('answer for the station as a position service does, where the catalog places it', () => {
        const station = parseStationPosition(simulateStation(NOW))
        const [placed] = satelliteTracks(parseOmmCsv(simulateOmmCsv()).slice(0, 1), NOW)
        expect(station?.id).toBe(STATION_ID)
        expect(station?.lon).toBeCloseTo(placed.lon, 4)
        expect(station?.lat).toBeCloseTo(placed.lat, 4)
        expect(station?.altitude).toBeCloseTo(placed.altitude ?? 0, -2)
        expect(station?.updatedAt).toBe(NOW)
    })
})

describe('the simulated server', () => {
    const server = { id: 'api', seed: 7 }

    it('answers the same at the same moment, with the body the app names', () => {
        const answer = simulateAnswer(NOW, { ...server, silent: 0, slow: 0 }, { body: { version: '2.1' } }, '/info')
        expect(answer).toEqual(simulateAnswer(NOW, { ...server, silent: 0, slow: 0 }, { body: { version: '2.1' } }, '/info'))
        expect(answer).toMatchObject({ at: NOW, status: 200, body: '{"version":"2.1"}' })
        expect(answer.latency).toBeGreaterThan(100)
        expect(answer.latency).toBeLessThan(280)
    })

    it('runs slow in a slow spell and gives no answer in a silent one', () => {
        expect(serverSpell(NOW, { ...server, slow: 1, silent: 0 })).toBe('slow')
        const slow = simulateAnswer(NOW, { ...server, slow: 1, silent: 0 })
        expect(evaluateCheck(httpCheck(), slow).status).toBe('degraded')
        const silent = simulateAnswer(NOW, { ...server, silent: 1 })
        expect(silent.status).toBeUndefined()
        expect(evaluateCheck(httpCheck(), silent)).toMatchObject({ status: 'down', failure: { reason: 'unreachable' } })
    })

    it('is well most of the time', () => {
        let well = 0
        for (let spell = 0; spell < 200; spell += 1) if (serverSpell(NOW + spell * 600_000, server) === 'well') well += 1
        expect(well).toBeGreaterThan(160)
        expect(well).toBeLessThan(200)
    })
})
