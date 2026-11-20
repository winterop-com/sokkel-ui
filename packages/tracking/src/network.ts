/**
 * Network connections as flows and tracks: the records an app reads from its host (a process, its
 * local and remote ends, the bytes moved) gathered by remote host or by process, with byte rates over
 * a sliding window, and the located ones as tracks and links a map draws from home to each remote end.
 *
 * Where an address is comes from the app: `locate` is its lookup, and this package ships no database
 * and calls none. Loopback, private, link-local and other addresses that name no place on the
 * internet are never located.
 */
import type { LonLat, Track, TrackClassifier, TrackProperties } from './track'

/** One connection as the app reads it from its host, at one moment. */
export interface ConnectionRecord {
    /** The process's name. */
    process?: string
    pid?: number
    /** `tcp`, `udp`, `tcp6` and the like. */
    protocol: string
    localAddress: string
    localPort: number
    remoteAddress: string
    remotePort: number
    /** The socket's state, such as `ESTABLISHED`. */
    state?: string
    /** Bytes received: the connection's running total, or since its last record with `counters: 'delta'`. */
    bytesIn?: number
    /** Bytes sent, counted as `bytesIn` is. */
    bytesOut?: number
    /** When the record was read, in milliseconds since the epoch. */
    at: number
}

/** What kind of place an address names. Only `public` addresses are located. */
export type AddressScope = 'public' | 'private' | 'loopback' | 'link-local' | 'multicast' | 'unspecified'

/** Where an address is, as the app's lookup gives it. */
export interface Location {
    lon: number
    lat: number
    /** What a map writes for the place: a city, a country, a network's name. */
    label: string
}

/** The app's lookup of where an address is; undefined when it does not know. */
export type Locate = (address: string) => Location | undefined

/** The connections to one remote host, or of one process, over the window. */
export interface FlowGroup {
    /** The remote address, or the process's name, that gathers the group. */
    key: string
    /** The connections in the group, each counted once over the window. */
    connections: number
    /** The remote addresses the group reached, sorted. */
    remoteAddresses: string[]
    /** The processes in the group, by name, sorted; a connection with no process is left out. */
    processes: string[]
    /** The protocols the group used, sorted. */
    protocols: string[]
    /** The remote ports the group reached, sorted. */
    remotePorts: number[]
    /** Bytes received and sent within the window. */
    bytesIn: number
    bytesOut: number
    /** Bytes per second received and sent, over the window. */
    rateIn: number
    rateOut: number
    /** When a record of the group was last read. */
    lastSeen: number
}

/** The connections to one remote host, with where it is. */
export interface RemoteFlow extends FlowGroup {
    address: string
    scope: AddressScope
    /** Where the address is, when it is public and the app's lookup knows it. */
    location?: Location
}

/** A line a map draws from home to a remote host. */
export interface FlowLink {
    /** The remote host's track's id. */
    id: string
    from: LonLat
    to: LonLat
    rateIn: number
    rateOut: number
}

export interface FlowTrackerOptions {
    /** How far back rates and totals reach, in milliseconds. 10 seconds by default. */
    window?: number
    /** Whether the byte counts are each connection's running totals (the default) or the bytes since its last record. */
    counters?: 'cumulative' | 'delta'
    /** The app's lookup of where an address is; each address is looked up once and the answer kept. */
    locate?: Locate
}

export interface FlowTracker {
    /** Reads records; each connection's bytes count from its second record when the counts are running totals. */
    add(records: ConnectionRecord | readonly ConnectionRecord[]): void
    /** The connections by remote host, the busiest first, over the window ending at `now` (the latest record by default). */
    byRemote(now?: number): RemoteFlow[]
    /** The connections by process, the busiest first; connections without a process are gathered under `''`. */
    byProcess(now?: number): FlowGroup[]
    /** Forgets every record and every looked-up location. */
    clear(): void
}

/** The parts of an IPv4 address, or undefined when it is not one. */
function ipv4(address: string): number[] | undefined {
    const parts = address.split('.')
    if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return undefined
    const numbers = parts.map(Number)
    return numbers.every((part) => part <= 255) ? numbers : undefined
}

/** The eight 16-bit groups of an IPv6 address, or undefined when it is not one. */
function ipv6(address: string): number[] | undefined {
    if (!address.includes(':') || !/^[0-9a-fA-F:]+$/.test(address)) return undefined
    const halves = address.split('::')
    if (halves.length > 2) return undefined
    const groups = (half: string) => (half === '' ? [] : half.split(':'))
    const head = groups(halves[0])
    const tail = halves.length === 2 ? groups(halves[1]) : []
    const missing = 8 - head.length - tail.length
    if ((halves.length === 2 && missing < 1) || (halves.length === 1 && missing !== 0)) return undefined
    const all = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...tail]
    if (all.some((group) => !/^[0-9a-fA-F]{1,4}$/.test(group))) return undefined
    return all.map((group) => parseInt(group, 16))
}

/**
 * An address as one form for every way it is written: brackets, a zone (`%en0`) and a port after an
 * IPv6 address in brackets are dropped, an IPv4 address mapped into IPv6 (`::ffff:203.0.113.5`) is
 * written as IPv4, and IPv6 is lower case.
 */
export function normalizeAddress(address: string): string {
    let plain = address.trim()
    const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(plain)
    if (bracketed !== null) plain = bracketed[1]
    plain = plain.replace(/%.*$/, '').toLowerCase()
    const mapped = /^(?:::|(?:0{1,4}:){5})ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(plain)
    if (mapped !== null && ipv4(mapped[1]) !== undefined) return mapped[1]
    return plain
}

/** What kind of place an address names; anything that is not an address reads as `unspecified`. */
export function addressScope(address: string): AddressScope {
    const plain = normalizeAddress(address)
    const four = ipv4(plain)
    if (four !== undefined) {
        const [a, b] = four
        if (a === 0) return 'unspecified'
        if (a === 127) return 'loopback'
        if (a === 169 && b === 254) return 'link-local'
        if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127))
            return 'private'
        if (a >= 224) return 'multicast'
        return 'public'
    }
    const six = ipv6(plain)
    if (six === undefined) return 'unspecified'
    if (six.every((group) => group === 0)) return 'unspecified'
    if (six.slice(0, 7).every((group) => group === 0) && six[7] === 1) return 'loopback'
    if ((six[0] & 0xffc0) === 0xfe80) return 'link-local'
    if ((six[0] & 0xfe00) === 0xfc00) return 'private'
    if ((six[0] & 0xff00) === 0xff00) return 'multicast'
    return 'public'
}

/** Whether an address names a place on the internet, so a lookup could say where it is. */
export const isPublicAddress = (address: string): boolean => addressScope(address) === 'public'
/** Whether an address is the host's own: 127.0.0.0/8 or ::1. */
export const isLoopback = (address: string): boolean => addressScope(address) === 'loopback'
/** Whether an address is on a private network: 10/8, 172.16/12, 192.168/16, 100.64/10 or fc00::/7. */
export const isPrivateAddress = (address: string): boolean => addressScope(address) === 'private'
/** Whether an address is link-local: 169.254/16 or fe80::/10. */
export const isLinkLocal = (address: string): boolean => addressScope(address) === 'link-local'

/** One reading of bytes moved on a connection. */
interface Sample {
    at: number
    bytesIn: number
    bytesOut: number
}

/** A connection, known by its process, protocol and both ends. */
interface Connection {
    key: string
    process?: string
    protocol: string
    remoteAddress: string
    remotePort: number
    lastSeen: number
    /** The running totals of the last record, when the counts are running totals. */
    totals?: { bytesIn: number; bytesOut: number }
    samples: Sample[]
}

/**
 * A tracker that reads connection records as the app polls its host and gathers them by remote host
 * or by process, with the bytes moved and their rates over a sliding window.
 */
export function createFlowTracker(options: FlowTrackerOptions = {}): FlowTracker {
    const span = options.window ?? 10_000
    const cumulative = (options.counters ?? 'cumulative') === 'cumulative'
    const connections = new Map<string, Connection>()
    const located = new Map<string, Location | undefined>()
    let latest = 0

    const locate = (address: string): Location | undefined => {
        if (options.locate === undefined || addressScope(address) !== 'public') return undefined
        if (!located.has(address)) located.set(address, options.locate(address))
        return located.get(address)
    }

    const add = (record: ConnectionRecord) => {
        const remoteAddress = normalizeAddress(record.remoteAddress)
        const key = [
            record.pid ?? record.process ?? '',
            record.protocol.toLowerCase(),
            normalizeAddress(record.localAddress),
            record.localPort,
            remoteAddress,
            record.remotePort,
        ].join(' ')
        let connection = connections.get(key)
        if (connection === undefined) {
            connection = {
                key,
                process: record.process,
                protocol: record.protocol.toLowerCase(),
                remoteAddress,
                remotePort: record.remotePort,
                lastSeen: record.at,
                samples: [],
            }
            connections.set(key, connection)
        }
        connection.lastSeen = Math.max(connection.lastSeen, record.at)
        if (record.process !== undefined) connection.process = record.process
        latest = Math.max(latest, record.at)
        const bytesIn = record.bytesIn ?? 0
        const bytesOut = record.bytesOut ?? 0
        if (cumulative) {
            const before = connection.totals
            connection.totals = { bytesIn, bytesOut }
            // A first record has nothing to count from, and a total that fell means the counter started again.
            if (before === undefined) return
            const sample = {
                at: record.at,
                bytesIn: bytesIn >= before.bytesIn ? bytesIn - before.bytesIn : bytesIn,
                bytesOut: bytesOut >= before.bytesOut ? bytesOut - before.bytesOut : bytesOut,
            }
            connection.samples.push(sample)
        } else connection.samples.push({ at: record.at, bytesIn, bytesOut })
    }

    /** Drops what fell out of the window, and connections not seen within it. */
    const prune = (now: number) => {
        for (const [key, connection] of connections) {
            connection.samples = connection.samples.filter((sample) => sample.at > now - span)
            if (connection.lastSeen <= now - span) connections.delete(key)
        }
    }

    const gather = (now: number, keyOf: (connection: Connection) => string): Map<string, FlowGroup> => {
        prune(now)
        const groups = new Map<
            string,
            FlowGroup & { sets: { remotes: Set<string>; processes: Set<string>; protocols: Set<string>; ports: Set<number> } }
        >()
        for (const connection of connections.values()) {
            const key = keyOf(connection)
            let group = groups.get(key)
            if (group === undefined) {
                group = {
                    key,
                    connections: 0,
                    remoteAddresses: [],
                    processes: [],
                    protocols: [],
                    remotePorts: [],
                    bytesIn: 0,
                    bytesOut: 0,
                    rateIn: 0,
                    rateOut: 0,
                    lastSeen: 0,
                    sets: { remotes: new Set(), processes: new Set(), protocols: new Set(), ports: new Set() },
                }
                groups.set(key, group)
            }
            group.connections += 1
            group.lastSeen = Math.max(group.lastSeen, connection.lastSeen)
            group.sets.remotes.add(connection.remoteAddress)
            if (connection.process !== undefined) group.sets.processes.add(connection.process)
            group.sets.protocols.add(connection.protocol)
            group.sets.ports.add(connection.remotePort)
            for (const sample of connection.samples) {
                group.bytesIn += sample.bytesIn
                group.bytesOut += sample.bytesOut
            }
        }
        const seconds = span / 1000
        return new Map(
            [...groups].map(([key, { sets, ...group }]) => [
                key,
                {
                    ...group,
                    remoteAddresses: [...sets.remotes].sort(),
                    processes: [...sets.processes].sort(),
                    protocols: [...sets.protocols].sort(),
                    remotePorts: [...sets.ports].sort((a, b) => a - b),
                    rateIn: group.bytesIn / seconds,
                    rateOut: group.bytesOut / seconds,
                },
            ]),
        )
    }

    const busiest = (a: FlowGroup, b: FlowGroup) => b.rateIn + b.rateOut - (a.rateIn + a.rateOut) || a.key.localeCompare(b.key)

    return {
        add(records) {
            for (const record of Array.isArray(records) ? records : [records as ConnectionRecord]) add(record)
        },
        byRemote(now = latest) {
            return [...gather(now, (connection) => connection.remoteAddress).values()]
                .map((group): RemoteFlow => {
                    const location = locate(group.key)
                    const flow: RemoteFlow = { ...group, address: group.key, scope: addressScope(group.key) }
                    if (location !== undefined) flow.location = location
                    return flow
                })
                .sort(busiest)
        },
        byProcess(now = latest) {
            return [...gather(now, (connection) => connection.process ?? '').values()].sort(busiest)
        },
        clear() {
            connections.clear()
            located.clear()
            latest = 0
        },
    }
}

export interface FlowTrackOptions {
    /** Where the links start: the host the connections were read on. */
    home: LonLat
    /** Gives each remote host its affiliation; `unknown` when it gives none. */
    classify?: TrackClassifier
    /** The tracks' `source`; `network` by default. */
    source?: string
}

/**
 * The located remote hosts as tracks (kind `other`), and a link from home to each that a map draws as
 * a line. A flow without a location is left out: an address the lookup did not know, or one that is
 * not public.
 */
export function flowTracks(flows: readonly RemoteFlow[], options: FlowTrackOptions): { tracks: Track[]; links: FlowLink[] } {
    const tracks: Track[] = []
    const links: FlowLink[] = []
    for (const flow of flows) {
        if (flow.location === undefined) continue
        const properties: TrackProperties = {
            address: flow.address,
            place: flow.location.label,
            connections: flow.connections,
            processes: flow.processes.join(', '),
            protocols: flow.protocols.join(', '),
            remotePorts: flow.remotePorts.join(', '),
            bytesIn: flow.bytesIn,
            bytesOut: flow.bytesOut,
            rateIn: flow.rateIn,
            rateOut: flow.rateOut,
        }
        const track: Track = {
            id: `flow:${flow.address}`,
            lon: flow.location.lon,
            lat: flow.location.lat,
            affiliation: 'unknown',
            kind: 'other',
            label: flow.address,
            updatedAt: flow.lastSeen,
            source: options.source ?? 'network',
            properties,
        }
        const affiliation = options.classify?.(track)
        tracks.push(affiliation === undefined ? track : { ...track, affiliation })
        links.push({
            id: track.id,
            from: [options.home[0], options.home[1]],
            to: [flow.location.lon, flow.location.lat],
            rateIn: flow.rateIn,
            rateOut: flow.rateOut,
        })
    }
    return { tracks, links }
}
