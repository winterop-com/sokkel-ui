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
import {
    TrackRoster,
    type TrackAffiliation,
    type TrackKind,
    type TrackRosterItem,
    type TrackState,
} from '@winterop-com/sokkel-ui/TrackRoster'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { DARK_BASEMAP } from '@winterop-com/sokkel-ui-maps/basemap'
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
import { TrackLayer, trackCounts, trackLegendEntries, type Track } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { ZoneLayer, type Zone } from '@winterop-com/sokkel-ui-maps/ZoneLayer'
import { parseMgrs, toMgrs } from '@winterop-com/sokkel-ui-tracking/geo'
import {
    COAST_EPOCH,
    coastActivity,
    coastEvents,
    simulateCoast,
    type CoastEvent,
    type CoastJudgment,
} from '@winterop-com/sokkel-ui-tracking/simulate'
import { KNOT, type Track as Contact } from '@winterop-com/sokkel-ui-tracking/track'
import { clockTime, useSimClock, type StoryClock } from '../fixtures/simulation'
import { TidevannMark } from '../fixtures/TidevannMark'
import { motionOf, type WatchTask } from '../fixtures/watch'
import { HARBOR_RINGS, objectiveLinks, RADAR_CONES, WATCH_CAMERA, ZONES } from '../map/tracks'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** The seed the watch's waters are drawn from: the same seed, the same contacts. */
const SEED = 1

/** How fast the watch's clock plays: a simulated minute each second. */
const SPEED = 60

/** The moment the watch opens at, an evening in November, the same every time. */
const START = COAST_EPOCH

/** How far back the timeline and the log reach. */
const BACK = 6 * HOUR

/** The watch's own and the regular traffic, by the ids their feeds give them: always in the picture. */
const PILOT = '257100020'
const PATROL = '257100070'
const TUG = '257100031'
const FERRY = '257200410'
const CARGO = '257300512'
const SURVEY = '47a1c3'
const FLIGHT = '4b8e12'
const RADAR = 'radar-harbor'

/** The watch's tasks, between the tracks that are always there, each started some minutes before the watch opens. */
const TASKS: readonly WatchTask[] = [
    { id: 'task-41', title: 'Follow', state: 'executing', from: PATROL, to: FERRY, started: 18, priority: 'High', by: 'ada' },
    { id: 'task-42', title: 'Investigate', state: 'pending', from: SURVEY, to: FLIGHT, priority: 'Normal', by: 'grace' },
    { id: 'task-39', title: 'Report', state: 'paused', from: RADAR, to: CARGO, started: 42, priority: 'Normal', by: 'linus' },
    { id: 'task-36', title: 'Investigate', state: 'done', from: PILOT, to: FERRY, started: 95, ran: 34, priority: 'Low', by: 'margaret' },
    { id: 'task-35', title: 'Follow', state: 'failed', from: TUG, to: CARGO, started: 130, ran: 12, priority: 'Normal', by: 'ada' },
]

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

/** The watch as its pages read it: the simulated clock, the moment shown, and the picture read from the feeds at it. */
interface Watch extends StoryClock {
    /** The moment played back to, or null while the watch is live. */
    shownAt: number | null
    setShownAt: (at: number | null) => void
    /** The moment the picture is of: the one played back to, or the clock's. */
    at: number
    /** The vessels, aircraft and radars heard at the moment, as the tracking add-on's readers give them. */
    contacts: readonly Contact[]
    /** Sets a track's affiliation by hand, from the moment shown on. */
    judge: (id: string, affiliation: TrackAffiliation) => void
}

/**
 * The harbor watch, live: the tracking add-on's simulated coast read at the story's clock, its
 * vessels decoded from AIS sentences and its aircraft read from a readsb-shaped answer. The clock
 * starts at the same moment every time, so the first frame is the same picture, and plays on from it;
 * a moment played back is read the same way, so it is what it was live.
 */
function useWatch(): Watch {
    const clock = useSimClock(START, SPEED)
    const [judgments, setJudgments] = useState<readonly CoastJudgment[]>([])
    const [shownAt, setShownAt] = useState<number | null>(null)
    const at = shownAt ?? clock.now
    const contacts = useMemo(() => simulateCoast(SEED, at, judgments).tracks, [at, judgments])
    const judge = (id: string, affiliation: TrackAffiliation) => setJudgments((was) => [...was, { track: id, affiliation, at }])
    return { ...clock, shownAt, setShownAt, at, contacts, judge }
}

/** A track a task is on. */
const TASKED: TrackState = { label: 'Tasked', tone: 'info' }

const isOpen = (state: TaskState) => state === 'pending' || state === 'executing' || state === 'paused'

/** A contact as the roster lists it: its name, its MMSI or address after it, how it moves and when it was last heard. */
function rosterItem(contact: Contact, tasked: ReadonlySet<string>): TrackRosterItem {
    const label = contact.label ?? contact.id
    return {
        id: contact.id,
        name: label,
        code: label === contact.id || contact.kind === 'sensor' ? undefined : contact.id,
        kind: contact.kind,
        affiliation: contact.affiliation,
        heading: contact.heading,
        states: tasked.has(contact.id) ? [TASKED] : undefined,
        detail: motionOf(contact.speed === undefined ? undefined : contact.speed / KNOT, contact.heading),
        updatedAt: contact.updatedAt ?? null,
    }
}

/** A contact as the map layer draws it. */
const mapTrack = (contact: Contact, trails = true): Track => ({
    id: contact.id,
    position: [contact.lon, contact.lat],
    heading: contact.heading,
    affiliation: contact.affiliation,
    kind: contact.kind,
    label: contact.label,
    trail: trails ? contact.trail : undefined,
})

/** The harbor watch's frame: the rail, the trail, the feed's state at the foot, and the page. */
function Frame({
    watch,
    place,
    open,
    panel,
    bottom,
    children,
}: {
    watch: Watch
    place: Place
    open: number
    panel?: ReactNode
    bottom?: ReactNode
    children: ReactNode
}) {
    const live = watch.running && watch.shownAt === null
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
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={watch.toggle}
                                aria-label={watch.running ? 'Pause the feed' : 'Resume the feed'}
                            >
                                {watch.running ? <Pause aria-hidden /> : <Play aria-hidden />}
                                {watch.running ? 'Live' : 'Paused'}
                            </Button>
                        }
                    />
                }
                panel={panel}
                bottom={bottom}
                foot={
                    <StatusLine
                        live={live}
                        tone={live ? 'live' : 'quiet'}
                        note={`${watch.shownAt !== null ? 'Playback' : watch.running ? 'Live' : 'Paused'} ${clockTime(watch.at)}`}
                    >
                        <StatusItem label="tracks">{watch.contacts.length}</StatusItem>
                        <StatusItem label="hostile">
                            {watch.contacts.filter((contact) => contact.affiliation === 'hostile').length}
                        </StatusItem>
                        <StatusItem label="open tasks">{open}</StatusItem>
                        <StatusItem label="speed">{`${String(SPEED)}×`}</StatusItem>
                    </StatusLine>
                }
            >
                {place === 'watch' ? children : <Page className={place === 'tasks' ? undefined : 'h-full'}>{children}</Page>}
            </Shell>
        </TooltipProvider>
    )
}

/** One end of a task: the track's name and its glyph as the picture has it now. */
const glyphOf = (id: string, roster: readonly TrackRosterItem[]) => {
    const track = roster.find((each) => each.id === id)
    return track === undefined
        ? { name: id }
        : { name: track.name, glyph: <TrackGlyph kind={track.kind} affiliation={track.affiliation} heading={track.heading} /> }
}

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
    roster,
    now,
}: {
    tasks: readonly WatchTask[]
    states: Record<string, TaskState>
    setState: (id: string, state: TaskState) => void
    roster: readonly TrackRosterItem[]
    now: number
}) {
    return tasks.map((task) => {
        const state = states[task.id] ?? task.state
        return (
            <TaskCard
                key={task.id}
                title={task.title}
                code={task.id}
                state={state}
                startedAt={task.started === undefined ? undefined : START - task.started * MINUTE}
                endedAt={task.started === undefined || task.ran === undefined ? undefined : START - (task.started - task.ran) * MINUTE}
                now={now}
                from={glyphOf(task.from, roster)}
                to={glyphOf(task.to, roster)}
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
    const stateOf = (task: WatchTask) => states[task.id] ?? task.state
    const open = TASKS.filter((task) => isOpen(stateOf(task))).length
    return { states, setState, stateOf, open }
}

/** The ids of the tracks an open task is about or done by. */
const taskedIds = (stateOf: (task: WatchTask) => TaskState) =>
    new Set(TASKS.filter((task) => isOpen(stateOf(task))).flatMap((task) => [task.from, task.to]))

const SOURCES: Record<string, string> = { ais: 'AIS', adsb: 'ADS-B', radar: 'Radar' }

function WatchPage() {
    const watch = useWatch()
    const { at, contacts } = watch
    const [selected, setSelected] = useState<string | null>(FERRY)
    const [mgrs, setMgrs] = useState(true)
    const { states, setState, stateOf, open } = useTaskStates()
    const shown = useMemo(() => contacts.map((contact) => mapTrack(contact)), [contacts])
    const tasked = taskedIds(stateOf)
    const roster = contacts.map((contact) => rosterItem(contact, tasked))
    const picked = roster.find((track) => track.id === selected)
    const pickedContact = contacts.find((contact) => contact.id === selected)
    // A line from each running task's unit to its target.
    const pairs = TASKS.filter((task) => stateOf(task) === 'executing').map((task): [string, string] => [task.from, task.to])
    const links = objectiveLinks(shown, pairs)
    const writePosition = (position: LngLat) => (mgrs ? (toMgrs(position) ?? formatCoordinates(position)) : formatCoordinates(position))
    const about = TASKS.filter((task) => task.from === selected || task.to === selected)
    // The strip is counted again each ten minutes of the clock, not each tick.
    const stretch = Math.floor(watch.now / (10 * MINUTE)) * 10 * MINUTE
    const activity = useMemo(() => coastActivity(SEED, stretch - BACK, stretch, 36), [stretch])
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
                                {picked === undefined || pickedContact === undefined ? (
                                    <Empty>
                                        <EmptyHeader>
                                            <EmptyTitle>No track picked</EmptyTitle>
                                            <EmptyDescription>Pick one in the list or on the map.</EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                ) : (
                                    <Stack gap="md">
                                        <TrackCard
                                            name={picked.name}
                                            code={picked.code}
                                            kind={picked.kind}
                                            affiliation={picked.affiliation}
                                            heading={picked.heading}
                                            states={picked.states}
                                            detail={picked.detail}
                                            updatedAt={picked.updatedAt}
                                            now={at}
                                            onAffiliationChange={(affiliation) => watch.judge(picked.id, affiliation)}
                                        />
                                        <DescriptionList
                                            size="sm"
                                            items={[
                                                {
                                                    term: 'Position',
                                                    value: writePosition([pickedContact.lon, pickedContact.lat]),
                                                    code: true,
                                                },
                                                {
                                                    term: 'Heading',
                                                    value:
                                                        pickedContact.heading === undefined
                                                            ? undefined
                                                            : formatBearing(pickedContact.heading),
                                                    numeric: true,
                                                },
                                                { term: 'Source', value: SOURCES[pickedContact.source ?? ''] ?? pickedContact.source },
                                            ]}
                                        />
                                    </Stack>
                                )}
                            </PanelSection>
                            {about.length > 0 && (
                                <PanelSection title="Tasks">
                                    <Tasks tasks={about} states={states} setState={setState} roster={roster} now={watch.now} />
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
            watch={watch}
            place="watch"
            open={open}
            panel={panel}
            bottom={
                <PlaybackTimeline
                    label="Harbor watch"
                    from={watch.now - BACK}
                    to={watch.now}
                    value={watch.shownAt === null ? null : Math.max(watch.now - BACK, watch.shownAt)}
                    onValueChange={watch.setShownAt}
                    activity={activity}
                    rate={SPEED * 4}
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
                        now={at}
                        selected={selected}
                        onSelect={setSelected}
                        onAffiliationChange={watch.judge}
                    />
                }
                second={
                    <MapView
                        label="Harbor watch"
                        defaultBasemap={DARK_BASEMAP}
                        basemaps={[DARK_BASEMAP]}
                        fallbackBasemap={WORLD_BASEMAP}
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
    const watch = useWatch()
    const { states, setState, stateOf, open } = useTaskStates()
    const [shown, setShown] = useState<'open' | 'closed' | 'all'>('open')
    const listed = TASKS.filter((task) => shown === 'all' || (shown === 'open') === isOpen(stateOf(task)))
    const tasked = taskedIds(stateOf)
    const roster = watch.contacts.map((contact) => rosterItem(contact, tasked))
    return (
        <Frame watch={watch} place="tasks" open={open}>
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
                            { value: 'closed', label: 'Closed', count: TASKS.length - open },
                            { value: 'all', label: 'All', count: TASKS.length },
                        ]}
                    />
                </Toolbar>
                <Columns count={3} min="md" gap="lg" align="start">
                    <Tasks tasks={listed} states={states} setState={setState} roster={roster} now={watch.now} />
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
    const watch = useWatch()
    const { open } = useTaskStates()
    const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set(['boarding']))
    const [selected, setSelected] = useState<string | null>('closed-area')
    const tracks = useMemo(() => watch.contacts.map((contact) => mapTrack(contact, false)), [watch.contacts])
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
        <Frame watch={watch} place="zones" open={open}>
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
                            defaultBasemap={DARK_BASEMAP}
                            basemaps={[DARK_BASEMAP]}
                            fallbackBasemap={WORLD_BASEMAP}
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
    at: number
    event: string
    track: string
    kind: TrackKind
    affiliation: TrackAffiliation
    detail: string
    by: string
}

/** What people on watch did in the hours before it opened. */
const BY_HAND: readonly Line[] = [
    {
        id: 'task-41-started',
        at: START - 18 * MINUTE,
        event: 'Task',
        track: 'FERRY JUNIPER',
        kind: 'vessel',
        affiliation: 'neutral',
        detail: 'Started follow task-41, by PATROL 7',
        by: 'ada',
    },
    {
        id: 'task-39-started',
        at: START - 42 * MINUTE,
        event: 'Task',
        track: 'CARGO LARKSPUR',
        kind: 'vessel',
        affiliation: 'neutral',
        detail: 'Started report task-39, by Harbor radar',
        by: 'linus',
    },
    {
        id: 'task-36-done',
        at: START - 61 * MINUTE,
        event: 'Task',
        track: 'FERRY JUNIPER',
        kind: 'vessel',
        affiliation: 'neutral',
        detail: 'Completed investigate task-36, by PILOT 2',
        by: 'margaret',
    },
]

const SAID: Record<CoastEvent['kind'], string> = {
    appeared: 'New contact',
    named: 'Named',
    affiliation: 'Affiliation',
    stale: 'Stale',
    lost: 'Lost',
    left: 'Left the area',
}

/** What the log says of one thing the feed saw. */
function detailOf(event: CoastEvent): string {
    if (event.kind === 'affiliation') return `${TONE_WORDS[event.was ?? 'pending']} to ${TONE_WORDS[event.affiliation]}`
    if (event.kind === 'appeared') return `First heard, ${event.trackKind === 'aircraft' ? 'by ADS-B' : 'by AIS'}`
    if (event.kind === 'named') return `Sent its name, MMSI ${event.track}`
    if (event.kind === 'stale') return 'Silent for a minute'
    return event.kind === 'lost' ? 'Silent for five minutes' : 'Out of the watch area'
}

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
        cell: (line) => STAMP.format(line.at),
        sortValue: (line) => line.at,
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
    const watch = useWatch()
    const { open } = useTaskStates()
    // The feed's events are found again each minute of the clock, not each tick.
    const minute = Math.floor(watch.now / MINUTE) * MINUTE
    const lines = useMemo((): Line[] => {
        const seen = coastEvents(SEED, minute - BACK, minute).map((event): Line => ({
            id: event.id,
            at: event.at,
            event: SAID[event.kind],
            track: event.name,
            kind: event.trackKind,
            affiliation: event.affiliation,
            detail: detailOf(event),
            by: 'feed',
        }))
        return [...seen, ...BY_HAND.filter((line) => line.at >= minute - BACK)].sort((a, b) => b.at - a.at)
    }, [minute])
    return (
        <Frame watch={watch} place="log" open={open}>
            <Stack gap="section" className="h-full">
                <PageHeader title="Log" count="the last 6 hours" />
                <DataTable className="min-h-0 flex-1" columns={LOG_COLUMNS} rows={lines} rowKey={(line) => line.id} />
            </Stack>
        </Frame>
    )
}

const meta: Meta = { title: 'Apps/Harbor watch', parameters: { layout: 'fullscreen' }, globals: { theme: 'dark' } }
export default meta

/**
 * The watch, live: the tracking package's simulated coast, its vessels decoded from AIS sentences
 * and its aircraft read from a readsb-shaped answer, played from the same evening every time at a
 * simulated minute a second, so the tracks move and their trails grow, and contacts come, are
 * classified, fall silent and go. The roster of tracks stands beside the map, sharing the picked
 * contact, with the areas, the radars' cover and rings, the line from the patrol to the ferry it
 * follows, and the ruler, compass, go to (latitude, longitude or MGRS) and the cursor's position as
 * an MGRS reference. The side panel holds the picked track's card, facts and tasks; the playback
 * timeline at the foot looks back over six hours, and Live in the top bar holds the clock.
 */
export const Watch: StoryObj = { name: 'Watch', render: () => <WatchPage /> }
/**
 * The tasks as cards, open ones first, their elapsed times running with the watch's clock: start,
 * pause, resume, complete, cancel (asked first) and reopen move them through their states.
 */
export const TasksStory: StoryObj = { name: 'Tasks', render: () => <TasksPage /> }
/**
 * The watch's zones in a table beside a map of them with the tracks moving through, each zone shown
 * or hidden by its switch or its menu, the picked one ringed on the map.
 */
export const Zones: StoryObj = { name: 'Zones', render: () => <ZonesPage /> }
/** The log of what the feed saw and what people on watch did, the newest first, a line added as each thing happens. */
export const Log: StoryObj = { name: 'Log', render: () => <LogPage /> }
