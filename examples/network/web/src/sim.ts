/**
 * The simulated machine: six processes (browser, mail, sync, updater, backup and shell) opening and
 * closing connections at their own paces, each moving bytes at a rate of its kind, read once a
 * second as a host's connection table with running byte totals. The updater downloads in bursts
 * and the backup uploads in bursts, and a process the machine has not run before (nightly-export)
 * starts a minute after the page opens and every ten minutes after, each time to a host in another
 * far place. Everything is drawn from a fixed seed, so the machine behaves the same on every load.
 */

import type { ConnectionRecord } from '@winterop-com/sokkel-ui-tracking/network'

/** The processes the machine runs from the start, each with its process id. */
export const PROCESSES = {
    browser: 4211,
    mail: 3302,
    sync: 2950,
    updater: 1877,
    backup: 5120,
    shell: 6034,
} as const

/** The process that turns up later, unknown to the machine. */
export const NEWCOMER = { name: 'nightly-export', pid: 7408 } as const

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
    /** The tick it closes at. */
    ends: number
    /** Ticks left while closing. */
    left: number
    /** Bytes a second it moves while open. */
    rateIn: number
    rateOut: number
    bytesIn: number
    bytesOut: number
    /** Whether it moves in bursts now and then, as a page loads. */
    bursty: boolean
}

export interface Simulation {
    /** Moves the machine on by a second and reads its connection table at `at`. */
    tick: (at: number) => ConnectionRecord[]
    /** The tick it has reached, counted from its start. */
    readonly ticks: number
}

const LOCAL_FOUR = '192.168.1.20'
const LOCAL_SIX = 'fd00:1::20'
const MEGA = 1_000_000

/**
 * A machine whose remote hosts are `common` (reached every day) and `rare` (reached by the newcomer
 * only). `newcomerAt` is the tick the newcomer first starts.
 */
export function createSimulation(hosts: { common: readonly string[]; rare: readonly string[] }, newcomerAt: number): Simulation {
    const random = seeded(20261120)
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
            connect('browser', PROCESSES.browser, host, 443, {
                udp: quic,
                life: between(4, 80),
                rateIn: between(2_000, 220_000),
                rateOut: between(300, 14_000),
                bursty: true,
            })
        }
        if (random() < 0.12) connect('browser', PROCESSES.browser, '192.168.1.1', 53, { udp: true, life: 2, rateIn: 300, rateOut: 90 })

        // Mail: two long connections, quiet with a message now and then.
        if (count('mail') < 2) {
            const imap = !exists((each) => each.process === 'mail' && each.remotePort === 993 && each.phase !== 'closing')
            connect('mail', PROCESSES.mail, imap ? at(3) : at(17), imap ? 993 : 587, {
                life: between(600, 2400),
                rateIn: between(40, 2_500),
                rateOut: between(20, 800),
                bursty: true,
            })
        }

        // Sync: a few steady connections, and its helper on the loopback.
        if (count('sync') < 3) {
            const host = [at(5), at(22), at(40)][Math.floor(random() * 3)]
            connect('sync', PROCESSES.sync, host, 443, {
                life: between(120, 900),
                rateIn: between(800, 40_000),
                rateOut: between(800, 70_000),
                bursty: true,
            })
        }
        if (!exists((each) => each.process === 'sync' && each.remoteAddress === '127.0.0.1'))
            connect('sync', PROCESSES.sync, '127.0.0.1', 7210, { life: 100_000, rateIn: 1_200, rateOut: 1_200 })

        // Shell: a session out over SSH, and one coming in from the next machine on the network.
        if (!exists((each) => each.process === 'shell' && each.remotePort === 22))
            connect('shell', PROCESSES.shell, at(27), 22, { life: between(900, 3000), rateIn: 600, rateOut: 250, bursty: true })
        if (!exists((each) => each.process === 'shell' && each.localPort === 22))
            connect('shell', PROCESSES.shell, '192.168.1.23', 52_144, {
                life: between(1200, 3600),
                rateIn: 180,
                rateOut: 900,
                localPort: 22,
                bursty: true,
            })

        // The updater: a burst of downloading every five minutes.
        const updating = tick >= 90 && (tick - 90) % 300 < 25
        if (updating && count('updater') === 0)
            connect('updater', PROCESSES.updater, [at(9), at(31)][Math.floor(tick / 300) % 2], 443, {
                life: 25,
                rateIn: between(6, 8.5) * MEGA,
                rateOut: between(8_000, 30_000),
            })
        if (!updating) closeAll('updater')

        // The backup: an hour's changes sent every seven minutes.
        const backing = tick >= 200 && (tick - 200) % 420 < 60
        if (backing && count('backup') === 0)
            connect('backup', PROCESSES.backup, at(12), 443, {
                life: 60,
                rateIn: between(10_000, 40_000),
                rateOut: between(2.9, 3.8) * MEGA,
            })
        if (!backing) closeAll('backup')

        // The newcomer: an export no one has seen the machine run, each run to the next far host.
        const exporting = tick >= newcomerAt && (tick - newcomerAt) % 600 < 90
        if (exporting && count(NEWCOMER.name) === 0)
            connect(NEWCOMER.name, NEWCOMER.pid, rare[Math.floor((tick - newcomerAt) / 600) % rare.length], 443, {
                life: 90,
                rateIn: between(5_000, 20_000),
                rateOut: between(300_000, 650_000),
            })
        if (!exporting) closeAll(NEWCOMER.name)
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
