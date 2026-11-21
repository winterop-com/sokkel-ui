import { ActivityList } from '@winterop-com/sokkel-ui/ActivityList'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PlaybackTimeline } from '@winterop-com/sokkel-ui/PlaybackTimeline'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { TrackCard } from '@winterop-com/sokkel-ui/TrackCard'
import { TrackRoster } from '@winterop-com/sokkel-ui/TrackRoster'
import { formatCoordinates } from '@winterop-com/sokkel-ui-maps/geodesy'
import { MapCompass } from '@winterop-com/sokkel-ui-maps/MapCompass'
import { MapCoordinates } from '@winterop-com/sokkel-ui-maps/MapCoordinates'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapOverlay } from '@winterop-com/sokkel-ui-maps/MapView'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { ALTITUDE_BANDS } from '@winterop-com/sokkel-ui-tracking/adsb'
import { INCIDENT_WORDS } from '@winterop-com/sokkel-ui-tracking/events'
import { Bell, Crosshair, Layers, List, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { go } from 'tidevann-shared/router'

import { SPAN } from '../history'
import { BAND_COLORS, ControlMap, LAYERS } from '../parts/ControlMap'
import type { Picture } from '../picture'
import { factsOf, motionOf } from '../picture'
import { change } from '../store'
import { ALERT_TONE, alertText, clockTime, sourceNote, type Watch } from '../watch'

const BAND_NAMES = { ground: 'On the ground', low: 'Below 10,000 ft', medium: '10,000 to 25,000 ft', high: 'Above 25,000 ft' }

const KINDS = { vessels: 'vessel', flights: 'aircraft', satellites: 'satellite', machine: 'host' } as const

type Held = Picture['incidents'][number]

/** How many bars the timeline's strip of alerts has. */
const BINS = 60

/** The operator's map: every layer, the map's tools, and the last hour to play back along its foot. */
export function Operator({ watch, hidden }: { watch: Watch; hidden: ReadonlySet<string> }) {
    const { picture, options, shared, state, now } = watch
    const activity = useMemo(() => {
        const bins = Array.from({ length: BINS }, () => 0)
        for (const alert of state.alerts) {
            const bin = Math.floor(((alert.at - (now - SPAN)) / SPAN) * BINS)
            if (bin >= 0 && bin < BINS) bins[bin] += 1
        }
        return bins
        // The strip moves a bar a minute, not a second.
    }, [state.alerts, Math.floor(now / 60_000)])
    return (
        <Stack gap="none" className="h-full min-h-0">
            <ControlMap
                picture={picture}
                hidden={hidden}
                selected={shared.selected}
                onSelect={watch.select}
                camera={{ center: [6, 59], zoom: 3.4 }}
                controls={{ zoom: true, fit: false, fullscreen: true, projection: true }}
                labels={options.labels}
                trails={options.trails}
            >
                <MapCompass />
                <MapCoordinates scale />
                <MapOverlay corner="bottom-right">
                    <MapLegend
                        title="Altitude"
                        entries={ALTITUDE_BANDS.map((band) => ({ label: BAND_NAMES[band], color: BAND_COLORS[band] }))}
                        counts={ALTITUDE_BANDS.map((band) => picture.flights.filter((track) => track.band === band).length)}
                        shape="point"
                        className="w-48"
                    />
                </MapOverlay>
            </ControlMap>
            <PlaybackTimeline
                label="Control site"
                from={now - SPAN}
                to={now}
                value={shared.playhead}
                onValueChange={(playhead) => change({ playhead })}
                rate={60}
                activity={activity}
                timeZone={options.zone === 'utc' ? 'UTC' : undefined}
            />
        </Stack>
    )
}

const INCIDENT_COLUMNS = (zone: 'utc' | 'local'): DataColumn<Held>[] => [
    { id: 'what', header: 'Incident', width: 'minmax(10rem,1fr)', cell: (incident) => incident.label, stack: 'lead' },
    {
        id: 'severity',
        header: 'Severity',
        width: '7rem',
        cell: (incident) => <StatusChip status={incident.severity} label={INCIDENT_WORDS.severities[incident.severity]} />,
        stack: 'secondary',
    },
    { id: 'at', header: 'Since', width: '7rem', cell: (incident) => clockTime(incident.at, zone), stack: 'secondary' },
]

/** What is selected, in full: a track's card and values, an incident's facts, or a source's standing. */
function Detail({ watch }: { watch: Watch }) {
    const { picture, shared, state, now, options } = watch
    const picked = picture.pick(shared.selected)
    const source = shared.selected?.endsWith(':') === true ? state.sources.find((each) => `${each.id}:` === shared.selected) : undefined
    if (source !== undefined)
        return (
            <PanelSection
                title={source.label}
                actions={
                    <Button variant="outline" size="sm" onClick={() => go(`/sources/${source.id}`)}>
                        Open
                    </Button>
                }
            >
                <DescriptionList
                    size="sm"
                    items={[
                        { term: 'Status', value: <StatusChip status={source.status} dot /> },
                        { term: 'Read', value: source.mode === 'simulated' ? 'Simulated' : source.mode === 'live' ? 'Live' : 'Off' },
                        { term: 'Note', value: sourceNote(source) },
                        { term: 'Last read', value: source.readAt === undefined ? undefined : clockTime(source.readAt, options.zone) },
                    ]}
                />
            </PanelSection>
        )
    if (picked === undefined)
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>Nothing picked</EmptyTitle>
                    <EmptyDescription>
                        Pick a track on the map or in the roster, or an incident. Every window shows the same pick.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        )
    if (picked.type === 'incident') {
        const { incident } = picked
        return (
            <PanelSection title={incident.label}>
                <DescriptionList
                    size="sm"
                    items={[
                        { term: 'Kind', value: INCIDENT_WORDS.kinds[incident.kind] },
                        {
                            term: 'Severity',
                            value: <StatusChip status={incident.severity} label={INCIDENT_WORDS.severities[incident.severity]} />,
                        },
                        { term: 'Magnitude', value: incident.magnitude?.toFixed(1), numeric: true },
                        { term: 'Since', value: clockTime(incident.at, options.zone) },
                        { term: 'Until', value: incident.until === undefined ? undefined : clockTime(incident.until, options.zone) },
                        { term: 'Position', value: formatCoordinates([incident.lon, incident.lat]), code: true },
                        { term: 'Source', value: incident.source, code: true },
                        {
                            term: 'Report',
                            value:
                                incident.url === undefined ? undefined : (
                                    <TextLink href={incident.url} external>
                                        Open
                                    </TextLink>
                                ),
                        },
                    ]}
                />
            </PanelSection>
        )
    }
    const { track } = picked
    const kind = KINDS[picked.source as keyof typeof KINDS] ?? 'vessel'
    const row = picture.roster.find((each) => each.id === shared.selected)
    return (
        <PanelSection title={row?.name ?? track.label ?? track.id}>
            <TrackCard
                name={row?.name ?? track.label ?? track.id}
                code={track.id}
                kind={row?.kind ?? 'other'}
                affiliation={track.affiliation}
                heading={track.heading}
                states={row?.states}
                detail={motionOf(track, kind)}
                updatedAt={track.updatedAt ?? null}
                now={now}
            />
            <DescriptionList
                size="sm"
                items={[
                    { term: 'Position', value: formatCoordinates([track.lon, track.lat]), code: true },
                    { term: 'Read from', value: track.source, code: true },
                    ...factsOf(track),
                ]}
            />
        </PanelSection>
    )
}

/** The operator's side panel: the pick, the roster, the incidents, the alerts to acknowledge and the map's layers. */
export function OperatorPanel({
    watch,
    hidden,
    onHiddenChange,
}: {
    watch: Watch
    hidden: ReadonlySet<string>
    onHiddenChange: (hidden: ReadonlySet<string>) => void
}) {
    const { picture, shared, state, now, options, open } = watch
    const [tab, setTab] = useState('pick')
    const columns = useMemo(() => INCIDENT_COLUMNS(options.zone), [options.zone])
    const layers: DataColumn<(typeof LAYERS)[number]>[] = [
        { id: 'layer', header: 'Layer', width: 'minmax(8rem,1fr)', cell: (layer) => layer.name, stack: 'lead' },
        { id: 'holds', header: 'Holds', width: 'minmax(10rem,1.4fr)', cell: (layer) => layer.description, stack: 'secondary' },
        {
            id: 'shown',
            header: 'Shown',
            width: '5rem',
            cell: (layer) => (
                <Switch
                    aria-label={`Show ${layer.name}`}
                    checked={!hidden.has(layer.id)}
                    onCheckedChange={(visible) => {
                        const next = new Set(hidden)
                        if (visible) next.delete(layer.id)
                        else next.add(layer.id)
                        onHiddenChange(next)
                    }}
                />
            ),
            stack: 'secondary',
        },
    ]
    const pick = (key: string) => {
        watch.select(key)
        setTab('pick')
    }
    return (
        <SidePanel
            active={tab}
            onActiveChange={setTab}
            tabs={[
                { id: 'pick', label: 'Pick', icon: Crosshair, content: <Detail watch={watch} /> },
                {
                    id: 'roster',
                    label: 'Tracks',
                    icon: List,
                    content: (
                        <TrackRoster
                            framed={false}
                            className="h-full"
                            tracks={picture.roster.slice(0, 400)}
                            now={now}
                            selected={shared.selected}
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
                            columns={columns}
                            rows={picture.incidents}
                            rowKey={(incident) => incident.key}
                            onOpen={(incident) => pick(incident.key)}
                            opened={(incident) => incident.key === shared.selected}
                            empty="No incident holds."
                        />
                    ),
                },
                {
                    id: 'alerts',
                    label: `Alerts (${String(open.length)})`,
                    icon: Bell,
                    content: (
                        <ActivityList
                            items={state.alerts.map((alert) => ({
                                id: alert.id,
                                text: alertText(alert),
                                when: clockTime(alert.at, options.zone),
                                tone: ALERT_TONE[alert.to],
                                unread: !shared.acknowledged.includes(alert.id),
                                action: shared.acknowledged.includes(alert.id)
                                    ? undefined
                                    : { label: 'Acknowledge', onClick: () => watch.acknowledge([alert.id]) },
                            }))}
                            onRead={(id) => watch.acknowledge([id])}
                            onReadAll={() => watch.acknowledge(state.alerts.map((alert) => alert.id))}
                            words={{
                                title: 'Alerts',
                                markAllRead: 'Acknowledge all',
                                empty: 'No alerts. One is raised when a source changes status.',
                            }}
                        />
                    ),
                },
                {
                    id: 'layers',
                    label: 'Layers',
                    icon: Layers,
                    content: (
                        <DataTable className="h-full" columns={layers} rows={LAYERS} rowKey={(layer) => layer.id} empty="No layers." />
                    ),
                },
            ]}
        />
    )
}
