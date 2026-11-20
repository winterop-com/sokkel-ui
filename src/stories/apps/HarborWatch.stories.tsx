import type { Meta, StoryObj } from '@storybook/react-vite'
import { Check, Eye, EyeOff, Hexagon, ListChecks, Pause, Pencil, Play, Plus, Radar, ScrollText, Settings, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PlaybackTimeline } from '@winterop-com/sokkel-ui/PlaybackTimeline'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TaskCard, type TaskAction, type TaskState } from '@winterop-com/sokkel-ui/TaskCard'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { TrackCard } from '@winterop-com/sokkel-ui/TrackCard'
import { TrackGlyph } from '@winterop-com/sokkel-ui/TrackGlyph'
import { TrackRoster, type TrackAffiliation, type TrackKind } from '@winterop-com/sokkel-ui/TrackRoster'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { CoverageLayer } from '@winterop-com/sokkel-ui-maps/CoverageLayer'
import { formatBearing, formatCoordinates, parseCoordinates } from '@winterop-com/sokkel-ui-maps/geodesy'
import type { LngLat } from '@winterop-com/sokkel-ui-maps/geometry'
import { LinkLayer } from '@winterop-com/sokkel-ui-maps/LinkLayer'
import { MapCompass } from '@winterop-com/sokkel-ui-maps/MapCompass'
import { MapCoordinates } from '@winterop-com/sokkel-ui-maps/MapCoordinates'
import { MapGoTo } from '@winterop-com/sokkel-ui-maps/MapGoTo'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapRuler } from '@winterop-com/sokkel-ui-maps/MapRuler'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { MAP_TONE_COLORS } from '@winterop-com/sokkel-ui-maps/tone'
import { TrackLayer, trackCounts, trackLegendEntries } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { ZoneLayer, type Zone } from '@winterop-com/sokkel-ui-maps/ZoneLayer'
import { parseMgrs, toMgrs } from '@winterop-com/sokkel-ui-tracking/geo'
import { TidevannMark } from '../fixtures/TidevannMark'
import { WATCH_ACTIVITY, WATCH_NOW, WATCH_TASKS, watchRoster, type WatchTask } from '../fixtures/watch'
import { HARBOR_RINGS, objectiveLinks, RADAR_CONES, WATCH_CAMERA, watchAt, ZONES } from '../map/tracks'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

type Place = 'watch' | 'tasks' | 'zones' | 'log'

const groups = (place: Place, open: number): RailGroup[] => [
    {
        id: 'watch',
        entries: [
            { id: 'watch', label: 'Watch', icon: Radar, href: '#', description: 'The tracks on the map' },
            { id: 'tasks', label: 'Tasks', icon: ListChecks, href: '#', description: 'Investigate, follow, report', count: open },
            { id: 'zones', label: 'Zones', icon: Hexagon, href: '#', description: 'The areas the watch keeps' },
            { id: 'log', label: 'Log', icon: ScrollText, href: '#', description: 'What happened, and who did what' },
        ].map((entry) => ({ ...entry, active: entry.id === place })),
    },
    { id: 'system', entries: [{ id: 'settings', label: 'Settings', icon: Settings, href: '#', description: 'Units, feed, look' }] },
]

const LABELS: Record<Place, string> = { watch: 'Watch', tasks: 'Tasks', zones: 'Zones', log: 'Log' }

/** A position read as latitude, longitude or as an MGRS reference. */
const readPosition = (text: string): LngLat | null => parseCoordinates(text) ?? parseMgrs(text, { center: true }) ?? null

/** The harbor watch's frame: the rail, the trail, the feed's state at the foot, and the page. */
function Frame({
    place,
    open,
    panel,
    bottom,
    children,
}: {
    place: Place
    open: number
    panel?: ReactNode
    bottom?: ReactNode
    children: ReactNode
}) {
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Harbor watch"
                        groups={groups(place, open)}
                        foot={<AccountMenu name="ada" where="tidevann.example.org" />}
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'Harbor watch', href: '#' }, { label: LABELS[place] }]}
                        actions={
                            <Button variant="ghost" size="sm" aria-label="Pause the feed">
                                <Pause aria-hidden />
                                Live
                            </Button>
                        }
                    />
                }
                panel={panel}
                bottom={bottom}
                foot={
                    <StatusLine live tone="live" note="Live 14:30:00 UTC">
                        <StatusItem label="tracks">{watchAt(0).length}</StatusItem>
                        <StatusItem label="hostile">1</StatusItem>
                        <StatusItem label="open tasks">{open}</StatusItem>
                    </StatusLine>
                }
            >
                {place === 'watch' ? children : <Page className={place === 'tasks' ? undefined : 'h-full'}>{children}</Page>}
            </Shell>
        </TooltipProvider>
    )
}

const glyphOf = (id: string, affiliations: Readonly<Record<string, TrackAffiliation>> = {}) => {
    const track = watchRoster(WATCH_NOW, affiliations).find((each) => each.id === id)
    return track === undefined
        ? { name: id }
        : { name: track.name, glyph: <TrackGlyph kind={track.kind} affiliation={track.affiliation} heading={track.heading} /> }
}

const isOpen = (state: TaskState) => state === 'pending' || state === 'executing' || state === 'paused'

/** A task's actions as its state allows, moving it through the states held by the story. */
function actionsOf(task: WatchTask, state: TaskState, setState: (state: TaskState) => void): TaskAction[] {
    const cancel: TaskAction = {
        label: 'Cancel',
        icon: <X />,
        destructive: true,
        confirm: { question: `Cancel ${task.title} ${task.id}?`, detail: 'The task stops and is marked failed.' },
        onSelect: () => setState('failed'),
    }
    const edit: TaskAction = { label: 'Edit', icon: <Pencil />, onSelect: () => undefined }
    if (state === 'pending') return [{ label: 'Start', icon: <Play />, primary: true, onSelect: () => setState('executing') }, edit, cancel]
    if (state === 'executing')
        return [
            { label: 'Complete', icon: <Check />, primary: true, onSelect: () => setState('done') },
            { label: 'Pause', icon: <Pause />, onSelect: () => setState('paused') },
            edit,
            cancel,
        ]
    if (state === 'paused') return [{ label: 'Resume', icon: <Play />, primary: true, onSelect: () => setState('executing') }, edit, cancel]
    return [{ label: 'Reopen', icon: <Play />, onSelect: () => setState('pending') }]
}

function Tasks({
    tasks,
    states,
    setState,
}: {
    tasks: readonly WatchTask[]
    states: Record<string, TaskState>
    setState: (id: string, state: TaskState) => void
}) {
    return tasks.map((task) => {
        const state = states[task.id] ?? task.state
        return (
            <TaskCard
                key={task.id}
                title={task.title}
                code={task.id}
                state={state}
                startedAt={task.started === undefined ? undefined : WATCH_NOW - task.started * MINUTE}
                endedAt={task.started === undefined || task.ran === undefined ? undefined : WATCH_NOW - (task.started - task.ran) * MINUTE}
                now={WATCH_NOW}
                from={glyphOf(task.from)}
                to={glyphOf(task.to)}
                facts={[
                    { term: 'Priority', value: task.priority },
                    { term: 'Set by', value: task.by },
                ]}
                actions={actionsOf(task, state, (next) => setState(task.id, next))}
            />
        )
    })
}

function useTaskStates() {
    const [states, setStates] = useState<Record<string, TaskState>>({})
    const setState = (id: string, state: TaskState) => setStates((was) => ({ ...was, [id]: state }))
    const open = WATCH_TASKS.filter((task) => isOpen(states[task.id] ?? task.state)).length
    return { states, setState, open }
}

function WatchPage() {
    const tracks = useMemo(() => watchAt(0), [])
    const [judged, setJudged] = useState<Record<string, TrackAffiliation>>({})
    const [selected, setSelected] = useState<string | null>('contact-14')
    const [mgrs, setMgrs] = useState(true)
    const { states, setState, open } = useTaskStates()
    const shown = tracks.map((track) => ({ ...track, affiliation: judged[track.id] ?? track.affiliation }))
    const roster = watchRoster(WATCH_NOW, judged)
    const picked = roster.find((track) => track.id === selected)
    const pickedTrack = shown.find((track) => track.id === selected)
    const links = useMemo(() => objectiveLinks(shown, [['patrol-7', 'contact-14']]), [shown])
    const judge = (id: string, affiliation: TrackAffiliation) => setJudged((was) => ({ ...was, [id]: affiliation }))
    const writePosition = (position: LngLat) => (mgrs ? (toMgrs(position) ?? formatCoordinates(position)) : formatCoordinates(position))
    const about = WATCH_TASKS.filter((task) => task.from === selected || task.to === selected)
    const panel = (
        <SidePanel
            tabs={[
                {
                    id: 'track',
                    label: 'Track',
                    icon: Radar,
                    content: (
                        <>
                            <PanelSection
                                title="Track"
                                actions={
                                    <Segmented
                                        size="sm"
                                        label="Positions"
                                        value={mgrs ? 'mgrs' : 'latlon'}
                                        onValueChange={(next) => setMgrs(next === 'mgrs')}
                                        options={[
                                            { value: 'latlon', label: 'Lat, lon' },
                                            { value: 'mgrs', label: 'MGRS' },
                                        ]}
                                    />
                                }
                            >
                                {picked !== undefined && pickedTrack !== undefined && (
                                    <Stack gap="md">
                                        <TrackCard
                                            name={picked.name}
                                            code={picked.id}
                                            kind={picked.kind}
                                            affiliation={picked.affiliation}
                                            heading={picked.heading}
                                            states={picked.states}
                                            detail={picked.detail}
                                            updatedAt={picked.updatedAt}
                                            now={WATCH_NOW}
                                            onAffiliationChange={(affiliation) => judge(picked.id, affiliation)}
                                        />
                                        <DescriptionList
                                            size="sm"
                                            items={[
                                                { term: 'Position', value: writePosition(pickedTrack.position), code: true },
                                                {
                                                    term: 'Heading',
                                                    value:
                                                        pickedTrack.heading === undefined ? undefined : formatBearing(pickedTrack.heading),
                                                    numeric: true,
                                                },
                                                { term: 'Source', value: picked.kind === 'aircraft' ? 'ADS-B' : 'AIS' },
                                            ]}
                                        />
                                    </Stack>
                                )}
                            </PanelSection>
                            {about.length > 0 && (
                                <PanelSection title="Tasks">
                                    <Tasks tasks={about} states={states} setState={setState} />
                                </PanelSection>
                            )}
                        </>
                    ),
                },
            ]}
        />
    )
    return (
        <Frame
            place="watch"
            open={open}
            panel={panel}
            bottom={
                <PlaybackTimeline
                    label="Harbor watch"
                    from={WATCH_NOW - 6 * HOUR}
                    to={WATCH_NOW}
                    value={null}
                    onValueChange={() => undefined}
                    activity={WATCH_ACTIVITY}
                    timeZone="UTC"
                />
            }
        >
            <SplitPane
                className="h-full"
                defaultShare={0.3}
                minShare={0.2}
                maxShare={0.5}
                narrow="second"
                first={
                    <TrackRoster
                        framed={false}
                        className="h-full"
                        tracks={roster}
                        now={WATCH_NOW}
                        selected={selected}
                        onSelect={setSelected}
                        onAffiliationChange={judge}
                    />
                }
                second={
                    <MapView
                        label="Harbor watch"
                        defaultBasemap={WORLD_BASEMAP}
                        basemaps={[WORLD_BASEMAP]}
                        camera={WATCH_CAMERA}
                        selected={selected}
                        onSelectedChange={(id) => setSelected(id)}
                        rotate
                        className="h-full"
                    >
                        <ZoneLayer id="zones" zones={ZONES} />
                        <CoverageLayer id="cover" cones={RADAR_CONES} rings={[HARBOR_RINGS]} />
                        <LinkLayer id="links" links={links} />
                        <TrackLayer id="tracks" tracks={shown} />
                        <MapRuler unit="nmi" />
                        <MapCompass />
                        <MapGoTo
                            parse={readPosition}
                            words={{
                                placeholder: 'Lat, lon or MGRS',
                                invalid: 'Write a position as latitude, longitude or an MGRS reference.',
                            }}
                        />
                        <MapCoordinates unit="nmi" formatPosition={writePosition} />
                        <MapOverlay corner="bottom-right">
                            <MapLegend
                                title="Affiliation"
                                entries={trackLegendEntries()}
                                counts={trackCounts(shown)}
                                shape="point"
                                className="w-40"
                            />
                        </MapOverlay>
                    </MapView>
                }
            />
        </Frame>
    )
}

function TasksPage() {
    const { states, setState, open } = useTaskStates()
    const [shown, setShown] = useState<'open' | 'closed' | 'all'>('open')
    const listed = WATCH_TASKS.filter((task) => shown === 'all' || (shown === 'open') === isOpen(states[task.id] ?? task.state))
    return (
        <Frame place="tasks" open={open}>
            <Stack gap="section">
                <PageHeader
                    title="Tasks"
                    count={`${String(open)} open`}
                    actions={
                        <Button>
                            <Plus aria-hidden />
                            New
                        </Button>
                    }
                />
                <Toolbar>
                    <Segmented
                        label="Tasks shown"
                        value={shown}
                        onValueChange={setShown}
                        options={[
                            { value: 'open', label: 'Open', count: open },
                            { value: 'closed', label: 'Closed', count: WATCH_TASKS.length - open },
                            { value: 'all', label: 'All', count: WATCH_TASKS.length },
                        ]}
                    />
                </Toolbar>
                <Columns count={3} min="md" gap="lg" align="start">
                    <Tasks tasks={listed} states={states} setState={setState} />
                </Columns>
            </Stack>
        </Frame>
    )
}

const TONE_WORDS: Record<string, string> = {
    hostile: 'Hostile',
    friend: 'Friend',
    neutral: 'Neutral',
    unknown: 'Unknown',
    pending: 'Pending',
    plain: 'Plain',
}

const FILL_WORDS: Record<string, string> = { solid: 'Wash', hatched: 'Lines', none: 'Edge only' }

function ZonesPage() {
    const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set(['boarding']))
    const [selected, setSelected] = useState<string | null>('closed-area')
    const tracks = useMemo(() => watchAt(0, false), [])
    const toggle = (id: string) =>
        setHidden((was) => {
            const next = new Set(was)
            if (!next.delete(id)) next.add(id)
            return next
        })
    const columns: DataColumn<Zone>[] = [
        {
            id: 'name',
            header: 'Zone',
            width: 'minmax(9rem,1.2fr)',
            cell: (zone) => (
                <Row as="span" gap="sm">
                    <Dot color={MAP_TONE_COLORS[zone.tone ?? 'plain']} />
                    {zone.label}
                </Row>
            ),
            sortValue: (zone) => zone.label ?? zone.id,
        },
        { id: 'tone', header: 'Tone', width: '5.5rem', cell: (zone) => TONE_WORDS[zone.tone ?? 'plain'], stack: 'secondary' },
        {
            id: 'drawn',
            header: 'Drawn',
            width: 'minmax(7rem,1fr)',
            cell: (zone) => `${FILL_WORDS[zone.fill ?? 'solid']}, ${zone.edge ?? 'solid'}`,
            stack: 'secondary',
        },
        {
            id: 'shown',
            header: 'Shown',
            width: '5rem',
            cell: (zone) => (
                <Switch
                    aria-label={`Show ${zone.label ?? zone.id}`}
                    checked={!hidden.has(zone.id)}
                    onCheckedChange={() => toggle(zone.id)}
                />
            ),
        },
    ]
    return (
        <Frame place="zones" open={3}>
            <Stack gap="section" className="h-full">
                <PageHeader title="Zones" count={`${String(ZONES.length - hidden.size)} of ${String(ZONES.length)} shown`} />
                <SplitPane
                    className="min-h-0 flex-1"
                    defaultShare={0.55}
                    minShare={0.35}
                    maxShare={0.7}
                    first={
                        <DataTable
                            className="h-full"
                            columns={columns}
                            rows={ZONES}
                            rowKey={(zone) => zone.id}
                            onOpen={(zone) => setSelected(zone.id)}
                            opened={(zone) => zone.id === selected}
                            rowActions={(zone) => [
                                { id: 'edit', label: 'Edit', icon: <Pencil />, inline: true, onSelect: () => undefined },
                                {
                                    id: 'shown',
                                    label: hidden.has(zone.id) ? 'Show' : 'Hide',
                                    icon: hidden.has(zone.id) ? <Eye /> : <EyeOff />,
                                    onSelect: () => toggle(zone.id),
                                },
                            ]}
                        />
                    }
                    second={
                        <MapView
                            label="Zones"
                            defaultBasemap={WORLD_BASEMAP}
                            basemaps={[WORLD_BASEMAP]}
                            camera={WATCH_CAMERA}
                            selected={selected}
                            onSelectedChange={(id) => setSelected(id)}
                            className="h-full"
                        >
                            <ZoneLayer id="zones" zones={ZONES.filter((zone) => !hidden.has(zone.id))} />
                            <TrackLayer id="tracks" tracks={tracks} labels={false} />
                        </MapView>
                    }
                />
            </Stack>
        </Frame>
    )
}

/** One line of the watch's log. */
interface Line {
    id: string
    /** Minutes before the watch's now. */
    ago: number
    event: string
    track: string
    kind: TrackKind
    affiliation: TrackAffiliation
    detail: string
    by: string
}

const LOG: Line[] = [
    {
        id: 'l1',
        ago: 2,
        event: 'Affiliation',
        track: 'Contact 14',
        kind: 'vessel',
        affiliation: 'hostile',
        detail: 'Unknown to Hostile, set by hand',
        by: 'ada',
    },
    {
        id: 'l2',
        ago: 6,
        event: 'New contact',
        track: 'New 33',
        kind: 'vessel',
        affiliation: 'pending',
        detail: 'First heard, by AIS',
        by: 'feed',
    },
    {
        id: 'l3',
        ago: 9,
        event: 'Lost',
        track: 'Contact 9',
        kind: 'vessel',
        affiliation: 'unknown',
        detail: 'Silent for five minutes',
        by: 'feed',
    },
    {
        id: 'l4',
        ago: 13,
        event: 'Stale',
        track: 'Contact 9',
        kind: 'vessel',
        affiliation: 'unknown',
        detail: 'Silent for a minute',
        by: 'feed',
    },
    {
        id: 'l5',
        ago: 18,
        event: 'Task',
        track: 'Contact 14',
        kind: 'vessel',
        affiliation: 'hostile',
        detail: 'Started follow task-41, by Patrol 7',
        by: 'ada',
    },
    {
        id: 'l6',
        ago: 24,
        event: 'Affiliation',
        track: 'Track 21',
        kind: 'aircraft',
        affiliation: 'unknown',
        detail: 'Pending to Unknown',
        by: 'feed',
    },
    {
        id: 'l7',
        ago: 31,
        event: 'Named',
        track: 'Ferry Juniper',
        kind: 'vessel',
        affiliation: 'neutral',
        detail: 'Sent its name, MMSI 257200410',
        by: 'feed',
    },
    {
        id: 'l8',
        ago: 42,
        event: 'Task',
        track: 'New 33',
        kind: 'vessel',
        affiliation: 'pending',
        detail: 'Started report task-39, by Harbor radar',
        by: 'linus',
    },
    {
        id: 'l9',
        ago: 61,
        event: 'Task',
        track: 'Contact 9',
        kind: 'vessel',
        affiliation: 'unknown',
        detail: 'Completed investigate task-36, by Pilot 2',
        by: 'margaret',
    },
    {
        id: 'l10',
        ago: 74,
        event: 'Left the area',
        track: 'Flight 208',
        kind: 'aircraft',
        affiliation: 'neutral',
        detail: 'Out of the watch area',
        by: 'feed',
    },
]

const STAMP = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
})

const LOG_COLUMNS: DataColumn<Line>[] = [
    {
        id: 'at',
        header: 'Time (UTC)',
        width: '9rem',
        cell: (line) => STAMP.format(WATCH_NOW - line.ago * MINUTE),
        sortValue: (line) => -line.ago,
    },
    { id: 'event', header: 'Event', width: '8.5rem', cell: (line) => line.event, sortValue: (line) => line.event },
    {
        id: 'track',
        header: 'Track',
        width: 'minmax(9rem,1fr)',
        cell: (line) => (
            <Row as="span" gap="sm">
                <TrackGlyph kind={line.kind} affiliation={line.affiliation} />
                {line.track}
            </Row>
        ),
        sortValue: (line) => line.track,
    },
    { id: 'detail', header: 'Detail', width: 'minmax(12rem,1.6fr)', cell: (line) => line.detail, stack: 'secondary' },
    { id: 'by', header: 'By', width: '7rem', cell: (line) => line.by, stack: 'secondary' },
]

function LogPage() {
    return (
        <Frame place="log" open={3}>
            <Stack gap="section" className="h-full">
                <PageHeader title="Log" count="the last 6 hours" />
                <DataTable className="min-h-0 flex-1" columns={LOG_COLUMNS} rows={LOG} rowKey={(line) => line.id} />
            </Stack>
        </Frame>
    )
}

const meta: Meta = { title: 'Apps/Harbor watch', parameters: { layout: 'fullscreen' }, globals: { theme: 'dark' } }
export default meta

/**
 * The watch: the roster of tracks beside the map, sharing the picked contact, with the areas, the
 * radars' cover and rings, the line from the patrol to the contact it follows, and the ruler,
 * compass, go to (latitude, longitude or MGRS) and the cursor's position as an MGRS reference.
 * The side panel holds the picked track's card, facts and tasks; the playback timeline is at the foot.
 */
export const Watch: StoryObj = { name: 'Watch', render: () => <WatchPage /> }
/** The tasks as cards, open ones first: start, pause, resume, complete, cancel (asked first) and reopen move them through their states. */
export const TasksStory: StoryObj = { name: 'Tasks', render: () => <TasksPage /> }
/** The watch's zones in a table beside a map of them, each shown or hidden by its switch or its menu, the picked one ringed on the map. */
export const Zones: StoryObj = { name: 'Zones', render: () => <ZonesPage /> }
/** The log of what the feed saw and what people on watch did, the newest first. */
export const Log: StoryObj = { name: 'Log', render: () => <LogPage /> }
