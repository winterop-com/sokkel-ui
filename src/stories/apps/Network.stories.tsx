import type { Meta, StoryObj } from '@storybook/react-vite'
import { Activity, BellRing, Globe2, Settings2, TableProperties } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { DashboardGrid } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Freshness } from '@winterop-com/sokkel-ui/Freshness'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PlaybackTimeline } from '@winterop-com/sokkel-ui/PlaybackTimeline'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import { DARK_BASEMAP } from '@winterop-com/sokkel-ui-maps/basemap'
import { LinkLayer, type MapLink } from '@winterop-com/sokkel-ui-maps/LinkLayer'
import { MapCoordinates } from '@winterop-com/sokkel-ui-maps/MapCoordinates'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import type { MapTone } from '@winterop-com/sokkel-ui-maps/tone'
import { TrackLayer, type Track, type TrackAffiliation } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { flowTracks, type ConnectionFlow, type FlowGroup } from '@winterop-com/sokkel-ui-tracking/network'
import { networkPlace } from '@winterop-com/sokkel-ui-tracking/simulate'
import { NETWORK_HOME, NETWORK_NOW, networkHistory, type NetworkSnapshot } from '../fixtures/network'
import { useSimClock, type StoryClock } from '../fixtures/simulation'
import { TidevannMark } from '../fixtures/TidevannMark'

/** The host the Host story opens on: the one the shell's session out is to, which stays connected. */
const PICKED_HOST = '203.0.113.37'

/** The watch as its pages read it: the clock, the readings kept at its moment, oldest first, and the last of them. */
interface Watch extends StoryClock {
    history: readonly NetworkSnapshot[]
    latest: NetworkSnapshot
}

/**
 * The network watch, live: the tracking add-on's simulated machine read at the story's clock, a
 * reading a second, gathered by its flow tracker. The clock starts at the same moment every time,
 * so the first frame is the same watch, and plays on from it at the pace of a real machine.
 */
function useWatch(): Watch {
    const played = useSimClock(NETWORK_NOW, 1)
    const history = useMemo(() => networkHistory(played.now), [played.now])
    return { ...played, history, latest: history[history.length - 1] }
}

type PageId = 'map' | 'connections' | 'traffic'

const TITLES: Record<PageId, string> = { map: 'Map', connections: 'Connections', traffic: 'Traffic' }

const groupsFor = (page: PageId): RailGroup[] => [
    {
        id: 'watch',
        title: 'Watch',
        entries: [
            { id: 'map', label: 'Map', icon: Globe2, href: '#', active: page === 'map' },
            { id: 'connections', label: 'Connections', icon: TableProperties, href: '#', active: page === 'connections' },
            { id: 'traffic', label: 'Traffic', icon: Activity, href: '#', active: page === 'traffic' },
            { id: 'alerts', label: 'Alerts', icon: BellRing, href: '#', count: 2 },
        ],
    },
    { id: 'system', title: 'System', entries: [{ id: 'settings', label: 'Settings', icon: Settings2, href: '#' }] },
]

const UNITS = ['B', 'KB', 'MB', 'GB']

function bytes(value: number): string {
    let shown = value
    let unit = 0
    while (shown >= 1000 && unit < UNITS.length - 1) {
        shown /= 1000
        unit += 1
    }
    return `${shown.toFixed(unit === 0 || shown >= 100 ? 0 : 1)} ${UNITS[unit]}`
}

const rate = (value: number) => `${bytes(value)}/s`
const clock = (at: number) => new Date(at).toISOString().slice(11, 19)
const endpoint = (address: string, port: number) => `${address.includes(':') ? `[${address}]` : address}:${String(port)}`

/** A connection's state as the run state its chip is drawn in. */
function statusOf(state: string | undefined): Status {
    if (state === undefined) return 'running'
    if (state === 'ESTABLISHED') return 'succeeded'
    return state.startsWith('SYN') ? 'queued' : 'cancelled'
}

/** The tone a host and its link take: established green, opening queued, datagrams running, closing quiet. */
const TONE_OF: Record<string, TrackAffiliation> = { succeeded: 'friend', queued: 'pending', running: 'unknown', cancelled: 'neutral' }
const COLORS: Record<MapTone, string> = {
    friend: 'var(--status-succeeded)',
    pending: 'var(--status-queued)',
    unknown: 'var(--status-running)',
    neutral: 'var(--status-cancelled)',
    hostile: 'var(--status-failed)',
    plain: 'var(--muted-foreground)',
}
const LEGEND = [
    { label: 'Established', color: COLORS.friend },
    { label: 'Opening', color: COLORS.pending },
    { label: 'Datagram (UDP)', color: COLORS.unknown },
    { label: 'Closing', color: COLORS.neutral },
]
const LEGEND_TONES: TrackAffiliation[] = ['friend', 'pending', 'unknown', 'neutral']

function hostTone(connections: readonly ConnectionFlow[]): TrackAffiliation {
    const statuses = new Set(connections.map((connection) => statusOf(connection.state)))
    const status = (['succeeded', 'queued', 'running', 'cancelled'] as const).find((each) => statuses.has(each)) ?? 'cancelled'
    return TONE_OF[status]
}

const CONNECTION_COLUMNS: DataColumn<ConnectionFlow>[] = [
    {
        id: 'process',
        header: 'Process',
        width: 'minmax(8rem,1fr)',
        cell: (row) => row.process ?? 'Unknown',
        sortValue: (row) => row.process ?? '',
    },
    { id: 'pid', header: 'PID', width: '4.5rem', align: 'end', cell: (row) => row.pid ?? '', stack: 'secondary' },
    { id: 'protocol', header: 'Protocol', width: '5.5rem', cell: (row) => row.protocol.toUpperCase(), stack: 'secondary' },
    { id: 'local', header: 'Local', width: 'content', cell: (row) => endpoint(row.localAddress, row.localPort) },
    { id: 'remote', header: 'Remote', width: 'content', cell: (row) => endpoint(row.remoteAddress, row.remotePort) },
    {
        id: 'place',
        header: 'Place',
        width: 'minmax(9rem,1fr)',
        cell: (row) => networkPlace(row.remoteAddress)?.label ?? `${row.scope[0].toUpperCase()}${row.scope.slice(1)}`,
    },
    {
        id: 'state',
        header: 'State',
        width: '9rem',
        cell: (row) => <StatusChip status={statusOf(row.state)} label={row.state ?? 'No state'} />,
        stack: 'secondary',
    },
    {
        id: 'in',
        header: 'In',
        width: '6rem',
        align: 'end',
        cell: (row) => bytes(row.totalIn),
        sortValue: (row) => row.totalIn,
        stack: 'secondary',
    },
    {
        id: 'out',
        header: 'Out',
        width: '6rem',
        align: 'end',
        cell: (row) => bytes(row.totalOut),
        sortValue: (row) => row.totalOut,
        stack: 'secondary',
    },
    {
        id: 'rate',
        header: 'Rate',
        width: '6.5rem',
        align: 'end',
        cell: (row) => rate(row.rateIn + row.rateOut),
        sortValue: (row) => row.rateIn + row.rateOut,
        stack: 'secondary',
    },
]

/** The watch's frame: the rail, the top bar's trail, the foot's figures, and the page. */
function Frame({
    watch,
    page,
    panel,
    bottom,
    children,
}: {
    watch: Watch
    page: PageId
    panel?: ReactNode
    bottom?: ReactNode
    children: ReactNode
}) {
    const { latest } = watch
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={groupsFor(page)}
                        foot={<AccountMenu name="ada" where="tidevann.example.org" local onSettings={() => undefined} />}
                    />
                }
                top={<TopBar trail={[{ label: 'Tidevann', href: '#' }, { label: TITLES[page] }]} />}
                panel={panel}
                bottom={bottom}
                foot={
                    <StatusLine live tone="live" note={`Read at ${clock(latest.at)}`}>
                        <StatusItem label="connections">{latest.connections.length}</StatusItem>
                        <StatusItem label="hosts">{latest.remotes.length}</StatusItem>
                        <StatusItem label="in">{rate(latest.rateIn)}</StatusItem>
                        <StatusItem label="out">{rate(latest.rateOut)}</StatusItem>
                    </StatusLine>
                }
            >
                <Page className="h-full">{children}</Page>
            </Shell>
        </TooltipProvider>
    )
}

function ConnectionsPage() {
    const watch = useWatch()
    const { latest } = watch
    const [group, setGroup] = useState<'none' | 'process' | 'remote'>('process')
    return (
        <Frame watch={watch} page="connections">
            <Stack gap="section" className="h-full">
                <PageHeader
                    title="Connections"
                    count={`${String(latest.connections.length)} open to ${String(latest.remotes.length)} hosts`}
                />
                <DataTable
                    className="min-h-0 flex-1"
                    columns={CONNECTION_COLUMNS}
                    rows={latest.connections}
                    rowKey={(row) => row.key}
                    searchBy={(row) => [row.process, row.remoteAddress, row.state, networkPlace(row.remoteAddress)?.label].join(' ')}
                    toolbar={
                        <Segmented
                            label="Group by"
                            size="sm"
                            value={group}
                            onValueChange={setGroup}
                            options={[
                                { value: 'none', label: 'No groups' },
                                { value: 'process', label: 'Process' },
                                { value: 'remote', label: 'Remote host' },
                            ]}
                        />
                    }
                    groupBy={
                        group === 'process'
                            ? (row) => row.process ?? 'Unknown'
                            : group === 'remote'
                              ? (row) => row.remoteAddress
                              : undefined
                    }
                    defaultSort={{ column: 'rate', direction: 'desc' }}
                />
            </Stack>
        </Frame>
    )
}

/** Each process's bytes a second over the history, the busiest four named. */
function perProcess(history: readonly NetworkSnapshot[], figure: (group: FlowGroup) => number) {
    const totals = new Map<string, number>()
    for (const snapshot of history)
        for (const group of snapshot.processes) totals.set(group.key, (totals.get(group.key) ?? 0) + figure(group))
    return [...totals]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 4)
        .map(([name], index) => ({
            name,
            color: `chart-${String(index + 1)}`,
            stack: 'processes',
            values: history.map((snapshot) => {
                const found = snapshot.processes.find((group) => group.key === name)
                return found === undefined ? 0 : figure(found)
            }),
        }))
}

function TrafficPage() {
    const watch = useWatch()
    const { history, latest } = watch
    const x = useMemo(() => history.map((snapshot) => clock(snapshot.at)), [history])
    const totals = useMemo(
        () => [
            { name: 'In', color: 'chart-1', values: history.map((snapshot) => snapshot.rateIn) },
            { name: 'Out', color: 'chart-2', values: history.map((snapshot) => snapshot.rateOut) },
        ],
        [history],
    )
    const inByProcess = useMemo(() => perProcess(history, (group) => group.rateIn), [history])
    const outByProcess = useMemo(() => perProcess(history, (group) => group.rateOut), [history])
    return (
        <Frame watch={watch} page="traffic">
            <Stack gap="section">
                <PageHeader title="Traffic" count="The last 5 min" />
                <DashboardGrid>
                    <StatPanel
                        title="In now"
                        value={latest.rateIn}
                        format={rate}
                        color="chart-1"
                        sparkline={totals[0].values}
                        span="quarter"
                    />
                    <StatPanel
                        title="Out now"
                        value={latest.rateOut}
                        format={rate}
                        color="chart-2"
                        sparkline={totals[1].values}
                        span="quarter"
                    />
                    <StatPanel title="Peak in" value={Math.max(...totals[0].values)} format={rate} color="chart-3" span="quarter" />
                    <StatPanel title="Peak out" value={Math.max(...totals[1].values)} format={rate} color="chart-4" span="quarter" />
                    <TimeSeriesPanel
                        title="Whole machine"
                        subtitle="bytes a second, in and out"
                        span="full"
                        x={x}
                        series={totals}
                        format={rate}
                        labelEvery={30}
                        bodyClassName="h-56"
                    />
                    <TimeSeriesPanel
                        title="In by process"
                        subtitle="bytes a second received"
                        span="half"
                        x={x}
                        series={inByProcess}
                        stacked
                        format={rate}
                        labelEvery={60}
                        bodyClassName="h-56"
                    />
                    <TimeSeriesPanel
                        title="Out by process"
                        subtitle="bytes a second sent"
                        span="half"
                        x={x}
                        series={outByProcess}
                        stacked
                        format={rate}
                        labelEvery={60}
                        bodyClassName="h-56"
                    />
                </DashboardGrid>
            </Stack>
        </Frame>
    )
}

/** The snapshot at a time, or the latest. */
function snapshotAt(watch: Watch, time: number | null): NetworkSnapshot {
    if (time === null) return watch.latest
    return watch.history.findLast((snapshot) => snapshot.at <= time) ?? watch.history[0]
}

function HostFacts({ snapshot, address, now }: { snapshot: NetworkSnapshot; address: string; now: number }) {
    const host = snapshot.remotes.find((flow) => flow.address === address)
    const mine = snapshot.connections.filter((connection) => connection.remoteAddress === address)
    return (
        <>
            <PanelSection title="Host">
                <DescriptionList
                    size="sm"
                    items={[
                        { term: 'Address', value: address, code: true },
                        { term: 'Place', value: networkPlace(address)?.label ?? 'Not placed' },
                        { term: 'Processes', value: host?.processes.join(', ') ?? 'None now' },
                        { term: 'In', value: host === undefined ? 'None' : rate(host.rateIn), numeric: true },
                        { term: 'Out', value: host === undefined ? 'None' : rate(host.rateOut), numeric: true },
                        { term: 'Last seen', value: host === undefined ? 'Not connected now' : <Freshness at={host.lastSeen} now={now} /> },
                    ]}
                />
            </PanelSection>
            <PanelSection title="Connections">
                <DataTable
                    variant="list"
                    framed={false}
                    minWidth="auto"
                    columns={[
                        { id: 'process', header: 'Process', width: 'minmax(6rem,1fr)', cell: (row) => row.process ?? 'Unknown' },
                        { id: 'state', header: 'State', width: '7rem', cell: (row) => row.state ?? 'No state', stack: 'secondary' },
                        {
                            id: 'rate',
                            header: 'Rate',
                            width: '5.5rem',
                            align: 'end',
                            cell: (row) => rate(row.rateIn + row.rateOut),
                            stack: 'secondary',
                        },
                    ]}
                    rows={mine}
                    rowKey={(row) => row.key}
                    empty="No connection to this host now."
                />
            </PanelSection>
        </>
    )
}

function MapPage({ initial }: { initial: string | null }) {
    const watch = useWatch()
    const [selected, setSelected] = useState<string | null>(initial)
    const [shownAt, setShownAt] = useState<number | null>(null)
    const snapshot = snapshotAt(watch, shownAt)
    const now = shownAt ?? watch.latest.at
    const { hosts, links } = useMemo(() => {
        const byHost = new Map<string, ConnectionFlow[]>()
        for (const connection of snapshot.connections)
            byHost.set(connection.remoteAddress, [...(byHost.get(connection.remoteAddress) ?? []), connection])
        const placed = flowTracks(snapshot.remotes, {
            home: NETWORK_HOME,
            classify: (track) => hostTone(byHost.get(String(track.properties?.address)) ?? []),
        })
        const shown: Track[] = placed.tracks.map((track) => ({
            id: track.id,
            position: [track.lon, track.lat],
            affiliation: track.affiliation,
            kind: 'other',
            label: String(track.properties?.place ?? '').split(',')[0],
        }))
        const tones = new Map(placed.tracks.map((track) => [track.id, track.affiliation]))
        const drawn: MapLink[] = placed.links.map((link) => ({ id: link.id, from: link.from, to: link.to, tone: tones.get(link.id) }))
        return { hosts: shown, links: drawn }
    }, [snapshot])
    const home: Track[] = [{ id: 'home', position: NETWORK_HOME, affiliation: 'friend', kind: 'sensor', label: 'This machine' }]
    const address = selected?.startsWith('flow:') === true ? selected.slice('flow:'.length) : undefined
    const panel = (
        <SidePanel
            tabs={[
                {
                    id: 'host',
                    label: address === undefined ? 'Hosts' : 'Host',
                    content:
                        address === undefined ? (
                            <PanelSection title="Busiest hosts">
                                <DataTable
                                    variant="list"
                                    framed={false}
                                    minWidth="auto"
                                    columns={[
                                        { id: 'host', header: 'Host', width: 'minmax(8rem,1fr)', cell: (flow) => flow.address },
                                        {
                                            id: 'rate',
                                            header: 'Rate',
                                            width: '6rem',
                                            align: 'end',
                                            cell: (flow) => rate(flow.rateIn + flow.rateOut),
                                            stack: 'secondary',
                                        },
                                    ]}
                                    rows={snapshot.remotes}
                                    rowKey={(flow) => flow.address}
                                    onOpen={(flow) => setSelected(`flow:${flow.address}`)}
                                />
                            </PanelSection>
                        ) : (
                            <HostFacts snapshot={snapshot} address={address} now={now} />
                        ),
                },
            ]}
            soleTab="tab"
        />
    )
    return (
        <Frame
            watch={watch}
            page="map"
            panel={panel}
            bottom={
                <PlaybackTimeline
                    label="Network watch"
                    from={watch.history[0].at}
                    to={watch.latest.at}
                    value={shownAt === null ? null : Math.max(watch.history[0].at, shownAt)}
                    onValueChange={setShownAt}
                    rate={10}
                    step={5_000}
                    activity={watch.history.map((each) => each.connections.length)}
                    timeZone="UTC"
                />
            }
        >
            <Stack gap="section" className="h-full">
                <PageHeader title="Map" count={`${String(hosts.length)} of ${String(snapshot.remotes.length)} hosts placed`} />
                <MapView
                    label="Remote hosts this machine talks to"
                    defaultBasemap={DARK_BASEMAP}
                    basemaps={[DARK_BASEMAP]}
                    fallbackBasemap={WORLD_BASEMAP}
                    camera={{ center: [-10, 28], zoom: 1 }}
                    selected={selected}
                    onSelectedChange={(id) => setSelected(id !== null && id.startsWith('flow:') ? id : null)}
                    notes={['Placed to the city at best; a host in the cloud shows where its data center is.']}
                    className="min-h-80 flex-1"
                >
                    <LinkLayer id="links" links={links} colors={COLORS} />
                    <TrackLayer id="hosts" tracks={hosts} colors={COLORS} trails={false} size={18} transition={0} />
                    <TrackLayer
                        id="home"
                        tracks={home}
                        colors={{ friend: 'var(--primary)' }}
                        trails={false}
                        interactive={false}
                        transition={0}
                    />
                    <MapCoordinates />
                    <MapOverlay corner="bottom-right">
                        <MapLegend
                            title="State"
                            entries={LEGEND}
                            counts={LEGEND_TONES.map((tone) => hosts.filter((host) => host.affiliation === tone).length)}
                            shape="line"
                            className="w-44"
                        />
                    </MapOverlay>
                </MapView>
            </Stack>
        </Frame>
    )
}

const meta: Meta = { title: 'Apps/Network watch', parameters: { layout: 'fullscreen' }, globals: { theme: 'dark' } }
export default meta

/**
 * Every connection of a machine, live: the tracking package's simulated machine read every second
 * from the same moment every time and gathered by its flow tracker, so connections open, establish
 * and close and their bytes and rates count up. Process, pid, protocol, both ends, place, state,
 * bytes in and out and rate, searchable and gathered by process or by remote host.
 */
export const Connections: StoryObj = { name: 'Connections', render: () => <ConnectionsPage /> }

/**
 * Bytes a second in and out over the last five minutes, for the whole machine and stacked by
 * process, moving on a second at a time, with the updater's and the backup's bursts: the next
 * update downloads twenty seconds after the story opens.
 */
export const Traffic: StoryObj = { name: 'Traffic', render: () => <TrafficPage /> }

/**
 * The map: this machine at home, a link to each located remote host colored by the state of its
 * connections, coming and going as connections open and close, the busiest hosts in the side panel,
 * and the playback timeline to look back over the readings kept.
 */
export const WorldMap: StoryObj = { name: 'Map', render: () => <MapPage initial={null} /> }

/** A host picked on the map: where it is, what talks to it and each of its connections, in the side panel, its rates read each second. */
export const Host: StoryObj = { name: 'Host', render: () => <MapPage initial={`flow:${PICKED_HOST}`} /> }
