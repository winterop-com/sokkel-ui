import { describe, expect, it } from 'vitest'

import { addressScope, createFlowTracker, type ConnectionRecord } from '../network'
import {
    createNetworkSimulation,
    NETWORK_NEWCOMER,
    NETWORK_PROCESSES,
    networkHosts,
    networkPlace,
    simulateNetwork,
    type NetworkSimOptions,
} from '../simulate'

const START = Date.parse('2026-11-20T14:00:00Z')

/** A machine's tables over its first seconds, each read a second after the last. */
const run = (seconds: number, options: NetworkSimOptions = {}) => simulateNetwork({ ...options, start: START }, seconds)

/** What tells one connection from another across readings. */
const keyOf = (record: ConnectionRecord) =>
    [record.pid, record.protocol, record.localAddress, record.localPort, record.remoteAddress, record.remotePort].join(' ')

describe('createNetworkSimulation', () => {
    it('does the same every time it is made from the same options', () => {
        const [first, second] = [createNetworkSimulation(), createNetworkSimulation()]
        for (let tick = 1; tick <= 700; tick += 1) {
            const at = START + tick * 1000
            expect(second.tick(at)).toEqual(first.tick(at))
        }
        expect(first.ticks).toBe(700)
    })

    it('reads the tables the network watch has always drawn', () => {
        const tables = run(1000, { newcomerAt: 960 })
        expect([1, 10, 100, 900, 1000].map((second) => tables[second - 1].length)).toEqual([6, 15, 23, 24, 27])
        expect(tables[0].map((record) => `${record.process ?? ''} ${record.remoteAddress}:${String(record.remotePort)}`)).toEqual([
            'browser 198.51.100.35:443',
            'mail 203.0.113.13:993',
            'sync 203.0.113.50:443',
            'sync 127.0.0.1:7210',
            'shell 203.0.113.37:22',
            'shell 192.168.1.23:52144',
        ])
    })

    it('stamps each record with the moment it was read at', () => {
        const machine = createNetworkSimulation()
        expect(machine.ticks).toBe(0)
        expect(machine.tick(START).every((record) => record.at === START)).toBe(true)
        expect(machine.tick(START + 5000).every((record) => record.at === START + 5000)).toBe(true)
        expect(machine.ticks).toBe(2)
    })

    it('draws another machine from another seed', () => {
        const [base, other] = [run(120), run(120, { seed: 7 })]
        expect(JSON.stringify(other)).not.toBe(JSON.stringify(base))
        expect(JSON.stringify(run(120, { seed: 7 }))).toBe(JSON.stringify(other))
        expect(JSON.stringify(run(120, { seed: 20261120 }))).toBe(JSON.stringify(base))
    })

    it('runs its six processes from the first second, each under its own process id', () => {
        const tables = run(400)
        const seen = new Map<string, number>()
        for (const record of tables.flat()) seen.set(record.process ?? '', record.pid ?? 0)
        expect(Object.fromEntries(seen)).toEqual({ ...NETWORK_PROCESSES, [NETWORK_NEWCOMER.name]: NETWORK_NEWCOMER.pid })
        expect(new Set(tables[0].map((record) => record.process))).toEqual(new Set(['browser', 'mail', 'sync', 'shell']))
    })

    it('opens, establishes and closes each TCP connection, and gives a datagram no state', () => {
        const states = new Map<string, string[]>()
        for (const table of run(900)) {
            for (const record of table) {
                const key = keyOf(record)
                const seen = states.get(key) ?? []
                const state = record.state ?? 'none'
                if (seen.at(-1) !== state) seen.push(state)
                states.set(key, seen)
            }
        }
        const paths = new Set([...states].map(([key, seen]) => `${key.split(' ')[1].replace('6', '')}: ${seen.join(' > ')}`))
        expect(paths.has('tcp: SYN_SENT > ESTABLISHED > TIME_WAIT')).toBe(true)
        expect(paths.has('tcp: SYN_SENT > ESTABLISHED > CLOSE_WAIT')).toBe(true)
        expect(paths.has('udp: none')).toBe(true)
        for (const path of paths) {
            expect(path).toMatch(/^(tcp: SYN_SENT( > ESTABLISHED)?( > (TIME_WAIT|CLOSE_WAIT))?|udp: none)$/)
        }
    })

    it('counts bytes as running totals that never fall, from nothing', () => {
        const totals = new Map<string, { bytesIn: number; bytesOut: number }>()
        let moved = 0
        for (const table of run(600)) {
            for (const record of table) {
                const key = keyOf(record)
                const was = totals.get(key)
                if (was === undefined) {
                    expect(record.bytesIn).toBe(0)
                    expect(record.bytesOut).toBe(0)
                } else {
                    expect(record.bytesIn).toBeGreaterThanOrEqual(was.bytesIn)
                    expect(record.bytesOut).toBeGreaterThanOrEqual(was.bytesOut)
                    moved += (record.bytesIn ?? 0) - was.bytesIn
                }
                totals.set(key, { bytesIn: record.bytesIn ?? 0, bytesOut: record.bytesOut ?? 0 })
            }
        }
        expect(moved).toBeGreaterThan(100_000_000)
    })

    it('talks out from the machine on the local network, over IPv4 and IPv6', () => {
        const records = run(300).flat()
        for (const record of records) {
            expect(['tcp', 'tcp6', 'udp', 'udp6']).toContain(record.protocol)
            expect(record.localAddress).toBe(record.protocol.endsWith('6') ? 'fd00:1::20' : '192.168.1.20')
            expect(addressScope(record.localAddress)).toBe('private')
            expect(record.remoteAddress.includes(':')).toBe(record.protocol.endsWith('6'))
        }
        expect(records.some((record) => record.protocol === 'tcp6')).toBe(true)
        expect(records.some((record) => record.protocol === 'udp' && record.remotePort === 53)).toBe(true)
        expect(records.some((record) => record.localPort === 22 && record.remoteAddress === '192.168.1.23')).toBe(true)
        expect(records.some((record) => record.remoteAddress === '127.0.0.1')).toBe(true)
    })

    it('downloads an update in a burst from its ninetieth second, and backs up from its two hundredth', () => {
        const tables = run(700)
        const running = (process: string) =>
            tables.flatMap((table, index) =>
                table.some((record) => record.process === process && record.state === 'ESTABLISHED') ? [index + 1] : [],
            )
        const updater = running('updater')
        expect(updater[0]).toBe(91)
        expect(updater.filter((second) => second < 200)).toHaveLength(24)
        expect(updater.some((second) => second > 390 && second < 420)).toBe(true)
        const backup = running('backup')
        expect(backup[0]).toBe(201)
        expect(backup.filter((second) => second < 300)).toHaveLength(59)
        expect(backup.some((second) => second > 620 && second < 690)).toBe(true)
    })

    it('starts the newcomer at its second and every ten minutes after, each run to the next far host', () => {
        const { rare, common } = networkHosts()
        const tables = run(1400, { newcomerAt: 100 })
        const runs = tables.flatMap((table, index) =>
            table
                .filter((record) => record.process === NETWORK_NEWCOMER.name)
                .map((record) => ({ second: index + 1, host: record.remoteAddress })),
        )
        expect(runs[0].second).toBe(100)
        expect(runs.every((each) => rare.includes(each.host) && !common.includes(each.host))).toBe(true)
        const first = runs.filter((each) => each.second < 700)
        const second = runs.filter((each) => each.second >= 700 && each.second < 1300)
        expect(first.at(-1)?.second).toBeLessThan(200)
        expect(second[0].second).toBe(700)
        expect(new Set(first.map((each) => each.host))).toEqual(new Set([rare[0]]))
        expect(new Set(second.map((each) => each.host))).toEqual(new Set([rare[1]]))
        expect(runs.some((each) => each.second >= 1300)).toBe(true)
        // A minute in by default.
        const usual = run(70).findIndex((table) => table.some((record) => record.process === NETWORK_NEWCOMER.name))
        expect(usual + 1).toBe(60)
    })

    it('reaches the hosts it is given, and stands on one when given none', () => {
        const given = run(200, { hosts: { common: ['198.51.100.7', '2001:db8::9'], rare: ['192.0.2.9'] }, newcomerAt: 20 }).flat()
        const remotes = new Set(given.map((record) => record.remoteAddress))
        expect([...remotes].sort()).toEqual(['127.0.0.1', '192.0.2.9', '192.168.1.1', '192.168.1.23', '198.51.100.7', '2001:db8::9'].sort())
        const none = run(200, { hosts: { common: [], rare: [] }, newcomerAt: 20 }).flat()
        expect(
            new Set(none.filter((record) => addressScope(record.remoteAddress) === 'public').map((record) => record.remoteAddress)),
        ).toEqual(new Set(['203.0.113.10']))
    })

    it('is gathered by the flow tracker into processes with byte rates', () => {
        const tracker = createFlowTracker({ window: 10_000, locate: networkPlace })
        const tables = run(110)
        for (const table of tables) tracker.add(table)
        const at = START + 109 * 1000
        const processes = new Map(tracker.byProcess(at).map((group) => [group.key, group]))
        // The updater is mid-burst: six to eight and a half megabytes a second, give or take its second-to-second swing.
        expect(processes.get('updater')?.rateIn).toBeGreaterThan(2_500_000)
        expect(processes.get('updater')?.rateIn).toBeLessThan(13_000_000)
        expect(processes.get('browser')?.connections).toBeGreaterThanOrEqual(6)
        const remotes = tracker.byRemote(at)
        expect(remotes.filter((remote) => remote.location !== undefined).length).toBeGreaterThan(5)
        expect(remotes.find((remote) => remote.address === '127.0.0.1')?.location).toBeUndefined()
    })
})

describe('simulateNetwork', () => {
    it('reads the same tables as a machine moved on a second at a time', () => {
        const machine = createNetworkSimulation({ newcomerAt: 30 })
        const stepped = Array.from({ length: 300 }, (_, index) => machine.tick(START + index * 1000))
        expect(run(300, { newcomerAt: 30 })).toEqual(stepped)
    })

    it('plays a span back as it was live: a shorter run is the start of a longer one', () => {
        const long = run(500)
        expect(run(200)).toEqual(long.slice(0, 200))
        expect(run(0)).toEqual([])
        expect(long[0].every((record) => record.at === START)).toBe(true)
        expect(long[499].every((record) => record.at === START + 499_000)).toBe(true)
    })
})

describe('networkHosts and networkPlace', () => {
    it('name documentation addresses only, each placed in a city', () => {
        const { common, rare } = networkHosts()
        expect(common).toHaveLength(98)
        expect(rare).toHaveLength(4)
        expect(new Set([...common, ...rare]).size).toBe(102)
        for (const address of [...common, ...rare]) {
            expect(address).toMatch(/^(203\.0\.113\.|198\.51\.100\.|192\.0\.2\.|2001:db8:)/)
            const place = networkPlace(address)
            expect(place, address).toBeDefined()
            expect(place?.label).toBe(`${place?.label.split(', ')[0] ?? ''}, ${place?.country ?? ''}`)
            expect(Math.abs(place?.lon ?? 999)).toBeLessThanOrEqual(180)
            expect(Math.abs(place?.lat ?? 999)).toBeLessThanOrEqual(90)
        }
    })

    it('place the rare hosts in countries no common host is in', () => {
        const { common, rare } = networkHosts()
        const countries = new Set(common.map((address) => networkPlace(address)?.country))
        const far = rare.map((address) => networkPlace(address)?.country)
        expect(far).toEqual(['Iceland', 'Kenya', 'Chile', 'New Zealand'])
        for (const country of far) expect(countries.has(country)).toBe(false)
    })

    it('place an address however it is written, and no address off the documentation networks', () => {
        expect(networkPlace('203.0.113.10')).toEqual({
            lon: -121.89,
            lat: 37.34,
            label: 'San Jose, United States',
            country: 'United States',
        })
        expect(networkPlace('[2001:DB8:4::1]:443')).toEqual(networkPlace('2001:db8:4::1'))
        expect(networkPlace('::ffff:203.0.113.10')).toEqual(networkPlace('203.0.113.10'))
        expect(networkPlace('192.0.2.200')?.label).toBe('Reykjavik, Iceland')
        expect(networkPlace('10.0.0.1')).toBeUndefined()
        expect(networkPlace('192.168.1.23')).toBeUndefined()
        expect(networkPlace('203.0.113.999')).toBeUndefined()
        expect(networkPlace('not an address')).toBeUndefined()
    })
})
