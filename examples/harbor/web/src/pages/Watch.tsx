import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PlaybackTimeline } from '@winterop-com/sokkel-ui/PlaybackTimeline'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { TrackCard } from '@winterop-com/sokkel-ui/TrackCard'
import { TrackRoster } from '@winterop-com/sokkel-ui/TrackRoster'
import { createStore, useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { bearing, distance, formatBearing } from '@winterop-com/sokkel-ui-maps/geodesy'
import type { MapLink } from '@winterop-com/sokkel-ui-maps/LinkLayer'
import type { Track } from '@winterop-com/sokkel-ui-tracking/track'
import { ListChecks, LocateFixed, LocateOff, Plus, Radar } from 'lucide-react'
import { useMemo, useState } from 'react'

import { isOpen, type Task, type ZoneRow } from '../data'
import { flightLevel, formatPosition, formatRange, knotsOf } from '../format'
import { TaskDialog } from '../parts/TaskDialog'
import { TaskList } from '../parts/TaskList'
import { WatchMap } from '../parts/WatchMap'
import { pictureAt, type Picture } from '../sim/feed'
import { activityBetween, HARBORS, HOUR, MINUTE } from '../sim/world'
import { judge, mapTrack, picked, rosterItem, taskedIds, useWatch } from '../watch'

/** The moment played back to, or null while the watch is live. */
export const shownAt = createStore<number | null>(null)

/** The track the map keeps centered, or null. */
export const followed = createStore<string | null>(null)

/** How far back the timeline reaches. */
const BACK = 6 * HOUR

/** How many bars the timeline's activity strip draws. */
const BINS = 36

const SHIP_TYPES: Record<number, string> = {
    30: 'Fishing',
    37: 'Pleasure craft',
    50: 'Pilot',
    52: 'Tug',
    55: 'Law enforcement',
    60: 'Passenger',
    70: 'Cargo',
    80: 'Tanker',
}

const SOURCES: Record<string, string> = { ais: 'AIS', adsb: 'ADS-B', radar: 'Radar' }

/** The picture shown: played back to a moment, or the live one. */
export function useShownPicture(): Picture {
    const watch = useWatch()
    const at = useStore(shownAt)
    return useMemo(
        () => (at === null ? watch.picture : pictureAt(watch.options.seed, at, watch.judgments)),
        [at, watch.picture, watch.options.seed, watch.judgments],
    )
}

/** Whether a position lies inside a zone's outline. */
function inside([lng, lat]: readonly [number, number], ring: readonly (readonly [number, number])[]): boolean {
    let within = false
    for (let index = 0, before = ring.length - 1; index < ring.length; before = index, index += 1) {
        const [x1, y1] = ring[index]
        const [x2, y2] = ring[before]
        if (y1 > lat !== y2 > lat && lng < ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1) within = !within
    }
    return within
}

/** The zones a track is in now. */
export function zonesOf(track: Track, rows: readonly ZoneRow[]): ZoneRow[] {
    return rows.filter((zone) => inside([track.lon, track.lat], zone.area))
}

/** A line from each running task's unit to its target, in the target's tone, saying how far and which way. */
function taskLinks(rows: readonly Task[], tracks: readonly Track[]): MapLink[] {
    const byId = new Map(tracks.map((track) => [track.id, track]))
    return rows.flatMap((task): MapLink[] => {
        if (task.state !== 'executing') return []
        const [from, to] = [byId.get(task.from.track), byId.get(task.to.track)]
        if (from === undefined || to === undefined) return []
        return [
            {
                id: task.id,
                from: [from.lon, from.lat],
                to: [to.lon, to.lat],
                tone: to.affiliation,
                path: 'straight',
                dashed: true,
                measure: true,
            },
        ]
    })
}

/** The console: the roster beside the map, sharing the picked track, at the moment shown. */
export function Watch() {
    const watch = useWatch()
    const picture = useShownPicture()
    const selected = useStore(picked)
    const follow = useStore(followed)
    const tasked = useMemo(() => taskedIds(watch.tasks), [watch.tasks])
    const roster = useMemo(() => picture.tracks.map((track) => rosterItem(track, tasked)), [picture.tracks, tasked])
    const tracks = useMemo(() => picture.tracks.map((track) => mapTrack(track, watch.options)), [picture.tracks, watch.options])
    const links = useMemo(() => taskLinks(watch.tasks ?? [], picture.tracks), [watch.tasks, picture.tracks])
    const following = tracks.find((track) => track.id === follow)
    return (
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
                    now={picture.at}
                    selected={selected}
                    onSelect={(id) => picked.set(id)}
                    onAffiliationChange={(id, affiliation) => judge(watch, id, affiliation)}
                />
            }
            second={
                <WatchMap
                    label="Harbor watch"
                    className="h-full"
                    tracks={tracks}
                    zones={watch.zones ?? []}
                    links={links}
                    options={watch.options}
                    selected={selected}
                    onSelectedChange={(id) => picked.set(id)}
                    following={following}
                    onRelease={() => followed.set(null)}
                />
            }
        />
    )
}

/** The facts of the picked track: where it is, how it goes, what it says of itself and where it stands from harbor. */
function Facts({ track, zones }: { track: Track; zones: readonly ZoneRow[] }) {
    const { options } = useWatch()
    const props = track.properties ?? {}
    const knots = knotsOf(track)
    const position: [number, number] = [track.lon, track.lat]
    const fromHarbor = distance(HARBORS.harbor, position)
    const within = zonesOf(track, zones)
    const items = [
        { term: 'Position', value: formatPosition(position, options), code: true },
        { term: 'Speed', value: knots === undefined ? undefined : `${String(knots)} kn`, numeric: true },
        { term: 'Heading', value: track.heading === undefined ? undefined : formatBearing(track.heading), numeric: true },
        { term: 'Altitude', value: flightLevel(track.altitude), numeric: true },
        {
            term: 'From harbor',
            value: `${formatRange(fromHarbor, options.unit)} · ${formatBearing(bearing(HARBORS.harbor, position))}`,
            numeric: true,
        },
        { term: 'In zone', value: within.length === 0 ? undefined : within.map((zone) => zone.label).join(', ') },
        { term: 'MMSI', value: props.mmsi === undefined ? undefined : String(props.mmsi), code: true },
        { term: 'ICAO address', value: props.icao24 === undefined ? undefined : String(props.icao24), code: true },
        { term: 'Callsign', value: props.callsign === undefined ? undefined : String(props.callsign), code: true },
        { term: 'Type', value: typeof props.shipType === 'number' ? (SHIP_TYPES[props.shipType] ?? String(props.shipType)) : undefined },
        { term: 'Bound for', value: props.destination === undefined ? undefined : String(props.destination) },
        { term: 'Length', value: typeof props.length === 'number' ? `${String(props.length)} m` : undefined, numeric: true },
        { term: 'Squawk', value: props.squawk === undefined ? undefined : String(props.squawk), code: true },
        { term: 'Source', value: SOURCES[track.source ?? ''] ?? track.source },
    ].filter((item) => item.value !== undefined)
    return <DescriptionList size="sm" items={items} />
}

/** The side panel: the picked track's card, facts and tasks, and every open task. */
export function WatchPanel() {
    const watch = useWatch()
    const picture = useShownPicture()
    const selected = useStore(picked)
    const follow = useStore(followed)
    const [editing, setEditing] = useState<Task | undefined>(undefined)
    const [setting, setSetting] = useState(false)
    const track = picture.tracks.find((each) => each.id === selected)
    const tasked = taskedIds(watch.tasks)
    const item = track === undefined ? undefined : rosterItem(track, tasked)
    const about = (watch.tasks ?? []).filter((task) => isOpen(task) && (task.to.track === selected || task.from.track === selected))
    const open = (watch.tasks ?? []).filter(isOpen)
    const edit = (task: Task) => {
        setEditing(task)
        setSetting(true)
    }
    return (
        <>
            <SidePanel
                tabs={[
                    {
                        id: 'track',
                        label: 'Track',
                        icon: Radar,
                        content:
                            track === undefined || item === undefined ? (
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyTitle>No track picked</EmptyTitle>
                                        <EmptyDescription>Pick one in the list or on the map.</EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            ) : (
                                <>
                                    <PanelSection title="Track">
                                        <Stack gap="md">
                                            <TrackCard
                                                name={item.name}
                                                code={item.code}
                                                kind={item.kind}
                                                affiliation={item.affiliation}
                                                heading={item.heading}
                                                states={item.states}
                                                detail={item.detail}
                                                updatedAt={item.updatedAt}
                                                now={picture.at}
                                                onAffiliationChange={(affiliation) => judge(watch, track.id, affiliation)}
                                            />
                                            <Row gap="xs" wrap>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => followed.set(follow === track.id ? null : track.id)}
                                                >
                                                    {follow === track.id ? <LocateOff aria-hidden /> : <LocateFixed aria-hidden />}
                                                    {follow === track.id ? 'Stop following' : 'Follow'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditing(undefined)
                                                        setSetting(true)
                                                    }}
                                                >
                                                    <Plus aria-hidden />
                                                    New task
                                                </Button>
                                            </Row>
                                            <Facts track={track} zones={watch.zones ?? []} />
                                        </Stack>
                                    </PanelSection>
                                    {about.length > 0 && (
                                        <PanelSection title="Tasks">
                                            <TaskList
                                                rows={about}
                                                tracks={picture.tracks}
                                                now={watch.now}
                                                selected={selected}
                                                onEdit={edit}
                                            />
                                        </PanelSection>
                                    )}
                                </>
                            ),
                    },
                    {
                        id: 'tasks',
                        label: 'Tasks',
                        icon: ListChecks,
                        content: (
                            <PanelSection
                                title={`Open (${String(open.length)})`}
                                actions={
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setEditing(undefined)
                                            setSetting(true)
                                        }}
                                    >
                                        <Plus aria-hidden />
                                        New
                                    </Button>
                                }
                            >
                                {open.length === 0 ? (
                                    <Empty>
                                        <EmptyHeader>
                                            <EmptyTitle>No open tasks</EmptyTitle>
                                            <EmptyDescription>Set one from a track's card.</EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                ) : (
                                    <TaskList rows={open} tracks={picture.tracks} now={watch.now} selected={selected} onEdit={edit} />
                                )}
                            </PanelSection>
                        ),
                    },
                ]}
            />
            <TaskDialog
                open={setting}
                onOpenChange={setSetting}
                task={editing}
                target={editing === undefined && track !== undefined && track.affiliation !== 'friend' ? track.id : undefined}
                tracks={watch.picture.tracks}
                all={watch.tasks ?? []}
                now={watch.now}
            />
        </>
    )
}

/** The timeline at the console's foot: six hours back to the live edge, with how busy each stretch was. */
export function WatchTimeline() {
    const watch = useWatch()
    const at = useStore(shownAt)
    const from = watch.now - BACK
    // The strip is counted again each ten minutes of the clock, not each tick.
    const stretch = Math.floor(watch.now / (10 * MINUTE))
    const activity = useMemo(
        () => activityBetween(watch.options.seed, stretch * 10 * MINUTE - BACK, stretch * 10 * MINUTE, BINS),
        [watch.options.seed, stretch],
    )
    return (
        <PlaybackTimeline
            label="Harbor watch"
            from={from}
            to={watch.now}
            value={at === null ? null : Math.max(from, at)}
            onValueChange={(value) => shownAt.set(value)}
            activity={activity}
            rate={60}
            timeZone="UTC"
        />
    )
}

/** Goes to a track: picks it and centers the map on it while it moves. */
export function followTrack(id: string): void {
    picked.set(id)
    followed.set(id)
}
