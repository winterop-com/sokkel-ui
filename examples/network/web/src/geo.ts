/**
 * Where addresses are: GeoLite2 City when this machine has the file, read by whoever can read it
 * (the Electron shell's main process, or the dev and preview servers), or else the built-in lookup
 * over the documentation networks. The page never holds the file itself.
 */

import { builtinPlace, type Place } from './places'

/** What the Electron shell's preload hands the page for the network watch. */
export interface NetworkBridge {
    geolite: () => Promise<GeoliteStatus>
    locate: (addresses: readonly string[]) => Promise<Record<string, Place>>
    /** Starts reading this machine's connections every `interval` milliseconds. */
    start: (interval: number) => void
    stop: () => void
    /** Hears each reading; returns the call that stops hearing. */
    onReading: (listener: (reading: MachineReading) => void) => () => void
}

/** One reading of this machine's connections, as the Electron shell's main process sends it. */
export interface MachineReading {
    at: number
    /** The command the connections were read with: `lsof` or `netstat`; none when neither could run. */
    tool?: 'lsof' | 'netstat'
    records: {
        process?: string
        pid?: number
        protocol: string
        localAddress: string
        localPort: number
        remoteAddress: string
        remotePort: number
        state?: string
    }[]
    /** Where each public remote address is, when GeoLite2 is there to say. */
    places: Record<string, Place>
    /** Why the connections could not be read. */
    problem?: string
}

/** Whether the GeoLite2 file is there to read, and what it is. */
export interface GeoliteStatus {
    available: boolean
    file: string
    database?: string
    built?: string
    problem?: string
}

/** The lookup in use, and how to ask it. */
export interface Geo {
    kind: 'geolite' | 'builtin'
    /** Who reads the file: the desktop shell, or the server the page came from. */
    via?: 'desktop' | 'server'
    status?: GeoliteStatus
    locate: (addresses: readonly string[]) => Promise<Record<string, Place>>
}

export const networkBridge = (): NetworkBridge | undefined => (window as unknown as { tidevannNetwork?: NetworkBridge }).tidevannNetwork

const BUILTIN: Geo = {
    kind: 'builtin',
    locate: (addresses) => {
        const places: Record<string, Place> = {}
        for (const address of addresses) {
            const found = builtinPlace(address)
            if (found !== undefined) places[address] = found
        }
        return Promise.resolve(places)
    },
}

/** Waits at most `ms` for a promise, so a server that does not answer leaves the page on the built-in lookup. */
function within<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('No answer in time.')), ms)
        promise.then(
            (value) => {
                clearTimeout(timer)
                resolve(value)
            },
            (error: unknown) => {
                clearTimeout(timer)
                reject(error instanceof Error ? error : new Error(String(error)))
            },
        )
    })
}

async function serverStatus(): Promise<GeoliteStatus | undefined> {
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return undefined
    try {
        const response = await within(fetch('./geolite/status', { cache: 'no-store' }), 2000)
        if (!response.ok || !(response.headers.get('Content-Type') ?? '').includes('application/json')) return undefined
        const status = (await response.json()) as GeoliteStatus
        return typeof status.available === 'boolean' ? status : undefined
    } catch {
        return undefined
    }
}

async function serverLocate(addresses: readonly string[]): Promise<Record<string, Place>> {
    const response = await within(
        fetch('./geolite/locate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addresses) }),
        5000,
    )
    if (!response.ok) throw new Error(`The lookup answered ${String(response.status)}.`)
    return (await response.json()) as Record<string, Place>
}

/** Finds the lookup to use: GeoLite2 through the desktop shell or the server when the file is there, else the built-in one. */
export async function findGeo(): Promise<Geo> {
    const bridge = networkBridge()
    if (bridge !== undefined) {
        try {
            const status = await within(bridge.geolite(), 3000)
            if (status.available) return { kind: 'geolite', via: 'desktop', status, locate: (addresses) => bridge.locate(addresses) }
            return { ...BUILTIN, via: 'desktop', status }
        } catch {
            return BUILTIN
        }
    }
    const status = await serverStatus()
    if (status === undefined) return BUILTIN
    if (status.available) return { kind: 'geolite', via: 'server', status, locate: serverLocate }
    return { ...BUILTIN, via: 'server', status }
}
