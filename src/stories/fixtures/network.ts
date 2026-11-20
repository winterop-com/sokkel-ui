/**
 * A machine's connections over five minutes, for the network watch's stories: six processes
 * (browser, mail, sync, updater, backup, shell) talking to hosts on the documentation networks, each
 * placed in a plain city, read every five seconds with running byte totals and gathered by the
 * tracking package's flow tracker. Everything is worked out from fixed numbers, so the stories draw
 * the same every time.
 */

import {
    createFlowTracker,
    type ConnectionFlow,
    type ConnectionRecord,
    type FlowGroup,
    type Location,
    type RemoteFlow,
} from '@winterop-com/sokkel-ui-tracking/network'

/** When the last reading was taken. */
export const NETWORK_NOW = Date.UTC(2026, 10, 20, 14, 0, 0)
/** How far apart the readings are, and how many there are. */
export const NETWORK_STEP = 5_000
const READINGS = 60

/** Where this machine stands: Oslo. */
export const NETWORK_HOME: [number, number] = [10.75, 59.91]

/** Where each remote host is, with its country. */
export const NETWORK_PLACES: Record<string, Location & { country: string }> = {
    '203.0.113.10': { lon: 8.68, lat: 50.11, label: 'Frankfurt, Germany', country: 'Germany' },
    '203.0.113.11': { lon: 4.9, lat: 52.37, label: 'Amsterdam, Netherlands', country: 'Netherlands' },
    '203.0.113.12': { lon: -0.13, lat: 51.51, label: 'London, United Kingdom', country: 'United Kingdom' },
    '203.0.113.13': { lon: -77.49, lat: 39.04, label: 'Ashburn, United States', country: 'United States' },
    '203.0.113.14': { lon: -121.89, lat: 37.34, label: 'San Jose, United States', country: 'United States' },
    '203.0.113.15': { lon: 139.69, lat: 35.69, label: 'Tokyo, Japan', country: 'Japan' },
    '203.0.113.16': { lon: 103.82, lat: 1.35, label: 'Singapore, Singapore', country: 'Singapore' },
    '198.51.100.20': { lon: 18.07, lat: 59.33, label: 'Stockholm, Sweden', country: 'Sweden' },
    '198.51.100.21': { lon: -6.26, lat: 53.35, label: 'Dublin, Ireland', country: 'Ireland' },
    '198.51.100.22': { lon: -46.63, lat: -23.55, label: 'São Paulo, Brazil', country: 'Brazil' },
    '2001:db8:4::1': { lon: 2.35, lat: 48.86, label: 'Paris, France', country: 'France' },
    '192.0.2.200': { lon: -21.94, lat: 64.15, label: 'Reykjavik, Iceland', country: 'Iceland' },
}

interface Socket {
    process: string
    pid: number
    protocol: string
    localPort: number
    remoteAddress: string
    remotePort: number
    state?: string
    /** Bytes a second received and sent, on average. */
    rateIn: number
    rateOut: number
    /** The reading it opens at and the one it closes after. */
    from?: number
    until?: number
}

const SOCKETS: Socket[] = [
    {
        process: 'browser',
        pid: 4211,
        protocol: 'tcp',
        localPort: 50812,
        remoteAddress: '203.0.113.10',
        remotePort: 443,
        rateIn: 180_000,
        rateOut: 9_000,
    },
    {
        process: 'browser',
        pid: 4211,
        protocol: 'udp',
        localPort: 50813,
        remoteAddress: '203.0.113.11',
        remotePort: 443,
        rateIn: 240_000,
        rateOut: 6_000,
    },
    {
        process: 'browser',
        pid: 4211,
        protocol: 'tcp',
        localPort: 50820,
        remoteAddress: '203.0.113.12',
        remotePort: 443,
        rateIn: 60_000,
        rateOut: 3_000,
        from: 20,
    },
    {
        process: 'browser',
        pid: 4211,
        protocol: 'tcp',
        localPort: 50822,
        remoteAddress: '203.0.113.15',
        remotePort: 443,
        rateIn: 35_000,
        rateOut: 2_000,
        until: 52,
        state: 'TIME_WAIT',
    },
    {
        process: 'browser',
        pid: 4211,
        protocol: 'tcp6',
        localPort: 50830,
        remoteAddress: '2001:db8:4::1',
        remotePort: 443,
        rateIn: 90_000,
        rateOut: 4_000,
    },
    {
        process: 'browser',
        pid: 4211,
        protocol: 'udp',
        localPort: 50840,
        remoteAddress: '192.168.1.1',
        remotePort: 53,
        rateIn: 300,
        rateOut: 90,
    },
    {
        process: 'mail',
        pid: 3302,
        protocol: 'tcp',
        localPort: 50710,
        remoteAddress: '198.51.100.21',
        remotePort: 993,
        rateIn: 1_800,
        rateOut: 400,
    },
    {
        process: 'mail',
        pid: 3302,
        protocol: 'tcp',
        localPort: 50711,
        remoteAddress: '198.51.100.21',
        remotePort: 587,
        rateIn: 200,
        rateOut: 2_400,
    },
    {
        process: 'sync',
        pid: 2950,
        protocol: 'tcp',
        localPort: 50600,
        remoteAddress: '203.0.113.13',
        remotePort: 443,
        rateIn: 32_000,
        rateOut: 58_000,
    },
    {
        process: 'sync',
        pid: 2950,
        protocol: 'tcp',
        localPort: 50601,
        remoteAddress: '198.51.100.20',
        remotePort: 443,
        rateIn: 12_000,
        rateOut: 21_000,
    },
    {
        process: 'sync',
        pid: 2950,
        protocol: 'tcp',
        localPort: 50602,
        remoteAddress: '127.0.0.1',
        remotePort: 7210,
        rateIn: 1_200,
        rateOut: 1_200,
    },
    {
        process: 'updater',
        pid: 1877,
        protocol: 'tcp',
        localPort: 50900,
        remoteAddress: '203.0.113.14',
        remotePort: 443,
        rateIn: 5_600_000,
        rateOut: 18_000,
        from: 24,
        until: 30,
    },
    {
        process: 'backup',
        pid: 5120,
        protocol: 'tcp',
        localPort: 50950,
        remoteAddress: '198.51.100.22',
        remotePort: 443,
        rateIn: 22_000,
        rateOut: 2_600_000,
        from: 36,
        until: 47,
    },
    {
        process: 'shell',
        pid: 6034,
        protocol: 'tcp',
        localPort: 50500,
        remoteAddress: '203.0.113.16',
        remotePort: 22,
        rateIn: 600,
        rateOut: 250,
    },
    {
        process: 'shell',
        pid: 6034,
        protocol: 'tcp',
        localPort: 22,
        remoteAddress: '192.168.1.23',
        remotePort: 52144,
        rateIn: 180,
        rateOut: 900,
    },
    {
        process: 'nightly-export',
        pid: 7408,
        protocol: 'tcp',
        localPort: 51000,
        remoteAddress: '192.0.2.200',
        remotePort: 443,
        rateIn: 9_000,
        rateOut: 480_000,
        from: 50,
        state: 'SYN_SENT',
    },
]

/** One moment of the watch: every connection, by remote host and by process, and the machine's rates. */
export interface NetworkSnapshot {
    at: number
    connections: ConnectionFlow[]
    remotes: RemoteFlow[]
    processes: FlowGroup[]
    rateIn: number
    rateOut: number
}

/** A wobble between 0.6 and 1.4 that is the same for the same socket and reading. */
const wobble = (socket: number, reading: number) => 1 + 0.4 * Math.sin(socket * 1.7 + reading * 0.9) * Math.cos(reading * 0.31 + socket)

/** Every reading, oldest first, as the watch keeps them. */
export function networkHistory(): NetworkSnapshot[] {
    const tracker = createFlowTracker({ window: 10_000, locate: (address) => NETWORK_PLACES[address] })
    const totals = SOCKETS.map(() => ({ bytesIn: 0, bytesOut: 0 }))
    const history: NetworkSnapshot[] = []
    for (let reading = 0; reading < READINGS; reading += 1) {
        const at = NETWORK_NOW - (READINGS - 1 - reading) * NETWORK_STEP
        const records: ConnectionRecord[] = []
        SOCKETS.forEach((socket, index) => {
            if (reading < (socket.from ?? 0) || reading > (socket.until ?? READINGS)) return
            const closing = socket.until !== undefined && reading === socket.until
            const opening = socket.from !== undefined && reading === socket.from && socket.state === 'SYN_SENT'
            const moving = !closing && !opening
            totals[index].bytesIn += moving ? Math.round(socket.rateIn * (NETWORK_STEP / 1000) * wobble(index, reading)) : 0
            totals[index].bytesOut += moving ? Math.round(socket.rateOut * (NETWORK_STEP / 1000) * wobble(index + 3, reading)) : 0
            const udp = socket.protocol.startsWith('udp')
            records.push({
                process: socket.process,
                pid: socket.pid,
                protocol: socket.protocol,
                localAddress: socket.protocol.endsWith('6') ? 'fd00:1::20' : '192.168.1.20',
                localPort: socket.localPort,
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort,
                state: udp ? undefined : closing || opening ? socket.state : 'ESTABLISHED',
                bytesIn: totals[index].bytesIn,
                bytesOut: totals[index].bytesOut,
                at,
            })
        })
        tracker.add(records)
        const processes = tracker.byProcess(at)
        history.push({
            at,
            connections: tracker.byConnection(at),
            remotes: tracker.byRemote(at),
            processes,
            rateIn: processes.reduce((sum, group) => sum + group.rateIn, 0),
            rateOut: processes.reduce((sum, group) => sum + group.rateOut, 0),
        })
    }
    return history
}
