import { describe, expect, it } from 'vitest'

import {
    addressScope,
    createFlowTracker,
    flowTracks,
    isLinkLocal,
    isLoopback,
    isPrivateAddress,
    isPublicAddress,
    normalizeAddress,
    type ConnectionRecord,
    type Locate,
} from './network'

/** Where the documentation networks stand in for hosts on the internet. */
const PLACES: Record<string, { lon: number; lat: number; label: string }> = {
    '203.0.113.10': { lon: 8.68, lat: 50.11, label: 'Frankfurt' },
    '198.51.100.7': { lon: -77.49, lat: 39.04, label: 'Ashburn' },
    '2001:db8::5': { lon: 4.9, lat: 52.37, label: 'Amsterdam' },
}
const locate: Locate = (address) => PLACES[address]

/** A record of a connection from the host, its byte counts running totals. */
function record(fields: Partial<ConnectionRecord> & Pick<ConnectionRecord, 'remoteAddress' | 'at'>): ConnectionRecord {
    return {
        process: 'worker',
        pid: 4100,
        protocol: 'tcp',
        localAddress: '192.168.1.20',
        localPort: 50100,
        remotePort: 443,
        state: 'ESTABLISHED',
        ...fields,
    }
}

describe('addresses', () => {
    it.each([
        ['127.0.0.1', 'loopback'],
        ['127.8.9.10', 'loopback'],
        ['::1', 'loopback'],
        ['10.0.0.5', 'private'],
        ['172.16.0.1', 'private'],
        ['172.31.255.255', 'private'],
        ['192.168.1.20', 'private'],
        ['100.64.0.1', 'private'],
        ['fd12:3456::1', 'private'],
        ['169.254.10.20', 'link-local'],
        ['fe80::1', 'link-local'],
        ['fe80::1%en0', 'link-local'],
        ['224.0.0.251', 'multicast'],
        ['ff02::fb', 'multicast'],
        ['0.0.0.0', 'unspecified'],
        ['::', 'unspecified'],
        ['*', 'unspecified'],
        ['not an address', 'unspecified'],
        ['203.0.113.10', 'public'],
        ['172.32.0.1', 'public'],
        ['100.128.0.1', 'public'],
        ['2001:db8::5', 'public'],
        ['[2001:db8::5]:443', 'public'],
        ['::ffff:10.1.2.3', 'private'],
        ['::ffff:203.0.113.10', 'public'],
    ])('reads %s as %s', (address, scope) => {
        expect(addressScope(address)).toBe(scope)
    })

    it('refuses what only looks like an address', () => {
        expect(addressScope('256.1.1.1')).toBe('unspecified')
        expect(addressScope('1.2.3')).toBe('unspecified')
        expect(addressScope('1::2::3')).toBe('unspecified')
        expect(addressScope('1:2:3:4:5:6:7:8:9')).toBe('unspecified')
    })

    it('writes every form of an address one way', () => {
        expect(normalizeAddress(' [2001:DB8::5]:443 ')).toBe('2001:db8::5')
        expect(normalizeAddress('fe80::1%en0')).toBe('fe80::1')
        expect(normalizeAddress('::ffff:203.0.113.10')).toBe('203.0.113.10')
        expect(normalizeAddress('0:0:0:0:0:ffff:203.0.113.10')).toBe('203.0.113.10')
        expect(normalizeAddress('203.0.113.10')).toBe('203.0.113.10')
    })

    it('answers each question by the scope', () => {
        expect(isPublicAddress('203.0.113.10')).toBe(true)
        expect(isPublicAddress('10.0.0.1')).toBe(false)
        expect(isLoopback('::1')).toBe(true)
        expect(isPrivateAddress('172.20.1.1')).toBe(true)
        expect(isLinkLocal('169.254.1.1')).toBe(true)
        expect(isLinkLocal('fe80::abcd')).toBe(true)
    })
})

describe('the flow tracker', () => {
    it('counts the bytes of running totals from the second record, and their rate over the window', () => {
        const tracker = createFlowTracker({ window: 10_000 })
        tracker.add(record({ remoteAddress: '203.0.113.10', bytesIn: 1000, bytesOut: 500, at: 0 }))
        tracker.add(record({ remoteAddress: '203.0.113.10', bytesIn: 6000, bytesOut: 1500, at: 1000 }))
        tracker.add(record({ remoteAddress: '203.0.113.10', bytesIn: 16000, bytesOut: 2500, at: 2000 }))
        const [flow] = tracker.byRemote()
        expect(flow).toMatchObject({
            key: '203.0.113.10',
            address: '203.0.113.10',
            scope: 'public',
            connections: 1,
            bytesIn: 15000,
            bytesOut: 2000,
            rateIn: 1500,
            rateOut: 200,
            processes: ['worker'],
            protocols: ['tcp'],
            remotePorts: [443],
            lastSeen: 2000,
        })
    })

    it('counts bytes as they come when told they are deltas', () => {
        const tracker = createFlowTracker({ window: 2_000, counters: 'delta' })
        tracker.add([
            record({ remoteAddress: '203.0.113.10', bytesIn: 400, bytesOut: 100, at: 0 }),
            record({ remoteAddress: '203.0.113.10', bytesIn: 600, bytesOut: 100, at: 1000 }),
        ])
        expect(tracker.byRemote()[0]).toMatchObject({ bytesIn: 1000, bytesOut: 200, rateIn: 500, rateOut: 100 })
    })

    it('counts a total that fell as a counter started again', () => {
        const tracker = createFlowTracker()
        tracker.add(record({ remoteAddress: '203.0.113.10', bytesIn: 9000, at: 0 }))
        tracker.add(record({ remoteAddress: '203.0.113.10', bytesIn: 300, at: 1000 }))
        expect(tracker.byRemote()[0].bytesIn).toBe(300)
    })

    it('lets bytes and connections fall out of the window', () => {
        const tracker = createFlowTracker({ window: 5_000, counters: 'delta' })
        tracker.add(record({ remoteAddress: '203.0.113.10', bytesIn: 1000, at: 0 }))
        tracker.add(record({ remoteAddress: '198.51.100.7', bytesIn: 50, at: 0 }))
        tracker.add(record({ remoteAddress: '203.0.113.10', bytesIn: 2000, at: 4000 }))
        expect(tracker.byRemote(4000).map((flow) => flow.bytesIn)).toEqual([3000, 50])
        const later = tracker.byRemote(6000)
        expect(later.map((flow) => [flow.address, flow.bytesIn])).toEqual([['203.0.113.10', 2000]])
    })

    it('gathers connections by remote host, the busiest first', () => {
        const tracker = createFlowTracker({ counters: 'delta' })
        tracker.add([
            record({ remoteAddress: '198.51.100.7', bytesIn: 100, at: 0 }),
            record({ remoteAddress: '203.0.113.10', localPort: 50101, bytesIn: 5000, at: 0 }),
            record({
                remoteAddress: '203.0.113.10',
                localPort: 50102,
                process: 'scheduler',
                pid: 4200,
                remotePort: 8443,
                bytesIn: 5000,
                at: 0,
            }),
            record({ remoteAddress: '::ffff:203.0.113.10', localPort: 50103, protocol: 'TCP6', bytesOut: 10, at: 0 }),
        ])
        const flows = tracker.byRemote()
        expect(flows.map((flow) => flow.address)).toEqual(['203.0.113.10', '198.51.100.7'])
        expect(flows[0]).toMatchObject({
            connections: 3,
            processes: ['scheduler', 'worker'],
            protocols: ['tcp', 'tcp6'],
            remotePorts: [443, 8443],
            bytesIn: 10000,
            bytesOut: 10,
        })
    })

    it('gathers connections by process, those without one under an empty key', () => {
        const tracker = createFlowTracker({ counters: 'delta' })
        tracker.add([
            record({ remoteAddress: '203.0.113.10', bytesOut: 100, at: 0 }),
            record({ remoteAddress: '198.51.100.7', localPort: 50200, bytesOut: 300, at: 0 }),
            record({ remoteAddress: '198.51.100.7', process: 'api', pid: 3000, bytesOut: 50, at: 0 }),
            record({ remoteAddress: '10.0.0.8', process: undefined, pid: undefined, bytesOut: 5, at: 0 }),
        ])
        const groups = tracker.byProcess()
        expect(groups.map((group) => [group.key, group.connections, group.bytesOut])).toEqual([
            ['worker', 2, 400],
            ['api', 1, 50],
            ['', 1, 5],
        ])
        expect(groups[0].remoteAddresses).toEqual(['198.51.100.7', '203.0.113.10'])
    })

    it('locates public hosts once each, and never the others', () => {
        const asked: string[] = []
        const tracker = createFlowTracker({
            locate: (address) => {
                asked.push(address)
                return locate(address)
            },
        })
        tracker.add([
            record({ remoteAddress: '203.0.113.10', at: 0 }),
            record({ remoteAddress: '192.0.2.99', at: 0 }),
            record({ remoteAddress: '127.0.0.1', at: 0 }),
            record({ remoteAddress: '10.0.0.8', at: 0 }),
            record({ remoteAddress: 'fe80::1%en0', at: 0 }),
        ])
        tracker.byRemote()
        const flows = tracker.byRemote()
        expect(asked.sort()).toEqual(['192.0.2.99', '203.0.113.10'])
        const byAddress = Object.fromEntries(flows.map((flow) => [flow.address, flow]))
        expect(byAddress['203.0.113.10'].location).toEqual(PLACES['203.0.113.10'])
        expect(byAddress['192.0.2.99'].location).toBeUndefined()
        expect(byAddress['127.0.0.1'].scope).toBe('loopback')
        expect(byAddress['fe80::1'].scope).toBe('link-local')
    })

    it('lists each connection with its latest state, its rates and its totals', () => {
        const tracker = createFlowTracker({ window: 10_000, locate })
        tracker.add([
            record({ remoteAddress: '203.0.113.10', bytesIn: 1000, bytesOut: 100, state: 'SYN_SENT', at: 0 }),
            record({ remoteAddress: '198.51.100.7', localPort: 50300, bytesIn: 10, at: 0 }),
        ])
        tracker.add([
            record({ remoteAddress: '203.0.113.10', bytesIn: 6000, bytesOut: 600, at: 1000 }),
            record({ remoteAddress: '198.51.100.7', localPort: 50300, bytesIn: 20, state: 'CLOSE_WAIT', at: 1000 }),
        ])
        const [busiest, quiet] = tracker.byConnection()
        expect(busiest).toMatchObject({
            process: 'worker',
            pid: 4100,
            protocol: 'tcp',
            localAddress: '192.168.1.20',
            localPort: 50100,
            remoteAddress: '203.0.113.10',
            remotePort: 443,
            state: 'ESTABLISHED',
            scope: 'public',
            location: PLACES['203.0.113.10'],
            bytesIn: 5000,
            bytesOut: 500,
            rateIn: 500,
            rateOut: 50,
            totalIn: 6000,
            totalOut: 600,
            metered: true,
            firstSeen: 0,
            lastSeen: 1000,
        })
        expect(quiet).toMatchObject({ remoteAddress: '198.51.100.7', state: 'CLOSE_WAIT', totalIn: 20, bytesIn: 10 })
    })

    it('sums deltas into a connection total, and says when no record counted bytes', () => {
        const tracker = createFlowTracker({ counters: 'delta', window: 2_000 })
        tracker.add([
            record({ remoteAddress: '203.0.113.10', bytesIn: 400, at: 0 }),
            record({ remoteAddress: '203.0.113.10', bytesIn: 600, at: 3000 }),
            record({ remoteAddress: '198.51.100.7', localPort: 50400, at: 3000 }),
        ])
        const flows = tracker.byConnection()
        expect(flows.map((flow) => [flow.remoteAddress, flow.bytesIn, flow.totalIn, flow.metered])).toEqual([
            ['203.0.113.10', 600, 1000, true],
            ['198.51.100.7', 0, 0, false],
        ])
    })

    it('lists connections newest first when none moves bytes, and drops those not seen in the window', () => {
        const tracker = createFlowTracker({ window: 5_000 })
        tracker.add(record({ remoteAddress: '203.0.113.10', at: 0 }))
        tracker.add(record({ remoteAddress: '198.51.100.7', localPort: 50500, at: 1000 }))
        expect(tracker.byConnection(1000).map((flow) => flow.remoteAddress)).toEqual(['198.51.100.7', '203.0.113.10'])
        expect(tracker.byConnection(5500).map((flow) => flow.remoteAddress)).toEqual(['198.51.100.7'])
    })

    it('forgets everything when cleared', () => {
        const tracker = createFlowTracker()
        tracker.add(record({ remoteAddress: '203.0.113.10', at: 0 }))
        tracker.clear()
        expect(tracker.byRemote()).toEqual([])
        expect(tracker.byProcess()).toEqual([])
        expect(tracker.byConnection()).toEqual([])
    })
})

describe('flow tracks', () => {
    const home: [number, number] = [10.75, 59.91]

    function flows() {
        const tracker = createFlowTracker({ locate, counters: 'delta', window: 1_000 })
        tracker.add([
            record({ remoteAddress: '203.0.113.10', bytesIn: 2000, bytesOut: 100, at: 500 }),
            record({ remoteAddress: '2001:db8::5', remotePort: 853, protocol: 'udp', bytesIn: 300, at: 900 }),
            record({ remoteAddress: '192.168.1.1', remotePort: 53, protocol: 'udp', bytesIn: 80, at: 900 }),
        ])
        return tracker.byRemote()
    }

    it('gives a track for each located host and a link from home to it', () => {
        const { tracks, links } = flowTracks(flows(), { home })
        expect(tracks.map((track) => track.id)).toEqual(['flow:203.0.113.10', 'flow:2001:db8::5'])
        expect(tracks[0]).toEqual({
            id: 'flow:203.0.113.10',
            lon: 8.68,
            lat: 50.11,
            affiliation: 'unknown',
            kind: 'other',
            label: '203.0.113.10',
            updatedAt: 500,
            source: 'network',
            properties: {
                address: '203.0.113.10',
                place: 'Frankfurt',
                connections: 1,
                processes: 'worker',
                protocols: 'tcp',
                remotePorts: '443',
                bytesIn: 2000,
                bytesOut: 100,
                rateIn: 2000,
                rateOut: 100,
            },
        })
        expect(links).toEqual([
            { id: 'flow:203.0.113.10', from: home, to: [8.68, 50.11], rateIn: 2000, rateOut: 100 },
            { id: 'flow:2001:db8::5', from: home, to: [4.9, 52.37], rateIn: 300, rateOut: 0 },
        ])
    })

    it('classifies hosts as the app says', () => {
        const { tracks } = flowTracks(flows(), {
            home,
            classify: (track) => (track.properties?.place === 'Frankfurt' ? 'friend' : undefined),
            source: 'juniper-host',
        })
        expect(tracks.map((track) => [track.affiliation, track.source])).toEqual([
            ['friend', 'juniper-host'],
            ['unknown', 'juniper-host'],
        ])
    })

    it('gives plain data that survives JSON', () => {
        const result = flowTracks(flows(), { home })
        expect(JSON.parse(JSON.stringify(result))).toEqual(result)
    })
})
