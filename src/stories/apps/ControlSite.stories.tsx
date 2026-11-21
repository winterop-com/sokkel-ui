import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Activity,
    Bell,
    CloudLightning,
    Crosshair,
    History,
    List,
    ListChecks,
    Map as MapIcon,
    MonitorPlay,
    Network,
    Orbit,
    Pause,
    Plane,
    Play,
    Radio,
    Satellite,
    Server,
    Settings,
    Ship,
    TriangleAlert,
    type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { ActivityList } from '@winterop-com/sokkel-ui/ActivityList'
import { AlertTicker } from '@winterop-com/sokkel-ui/AlertTicker'
import { CheckList } from '@winterop-com/sokkel-ui/CheckList'
import { Chip } from '@winterop-com/sokkel-ui/Chip'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Freshness } from '@winterop-com/sokkel-ui/Freshness'
import { Kiosk } from '@winterop-com/sokkel-ui/Kiosk'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PlaybackTimeline } from '@winterop-com/sokkel-ui/PlaybackTimeline'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { Sparkline, Stat } from '@winterop-com/sokkel-ui/Stat'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'
import { StatusTile, StatusWall } from '@winterop-com/sokkel-ui/StatusWall'
import { Timeline } from '@winterop-com/sokkel-ui/Timeline'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { TrackCard } from '@winterop-com/sokkel-ui/TrackCard'
import { TrackRoster } from '@winterop-com/sokkel-ui/TrackRoster'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { DARK_BASEMAP } from '@winterop-com/sokkel-ui-maps/basemap'
import { CoverageLayer } from '@winterop-com/sokkel-ui-maps/CoverageLayer'
import { GeoJsonLayer } from '@winterop-com/sokkel-ui-maps/GeoJsonLayer'
import { formatCoordinates } from '@winterop-com/sokkel-ui-maps/geodesy'
import { LinkLayer } from '@winterop-com/sokkel-ui-maps/LinkLayer'
import { MapCompass } from '@winterop-com/sokkel-ui-maps/MapCompass'
import { MapCoordinates } from '@winterop-com/sokkel-ui-maps/MapCoordinates'
import { MapOverlay, MapView, type MapViewProps } from '@winterop-com/sokkel-ui-maps/MapView'
import { PointLayer } from '@winterop-com/sokkel-ui-maps/PointLayer'
import { TrackLayer } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { ZoneLayer } from '@winterop-com/sokkel-ui-maps/ZoneLayer'
import { CHECK_WORDS, type CheckStatus } from '@winterop-com/sokkel-ui-tracking/checks'
import { INCIDENT_WORDS } from '@winterop-com/sokkel-ui-tracking/events'
import type { EngineState, SourceAlert, SourceEngine, SourceState } from '@winterop-com/sokkel-ui-tracking/sources'
import { CONTROL_NOW, CONTROL_SOURCE_WORDS, controlEngine, controlSources, type ControlData } from '../fixtures/control'
import { factsOf, motionOf, pictureOf, type Picture } from '../fixtures/controlPicture'
import { clockTime, useSimClock, type StoryClock } from '../fixtures/simulation'
import { TidevannMark } from '../fixtures/TidevannMark'

/** How fast the site's clock plays: half a simulated minute each second. */
const SPEED = 30

const ICONS: Record<string, LucideIcon> = {
    quakes: Activity,
    disasters: TriangleAlert,
    warnings: CloudLightning,
    vessels: Ship,
    flights: Plane,
    satellites: Satellite,
    station: Orbit,
    server: Server,
    machine: Network,
}

const KINDS: Record<string, string> = { incidents: 'Incidents', tracks: 'Tracks', server: 'Server health', links: 'Connections' }

/** The states the site's chips say: a source's status, and an incident's severity. */
const STATUSES = {
    up: { color: 'good' },
    degraded: { color: 'warning' },
    down: { color: 'critical', live: true },
    unknown: { color: 'neutral' },
    minor: { color: 'neutral' },
    moderate: { color: 'info' },
    severe: { color: 'warning' },
    extreme: { color: 'critical' },
} as const

const ALERT_TONE: Record<CheckStatus, 'critical' | 'warning' | 'good' | 'quiet'> = {
    down: 'critical',
    degraded: 'warning',
    up: 'good',
    unknown: 'quiet',
}
const SPARK_TONE = { up: 'good', degraded: 'warning', down: 'critical', unknown: 'muted' } as const

const alertText = (alert: SourceAlert) =>
    `${alert.label} is ${CHECK_WORDS.statuses[alert.to].toLowerCase()}${alert.reason === undefined ? '' : ` (${alert.reason})`}`

const lastLatency = (source: SourceState) => {
    const last = [...source.latency].reverse().find((value) => value !== null)
    return last === undefined || last === null ? undefined : Math.round(last)
}
const series = (source: SourceState) => source.latency.filter((value): value is number => value !== null)

function noteOf(source: SourceState): string | undefined {
    const failed = source.results.find((result) => result.failure !== undefined)?.failure
    return failed === undefined
        ? undefined
        : `${CHECK_WORDS.reasons[failed.reason]}${failed.actual === undefined ? '' : `: ${failed.actual}`}`
}

/** The site as its views read it: the clock, the engine's state, the picture at the clock's moment, the pick and the alerts acknowledged. */
interface Site extends StoryClock {
    state: EngineState
    picture: Picture
    selected: string | null
    select: (key: string | null) => void
    acknowledged: ReadonlySet<string>
    acknowledge: (ids: readonly string[]) => void
    /** The moment played back; null while live. */
    playhead: number | null
    setPlayhead: (at: number | null) => void
}

/**
 * The control site, simulated: an engine over the tracking add-on's simulated feeds, read through
 * the forty minutes before the story's moment so the wall opens with a history, then read on as the
 * story's clock plays. It starts at the same moment every time, so the first frame is the same.
 */
function useSite(picked: string | null = null): Site {
    const clock = useSimClock(CONTROL_NOW, SPEED)
    const engine: SourceEngine = useMemo(() => controlEngine(), [])
    useEffect(() => engine.poll(clock.now), [engine, clock.now])
    const state = useSyncExternalStore(engine.subscribe, engine.state, engine.state)
    const [selected, select] = useState<string | null>(picked)
    const [acknowledged, setAcknowledged] = useState<ReadonlySet<string>>(new Set())
    const [playhead, setPlayhead] = useState<number | null>(null)
    const picture = useMemo(() => {
        const data = Object.fromEntries(controlSources().map((source) => [source.id, engine.data(source.id)])) as Partial<ControlData>
        return pictureOf(data, playhead ?? clock.now, selected)
    }, [engine, state, clock.now, selected, playhead])
    return {
        ...clock,
        state,
        picture,
        selected,
        select,
        acknowledged,
        acknowledge: (ids) => setAcknowledged((was) => new Set([...was, ...ids])),
        playhead,
        setPlayhead,
    }
}

const BANDS = { ground: 'var(--muted-foreground)', low: 'var(--chart-3)', medium: 'var(--chart-2)', high: 'var(--chart-4)' }

/** The site's map: every source a layer over the dark street map, warned areas glowing, the radars and the station's view sweeping, light along the machine's connections. */
function SiteMap({
    site,
    labels = true,
    children,
    ...view
}: { site: Site; labels?: boolean; children?: ReactNode } & Partial<MapViewProps>) {
    const { picture } = site
    return (
        <MapView
            label="Control map"
            defaultBasemap={DARK_BASEMAP}
            basemaps={[DARK_BASEMAP]}
            fallbackBasemap={WORLD_BASEMAP}
            selected={site.selected}
            onSelectedChange={(id) => site.select(id)}
            rotate
            framed={false}
            className="h-full"
            {...view}
        >
            <ZoneLayer id="warnings" zones={picture.zones} fill="hatched" glow labels={false} />
            <CoverageLayer id="quakes" cones={picture.quakes} bands={5} />
            <CoverageLayer id="cover" cones={picture.cover} sweep={{ period: 6000 }} />
            <LinkLayer id="machine" links={picture.links} path="great-circle" arc flow interactive={false} />
            <GeoJsonLayer id="path" data={picture.path} color="var(--track-friend)" interactive={false} />
            <PointLayer id="disasters" data={picture.disasters} color="var(--warning)" radius={7} />
            <TrackLayer id="hosts" tracks={picture.hosts} labels={false} trails={false} size={14} />
            <TrackLayer id="vessels" tracks={picture.vessels} labels={labels} />
            <TrackLayer id="flights" tracks={picture.flights} bands={BANDS} labels={labels} />
            <TrackLayer id="satellites" tracks={picture.satellites} labels={labels} trails={false} size={22} />
            {children}
        </MapView>
    )
}

function WallPage() {
    const site = useSite()
    const { picture, state } = site
    const open = state.alerts.filter((alert) => !site.acknowledged.has(alert.id))
    const up = state.sources.filter((source) => source.status === 'up').length
    return (
        <StatusProvider statuses={STATUSES}>
            <TooltipProvider>
                <Kiosk
                    className="h-svh"
                    asideWidth="lg"
                    label="Control wall"
                    mark={<TidevannMark />}
                    title="Control site"
                    clock={clockTime(site.now)}
                    actions={
                        <Button variant="ghost" size="sm" onClick={site.toggle}>
                            {site.running ? <Pause aria-hidden /> : <Play aria-hidden />}
                            {site.running ? 'Pause' : 'Resume'}
                        </Button>
                    }
                    figures={
                        <>
                            <Stat label="Vessels" value={String(picture.counts.vessels)} size="lg" dot="var(--track-neutral)" />
                            <Stat label="Aircraft" value={String(picture.counts.aircraft)} size="lg" dot="var(--chart-4)" />
                            <Stat label="Satellites" value={String(picture.counts.satellites)} size="lg" dot="var(--track-friend)" />
                            <Stat label="Incidents" value={String(picture.counts.incidents)} size="lg" dot="var(--warning)" />
                            <Stat label="Open alerts" value={String(open.length)} size="lg" dot="var(--critical)" />
                            <Stat
                                label="Sources up"
                                value={String(up)}
                                unit={`of ${String(state.sources.length)}`}
                                size="lg"
                                dot="var(--good)"
                            />
                        </>
                    }
                    aside={
                        <StatusWall label="Sources" tile="sm">
                            {state.sources.map((source) => {
                                const Icon = ICONS[source.id]
                                return (
                                    <StatusTile
                                        key={source.id}
                                        name={source.label}
                                        icon={<Icon aria-hidden />}
                                        status={source.status}
                                        value={lastLatency(source)?.toLocaleString('en-US')}
                                        unit={lastLatency(source) === undefined ? undefined : 'ms'}
                                        detail={noteOf(source)}
                                        series={series(source)}
                                        seriesLabel={`${source.label}, latency over the last reads`}
                                        flag="Simulated"
                                        selected={site.selected === `${source.id}:`}
                                        onSelect={() => site.select(`${source.id}:`)}
                                    />
                                )
                            })}
                        </StatusWall>
                    }
                    foot={
                        <AlertTicker
                            label="Alerts"
                            paused={!site.running}
                            items={open.map((alert) => ({
                                id: alert.id,
                                text: alertText(alert),
                                tone: ALERT_TONE[alert.to],
                                when: clockTime(alert.at),
                            }))}
                        />
                    }
                >
                    <SiteMap
                        site={site}
                        labels={false}
                        projection="globe"
                        camera={{ center: [6, 52], zoom: 2.2 }}
                        controls={false}
                        interactive={false}
                    >
                        <MapOverlay corner="top-left">
                            <Chip>The coast</Chip>
                        </MapOverlay>
                    </SiteMap>
                </Kiosk>
            </TooltipProvider>
        </StatusProvider>
    )
}

const GROUPS = (active: string, alerts: number): RailGroup[] =>
    [
        {
            id: 'site',
            entries: [
                { id: 'operator', label: 'Operator', icon: MapIcon, href: '#', description: 'The map, the roster and the alerts' },
                {
                    id: 'sources',
                    label: 'Sources',
                    icon: Radio,
                    href: '#',
                    description: 'Each source, its checks and its history',
                    count: alerts,
                },
                { id: 'wall', label: 'Wall', icon: MonitorPlay, href: '#', description: 'The site for a screen on a wall' },
            ],
        },
        { id: 'system', entries: [{ id: 'settings', label: 'Settings', icon: Settings, href: '#', description: 'Sources, wall, map' }] },
    ].map((group) => ({ ...group, entries: group.entries.map((entry) => ({ ...entry, active: entry.id === active })) }))

/** The frame the operator's pages stand in: the rail, the top bar with Pause, and the foot strip with the clock and the sources counted. */
function Frame({
    site,
    active,
    trail,
    panel,
    children,
}: {
    site: Site
    active: string
    trail: string
    panel?: ReactNode
    children: ReactNode
}) {
    const open = site.state.alerts.filter((alert) => !site.acknowledged.has(alert.id)).length
    const down = site.state.sources.filter((source) => source.status === 'down').length
    return (
        <StatusProvider statuses={STATUSES}>
            <TooltipProvider>
                <Shell
                    rail={
                        <Rail
                            mark={<TidevannMark />}
                            markHref="#"
                            name="Control site"
                            groups={GROUPS(active, open)}
                            foot={<AccountMenu name="grace" where="tidevann.example.org" />}
                        />
                    }
                    top={
                        <TopBar
                            trail={[{ label: 'Control site', href: '#' }, { label: trail }]}
                            actions={
                                <Button variant="ghost" size="sm" onClick={site.toggle}>
                                    {site.running ? <Pause aria-hidden /> : <Play aria-hidden />}
                                    {site.running ? 'Pause' : 'Resume'}
                                </Button>
                            }
                        />
                    }
                    panel={panel}
                    foot={
                        <StatusLine
                            live={site.running}
                            tone={!site.running ? 'quiet' : down > 0 ? 'warn' : 'live'}
                            note={`Simulated, ${clockTime(site.now)}`}
                        >
                            <StatusItem label="sources">{String(site.state.sources.length)}</StatusItem>
                            <StatusItem label="open alerts">{String(open)}</StatusItem>
                            <StatusItem label="speed">{`${String(SPEED)}×`}</StatusItem>
                        </StatusLine>
                    }
                >
                    {children}
                </Shell>
            </TooltipProvider>
        </StatusProvider>
    )
}

type Held = Picture['incidents'][number]

const INCIDENTS: DataColumn<Held>[] = [
    { id: 'what', header: 'Incident', width: 'minmax(10rem,1fr)', cell: (incident) => incident.label, stack: 'lead' },
    {
        id: 'severity',
        header: 'Severity',
        width: '7rem',
        cell: (incident) => <StatusChip status={incident.severity} label={INCIDENT_WORDS.severities[incident.severity]} />,
        stack: 'secondary',
    },
    { id: 'at', header: 'Since', width: '8rem', cell: (incident) => clockTime(incident.at), stack: 'secondary' },
]

const TRACK_KINDS = { vessels: 'vessel', flights: 'aircraft', satellites: 'satellite', machine: 'host' } as const

/** The satellite picked as the operator's page opens. */
const PICKED = 'satellites:90003'

function OperatorPage() {
    const site = useSite(PICKED)
    const { picture, state, now } = site
    const [tab, setTab] = useState('pick')
    const picked = picture.pick(site.selected)
    const row = picture.roster.find((each) => each.id === site.selected)
    const pick = (key: string) => {
        site.select(key)
        setTab('pick')
    }
    const panel = (
        <SidePanel
            active={tab}
            onActiveChange={setTab}
            tabs={[
                {
                    id: 'pick',
                    label: 'Pick',
                    icon: Crosshair,
                    content:
                        picked === undefined ? undefined : picked.type === 'incident' ? (
                            <PanelSection title={picked.incident.label}>
                                <DescriptionList
                                    size="sm"
                                    items={[
                                        { term: 'Kind', value: INCIDENT_WORDS.kinds[picked.incident.kind] },
                                        { term: 'Severity', value: <StatusChip status={picked.incident.severity} /> },
                                        { term: 'Magnitude', value: picked.incident.magnitude?.toFixed(1), numeric: true },
                                        { term: 'Since', value: clockTime(picked.incident.at) },
                                        {
                                            term: 'Position',
                                            value: formatCoordinates([picked.incident.lon, picked.incident.lat]),
                                            code: true,
                                        },
                                    ]}
                                />
                            </PanelSection>
                        ) : (
                            <PanelSection title={row?.name ?? picked.track.id}>
                                <TrackCard
                                    name={row?.name ?? picked.track.id}
                                    code={picked.track.id}
                                    kind={row?.kind ?? 'other'}
                                    affiliation={picked.track.affiliation}
                                    heading={picked.track.heading}
                                    states={['Simulated', ...(row?.states ?? [])]}
                                    detail={motionOf(picked.track, TRACK_KINDS[picked.source as keyof typeof TRACK_KINDS] ?? 'vessel')}
                                    updatedAt={picked.track.updatedAt ?? null}
                                    now={now}
                                />
                                <DescriptionList
                                    size="sm"
                                    items={[
                                        { term: 'Position', value: formatCoordinates([picked.track.lon, picked.track.lat]), code: true },
                                        { term: 'Read from', value: picked.track.source, code: true },
                                        ...factsOf(picked.track),
                                    ]}
                                />
                            </PanelSection>
                        ),
                },
                {
                    id: 'roster',
                    label: 'Tracks',
                    icon: List,
                    content: (
                        <TrackRoster
                            framed={false}
                            className="h-full"
                            tracks={picture.roster}
                            now={now}
                            selected={site.selected}
                            onSelect={pick}
                        />
                    ),
                },
                {
                    id: 'incidents',
                    label: 'Incidents',
                    icon: TriangleAlert,
                    content: (
                        <DataTable
                            className="h-full"
                            columns={INCIDENTS}
                            rows={picture.incidents}
                            rowKey={(incident) => incident.key}
                            onOpen={(incident) => pick(incident.key)}
                            opened={(incident) => incident.key === site.selected}
                            empty="No incident holds."
                        />
                    ),
                },
                {
                    id: 'alerts',
                    label: 'Alerts',
                    icon: Bell,
                    content: (
                        <ActivityList
                            items={state.alerts.map((alert) => ({
                                id: alert.id,
                                text: alertText(alert),
                                when: clockTime(alert.at),
                                tone: ALERT_TONE[alert.to],
                                unread: !site.acknowledged.has(alert.id),
                                action: site.acknowledged.has(alert.id)
                                    ? undefined
                                    : { label: 'Acknowledge', onClick: () => site.acknowledge([alert.id]) },
                            }))}
                            onRead={(id) => site.acknowledge([id])}
                            onReadAll={() => site.acknowledge(state.alerts.map((alert) => alert.id))}
                            words={{ title: 'Alerts', markAllRead: 'Acknowledge all', empty: 'No alerts.' }}
                        />
                    ),
                },
            ]}
        />
    )
    return (
        <Frame site={site} active="operator" trail="Operator" panel={panel}>
            <Stack gap="none" className="h-full min-h-0">
                <SiteMap site={site} camera={{ center: [5, 60], zoom: 4.2 }}>
                    <MapCompass />
                    <MapCoordinates scale />
                </SiteMap>
                <PlaybackTimeline
                    label="Control site"
                    from={CONTROL_NOW - 3_600_000}
                    to={Math.max(now, CONTROL_NOW)}
                    value={site.playhead}
                    onValueChange={site.setPlayhead}
                    rate={60}
                    timeZone="UTC"
                />
            </Stack>
        </Frame>
    )
}

const every = (interval: number) =>
    interval >= 3_600_000
        ? `${String(interval / 3_600_000)} h`
        : interval >= 60_000
          ? `${String(interval / 60_000)} min`
          : `${String(interval / 1000)} s`

const sourceColumns = (now: number): DataColumn<SourceState>[] => [
    {
        id: 'source',
        header: 'Source',
        width: 'minmax(11rem,1.2fr)',
        cell: (source) => {
            const Icon = ICONS[source.id]
            return (
                <Row gap="xs">
                    <Icon aria-hidden className="size-4 text-muted-foreground" />
                    {source.label}
                </Row>
            )
        },
        stack: 'lead',
    },
    { id: 'status', header: 'Status', width: '8rem', cell: (source) => <StatusChip status={source.status} dot />, stack: 'secondary' },
    { id: 'kind', header: 'Gives', width: '8rem', cell: (source) => KINDS[source.kind] ?? source.kind, stack: 'secondary' },
    {
        id: 'latency',
        header: 'Latency',
        width: '7rem',
        align: 'end',
        cell: (source) => (lastLatency(source) === undefined ? '' : `${String(lastLatency(source))} ms`),
    },
    {
        id: 'trend',
        header: 'Last reads',
        width: '9rem',
        cell: (source) =>
            series(source).length > 1 ? (
                <Sparkline
                    values={series(source)}
                    tone={SPARK_TONE[source.status]}
                    label={`${source.label}, latency over the last reads`}
                />
            ) : (
                ''
            ),
        stack: 'none',
    },
    {
        id: 'uptime',
        header: 'Uptime',
        width: '6rem',
        align: 'end',
        cell: (source) => (source.summary.uptime === undefined ? '' : `${(source.summary.uptime * 100).toFixed(0)}%`),
        stack: 'none',
    },
    { id: 'every', header: 'Every', width: '5rem', align: 'end', cell: (source) => every(source.interval), stack: 'none' },
    {
        id: 'read',
        header: 'Last read',
        width: '8rem',
        cell: (source) => <Freshness at={source.readAt ?? null} now={now} />,
        stack: 'secondary',
    },
]

function SourcesPage() {
    const site = useSite()
    const { state, now } = site
    const [opened, setOpened] = useState('server')
    const cells = useMemo(() => sourceColumns(now), [now])
    const source = state.sources.find((each) => each.id === opened) ?? state.sources[0]
    const words = CONTROL_SOURCE_WORDS[source.id as keyof ControlData]
    const checks = controlSources().find((each) => each.id === source.id)?.checks ?? []
    const panel = (
        <SidePanel
            defaultActive="checks"
            tabs={[
                {
                    id: 'checks',
                    label: 'Checks',
                    icon: ListChecks,
                    content: (
                        <>
                            <PanelSection title={source.label}>
                                <DescriptionList
                                    size="sm"
                                    items={[
                                        { term: 'Status', value: <StatusChip status={source.status} dot /> },
                                        { term: 'Since', value: source.since === undefined ? undefined : clockTime(source.since) },
                                        { term: 'Gives', value: KINDS[source.kind] ?? source.kind },
                                        { term: 'What', value: words.summary },
                                        { term: 'Limit', value: words.limit },
                                        { term: 'Read', value: 'Simulated' },
                                    ]}
                                />
                            </PanelSection>
                            <PanelSection title="Last results">
                                <CheckList
                                    checks={checks.map((check) => {
                                        const result = source.results.find((each) => each.check === check.id)
                                        const failure = result?.failure
                                        return {
                                            name: check.label,
                                            status: result?.status === 'up' ? 'ok' : result?.status === 'down' ? 'fail' : 'warn',
                                            detail:
                                                failure === undefined
                                                    ? result?.latency === undefined
                                                        ? undefined
                                                        : `${String(Math.round(result.latency))} ms`
                                                    : `${CHECK_WORDS.reasons[failure.reason]}${failure.actual === undefined ? '' : `: ${failure.actual}`}`,
                                        }
                                    })}
                                />
                            </PanelSection>
                        </>
                    ),
                },
                {
                    id: 'history',
                    label: 'History',
                    icon: History,
                    content: (
                        <PanelSection title="Changes of status">
                            <Timeline
                                events={[...source.transitions].reverse().map((step) => ({
                                    id: String(step.at),
                                    title: `${CHECK_WORDS.statuses[step.to]}, from ${CHECK_WORDS.statuses[step.from].toLowerCase()}`,
                                    at: clockTime(step.at),
                                    tone: step.to,
                                }))}
                            />
                        </PanelSection>
                    ),
                },
            ]}
        />
    )
    const up = state.sources.filter((each) => each.status === 'up').length
    return (
        <Frame site={site} active="sources" trail="Sources" panel={panel}>
            <Page className="h-full">
                <PageHeader title="Sources" count={`${String(up)} of ${String(state.sources.length)} up`} />
                <DataTable
                    className="min-h-0 flex-1"
                    columns={cells}
                    rows={state.sources}
                    rowKey={(each) => each.id}
                    onOpen={(each) => setOpened(each.id)}
                    opened={(each) => each.id === opened}
                    empty="No sources."
                    minWidth="56rem"
                />
            </Page>
        </Frame>
    )
}

const meta: Meta = { title: 'Apps/Control site', parameters: { layout: 'fullscreen' }, globals: { theme: 'dark' } }
export default meta

/**
 * Tidevann's control site as a wall: the globe with every source drawn on it (vessels and aircraft
 * off the coast, satellites with the station's view sweeping under it, earthquakes as discs as wide
 * as they were strong, warned areas glowing, light running along a machine's connections), each
 * source's status as a tile with its latency over the last reads, the counts over the map and the
 * alerts along the foot. Every source is the tracking package's simulation, read by one engine that
 * judges each answer with the source's checks and raises an alert when a status changes; it starts
 * at the same moment every time and plays on at thirty times real time.
 */
export const Wall: StoryObj = { name: 'Wall', render: () => <WallPage /> }
/**
 * The operator's console over the same state: the map with every layer and its tools, a satellite
 * picked with its path over the ground behind and ahead, its card and values in the side panel
 * beside the roster of tracks, the incidents and the alerts to acknowledge, and the last hour on the
 * timeline along the foot.
 */
export const Operator: StoryObj = { name: 'Operator', render: () => <OperatorPage /> }
/**
 * The sources as a table: each one's status, what it gives, how fast it answered and over the last
 * reads, its uptime and how often it is read. One is opened, with its checks' last results and its
 * changes of status in the side panel.
 */
export const Sources: StoryObj = { name: 'Sources', render: () => <SourcesPage /> }
