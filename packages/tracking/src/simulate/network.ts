/**
 * A simulated machine: six processes (browser, mail, sync, updater, backup and shell) opening and
 * closing connections at their own paces, each moving bytes at a rate of its kind, read once a
 * second as a host's connection table with running byte totals. The updater downloads in bursts
 * and the backup uploads in bursts, and a process the machine has not run before (nightly-export)
 * starts at a second of its own and every ten minutes after, each time to a host in another far
 * place. Everything is drawn from the seed, so the machine behaves the same every time.
 *
 * Its hosts are addresses on the documentation networks (203.0.113.0/24, 198.51.100.0/24,
 * 192.0.2.0/24 and 2001:db8::/32), which name no real host, each placed in a plain city.
 */
import { normalizeAddress, type ConnectionRecord, type Location } from '../network'

/** The processes the machine runs from the start, each with its process id. */
export const NETWORK_PROCESSES = {
    browser: 4211,
    mail: 3302,
    sync: 2950,
    updater: 1877,
    backup: 5120,
    shell: 6034,
} as const

/** The process that turns up later, unknown to the machine. */
export const NETWORK_NEWCOMER = { name: 'nightly-export', pid: 7408 } as const

/** Where a simulated host is: its position, what a map writes for it, and its country. */
export interface NetworkPlace extends Location {
    country: string
}

type City = [city: string, country: string, lon: number, lat: number]

/** Where the common hosts are: the cities data centers and offices gather in. */
const CITIES: readonly City[] = [
    ['Frankfurt', 'Germany', 8.68, 50.11],
    ['Amsterdam', 'Netherlands', 4.9, 52.37],
    ['London', 'United Kingdom', -0.13, 51.51],
    ['Dublin', 'Ireland', -6.26, 53.35],
    ['Stockholm', 'Sweden', 18.07, 59.33],
    ['Paris', 'France', 2.35, 48.86],
    ['Ashburn', 'United States', -77.49, 39.04],
    ['New York', 'United States', -74.01, 40.71],
    ['Chicago', 'United States', -87.63, 41.88],
    ['Dallas', 'United States', -96.8, 32.78],
    ['San Jose', 'United States', -121.89, 37.34],
    ['Seattle', 'United States', -122.33, 47.61],
    ['Toronto', 'Canada', -79.38, 43.65],
    ['Oslo', 'Norway', 10.75, 59.91],
    ['Copenhagen', 'Denmark', 12.57, 55.68],
    ['Helsinki', 'Finland', 24.94, 60.17],
    ['Warsaw', 'Poland', 21.01, 52.23],
    ['Madrid', 'Spain', -3.7, 40.42],
    ['Milan', 'Italy', 9.19, 45.46],
    ['Zurich', 'Switzerland', 8.54, 47.38],
    ['Tokyo', 'Japan', 139.69, 35.69],
    ['Singapore', 'Singapore', 103.82, 1.35],
    ['Sydney', 'Australia', 151.21, -33.87],
    ['São Paulo', 'Brazil', -46.63, -23.55],
    ['Mumbai', 'India', 72.88, 19.08],
    ['Seoul', 'South Korea', 126.98, 37.57],
]

/** Where the rare hosts are, reached by nothing but a process new to the machine. */
const RARE: readonly City[] = [
    ['Reykjavik', 'Iceland', -21.94, 64.15],
    ['Nairobi', 'Kenya', 36.82, -1.29],
    ['Santiago', 'Chile', -70.67, -33.45],
    ['Auckland', 'New Zealand', 174.76, -36.85],
]

const place = ([city, country, lon, lat]: City): NetworkPlace => ({ lon, lat, label: `${city}, ${country}`, country })

/** Where a documentation address is placed, or undefined for any other address. */
export function networkPlace(address: string): NetworkPlace | undefined {
    const plain = normalizeAddress(address)
    const four = /^(203\.0\.113|198\.51\.100|192\.0\.2)\.(\d{1,3})$/.exec(plain)
    if (four !== null) {
        const host = Number(four[2])
        if (host > 255) return undefined
        if (four[1] === '203.0.113') return place(CITIES[host % CITIES.length])
        if (four[1] === '198.51.100') return place(CITIES[(host * 7 + 3) % CITIES.length])
        return place(RARE[host % RARE.length])
    }
    if (plain.startsWith('2001:db8:')) {
        const last = parseInt(plain.split(':').pop() ?? '0', 16)
        return Number.isNaN(last) ? undefined : place(CITIES[(last * 5 + 1) % CITIES.length])
    }
    return undefined
}

/** The remote hosts a simulated machine reaches: those of every day, and those only the newcomer reaches. */
export interface NetworkHosts {
    common: readonly string[]
    rare: readonly string[]
}

/** The hosts the machine reaches unless it is given others: documentation addresses only, each one `networkPlace` places. */
export function networkHosts(): { common: string[]; rare: string[] } {
    const common = [
        ...Array.from({ length: 60 }, (_, index) => `203.0.113.${String(index + 10)}`),
        ...Array.from({ length: 30 }, (_, index) => `198.51.100.${String(index + 20)}`),
        ...Array.from({ length: 8 }, (_, index) => `2001:db8:4::${(index + 1).toString(16)}`),
    ]
    const rare = Array.from({ length: RARE.length }, (_, index) => `192.0.2.${String(200 + index)}`)
    return { common, rare }
}

/** A deterministic random source, so the machine behaves the same every time. */
function seeded(seed: number): () => number {
    let state = seed
    return () => {
        state = (state + 0x6d2b79f5) | 0
        let t = Math.imul(state ^ (state >>> 15), 1 | state)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

interface Connection {
    id: number
    process: string
    pid: number
    protocol: 'tcp' | 'tcp6' | 'udp' | 'udp6'
    localAddress: string
    localPort: number
    remoteAddress: string
    remotePort: number
    state?: string
    phase: 'opening' | 'open' | 'closing'
    /** The second it closes at. */
    ends: number
    /** Seconds left while closing. */
    left: number
    /** Bytes a second it moves while open. */
    rateIn: number
    rateOut: number
    bytesIn: number
    bytesOut: number
    /** Whether it moves in bursts now and then, as a page loads. */
    bursty: boolean
}

export interface NetworkSimOptions {
    /** What the machine's connections, paces and rates are drawn from. The same seed, the same machine. */
    seed?: number
    /** The remote hosts it reaches; `networkHosts()` by default. */
    hosts?: NetworkHosts
    /** The second, counted from the machine's first, the newcomer first starts at. 60 by default. */
    newcomerAt?: number
}

export interface NetworkSimulation {
    /** Moves the machine on by a second and reads its connection table, each record stamped `at`. */
    tick: (at: number) => ConnectionRecord[]
    /** The seconds it has run, counted from its start. */
    readonly ticks: number
}

const LOCAL_FOUR = '192.168.1.20'
const LOCAL_SIX = 'fd00:1::20'
const MEGA = 1_000_000

/** The seed a machine is drawn from when none is given. */
const DEFAULT_SEED = 20261120

/**
 * A simulated machine, moved on a second at a time. It holds what it has done so far, so one
 * machine serves one run; a second machine made from the same options does the same from its start.
 */
export function createNetworkSimulation(options: NetworkSimOptions = {}): NetworkSimulation {
    const hosts = options.hosts ?? networkHosts()
    const newcomerAt = options.newcomerAt ?? 60
    const random = seeded(options.seed ?? DEFAULT_SEED)
    const between = (low: number, high: number) => low + random() * (high - low)
    const common = hosts.common.length > 0 ? hosts.common : ['203.0.113.10']
    const at = (index: number) => common[index % common.length]
    const rare = hosts.rare.length > 0 ? hosts.rare : common
    const open = new Map<number, Connection>()
    let made = 0
    let port = 49_152
    let tick = 0

    const connect = (
        process: string,
        pid: number,
        remoteAddress: string,
        remotePort: number,
        fields: {
            udp?: boolean
            life: number
            rateIn: number
            rateOut: number
            bursty?: boolean
            localAddress?: string
            localPort?: number
        },
    ) => {
        const six = remoteAddress.includes(':')
        made += 1
        port = port >= 65_000 ? 49_152 : port + 1 + Math.floor(random() * 7)
        const connection: Connection = {
            id: made,
            process,
            pid,
            protocol: `${fields.udp === true ? 'udp' : 'tcp'}${six ? '6' : ''}` as Connection['protocol'],
            localAddress: fields.localAddress ?? (six ? LOCAL_SIX : LOCAL_FOUR),
            localPort: fields.localPort ?? port,
            remoteAddress,
            remotePort,
            state: fields.udp === true ? undefined : 'SYN_SENT',
            phase: fields.udp === true ? 'open' : 'opening',
            ends: tick + Math.max(1, Math.round(fields.life)),
            left: 0,
            rateIn: fields.rateIn,
            rateOut: fields.rateOut,
            bytesIn: 0,
            bytesOut: 0,
            bursty: fields.bursty ?? false,
        }
        open.set(connection.id, connection)
        return connection
    }

    const exists = (test: (each: Connection) => boolean) => [...open.values()].some(test)
    const count = (process: string) => [...open.values()].filter((each) => each.process === process && each.phase !== 'closing').length
    const closeAll = (process: string) => {
        for (const each of open.values()) if (each.process === process && each.phase !== 'closing') each.ends = tick
    }

    /** Keeps a process's long-lived connections and opens its short ones. */
    const run = () => {
        // The browser: many short connections, mostly to the busiest hosts, some over QUIC, and a lookup now and then.
        const browsing = count('browser')
        if (browsing < 6 || (browsing < 16 && random() < 0.55)) {
            const host = at(Math.floor(common.length * random() ** 2.2))
            const quic = random() < 0.25
            connect('browser', NETWORK_PROCESSES.browser, host, 443, {
                udp: quic,
                life: between(4, 80),
                rateIn: between(2_000, 220_000),
                rateOut: between(300, 14_000),
                bursty: true,
            })
        }
        if (random() < 0.12)
            connect('browser', NETWORK_PROCESSES.browser, '192.168.1.1', 53, { udp: true, life: 2, rateIn: 300, rateOut: 90 })

        // Mail: two long connections, quiet with a message now and then.
        if (count('mail') < 2) {
            const imap = !exists((each) => each.process === 'mail' && each.remotePort === 993 && each.phase !== 'closing')
            connect('mail', NETWORK_PROCESSES.mail, imap ? at(3) : at(17), imap ? 993 : 587, {
                life: between(600, 2400),
                rateIn: between(40, 2_500),
                rateOut: between(20, 800),
                bursty: true,
            })
        }

        // Sync: a few steady connections, and its helper on the loopback.
        if (count('sync') < 3) {
            const host = [at(5), at(22), at(40)][Math.floor(random() * 3)]
            connect('sync', NETWORK_PROCESSES.sync, host, 443, {
                life: between(120, 900),
                rateIn: between(800, 40_000),
                rateOut: between(800, 70_000),
                bursty: true,
            })
        }
        if (!exists((each) => each.process === 'sync' && each.remoteAddress === '127.0.0.1'))
            connect('sync', NETWORK_PROCESSES.sync, '127.0.0.1', 7210, { life: 100_000, rateIn: 1_200, rateOut: 1_200 })

        // Shell: a session out over SSH, and one coming in from the next machine on the network.
        if (!exists((each) => each.process === 'shell' && each.remotePort === 22))
            connect('shell', NETWORK_PROCESSES.shell, at(27), 22, { life: between(900, 3000), rateIn: 600, rateOut: 250, bursty: true })
        if (!exists((each) => each.process === 'shell' && each.localPort === 22))
            connect('shell', NETWORK_PROCESSES.shell, '192.168.1.23', 52_144, {
                life: between(1200, 3600),
                rateIn: 180,
                rateOut: 900,
                localPort: 22,
                bursty: true,
            })

        // The updater: a burst of downloading every five minutes.
        const updating = tick >= 90 && (tick - 90) % 300 < 25
        if (updating && count('updater') === 0)
            connect('updater', NETWORK_PROCESSES.updater, [at(9), at(31)][Math.floor(tick / 300) % 2], 443, {
                life: 25,
                rateIn: between(6, 8.5) * MEGA,
                rateOut: between(8_000, 30_000),
            })
        if (!updating) closeAll('updater')

        // The backup: an hour's changes sent every seven minutes.
        const backing = tick >= 200 && (tick - 200) % 420 < 60
        if (backing && count('backup') === 0)
            connect('backup', NETWORK_PROCESSES.backup, at(12), 443, {
                life: 60,
                rateIn: between(10_000, 40_000),
                rateOut: between(2.9, 3.8) * MEGA,
            })
        if (!backing) closeAll('backup')

        // The newcomer: an export no one has seen the machine run, each run to the next far host.
        const exporting = tick >= newcomerAt && (tick - newcomerAt) % 600 < 90
        if (exporting && count(NETWORK_NEWCOMER.name) === 0)
            connect(NETWORK_NEWCOMER.name, NETWORK_NEWCOMER.pid, rare[Math.floor((tick - newcomerAt) / 600) % rare.length], 443, {
                life: 90,
                rateIn: between(5_000, 20_000),
                rateOut: between(300_000, 650_000),
            })
        if (!exporting) closeAll(NETWORK_NEWCOMER.name)
    }

    /** Moves each connection on a second: opened, closed, and its bytes counted. */
    const step = () => {
        for (const [id, each] of open) {
            if (each.phase === 'closing') {
                each.left -= 1
                if (each.left <= 0) open.delete(id)
                continue
            }
            if (tick >= each.ends) {
                if (each.protocol.startsWith('udp')) {
                    open.delete(id)
                    continue
                }
                each.phase = 'closing'
                each.state = random() < 0.8 ? 'TIME_WAIT' : 'CLOSE_WAIT'
                each.left = 2
                continue
            }
            if (each.phase === 'opening') {
                each.phase = 'open'
                each.state = 'ESTABLISHED'
                continue
            }
            const burst = each.bursty && random() < 0.08 ? between(3, 8) : 1
            each.bytesIn += Math.round(each.rateIn * between(0.45, 1.5) * burst)
            each.bytesOut += Math.round(each.rateOut * between(0.45, 1.5) * (burst > 1 ? 1.5 : 1))
        }
    }

    return {
        tick(time) {
            tick += 1
            step()
            run()
            return [...open.values()].map((each) => ({
                process: each.process,
                pid: each.pid,
                protocol: each.protocol,
                localAddress: each.localAddress,
                localPort: each.localPort,
                remoteAddress: each.remoteAddress,
                remotePort: each.remotePort,
                state: each.state,
                bytesIn: each.bytesIn,
                bytesOut: each.bytesOut,
                at: time,
            }))
        },
        get ticks() {
            return tick
        },
    }
}

/**
 * The machine's connection table at each of its first `seconds` seconds, the first read at `start`
 * and each a second after the last, in milliseconds since the epoch. A machine is made and run
 * afresh, so the same options give the same tables however often they are asked for.
 */
export function simulateNetwork(options: NetworkSimOptions & { start: number }, seconds: number): ConnectionRecord[][] {
    const machine = createNetworkSimulation(options)
    return Array.from({ length: Math.max(0, Math.floor(seconds)) }, (_, index) => machine.tick(options.start + index * 1000))
}
