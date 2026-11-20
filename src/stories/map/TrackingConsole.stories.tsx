import type { Meta, StoryObj } from '@storybook/react-vite'
import { Check, ListChecks, Pencil, Radar, Settings, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { PlaybackTimeline } from '@winterop-com/sokkel-ui/PlaybackTimeline'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Shell } from '@winterop-com/sokkel-ui/Shell'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { TaskCard, type TaskState } from '@winterop-com/sokkel-ui/TaskCard'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { TrackCard } from '@winterop-com/sokkel-ui/TrackCard'
import { TrackGlyph } from '@winterop-com/sokkel-ui/TrackGlyph'
import { TrackRoster, type TrackAffiliation, type TrackRosterItem } from '@winterop-com/sokkel-ui/TrackRoster'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { formatBearing, formatCoordinates } from '@winterop-com/sokkel-ui-maps/geodesy'
import { MapCoordinates } from '@winterop-com/sokkel-ui-maps/MapCoordinates'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { TrackLayer, trackCounts, trackLegendEntries } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { TidevannMark } from '../fixtures/TidevannMark'
import { WATCH_ACTIVITY, WATCH_NOW, WATCH_TASKS, WATCH_TRACKS, motionOf } from '../fixtures/watch'
import { WATCH_CAMERA, speedOf, useWatchClock, watchAt } from './tracks'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const GROUPS: RailGroup[] = [
    {
        id: 'watch',
        title: 'Watch',
        entries: [
            { id: 'harbor', label: 'Harbor watch', icon: Radar, href: '#', active: true },
            { id: 'tasks', label: 'Tasks', icon: ListChecks, href: '#' },
        ],
    },
    { id: 'app', title: 'Tidevann', entries: [{ id: 'settings', label: 'Settings', icon: Settings, href: '#' }] },
]

function Console() {
    const minute = useWatchClock()
    const liveNow = WATCH_NOW + minute * MINUTE
    // The time shown: null while live, else a moment played back to.
    const [shownAt, setShownAt] = useState<number | null>(null)
    const now = shownAt ?? liveNow
    const tracks = useMemo(() => watchAt((now - WATCH_NOW) / MINUTE), [now])
    const [judged, setJudged] = useState<Record<string, TrackAffiliation>>({})
    const [selected, setSelected] = useState<string | null>('contact-14')
    const [states, setStates] = useState<Record<string, TaskState>>({})

    const shown = tracks.map((track) => ({ ...track, affiliation: judged[track.id] ?? track.affiliation }))
    const roster: TrackRosterItem[] = shown.map((track) => {
        const known = WATCH_TRACKS.find((each) => each.id === track.id)
        return {
            id: track.id,
            name: track.label ?? track.id,
            kind: track.kind,
            affiliation: track.affiliation,
            heading: track.heading,
            thumbnail: known?.thumbnail,
            states: known?.states,
            detail: motionOf(speedOf(track.id), track.heading),
            updatedAt: now - (known?.lag ?? 0),
        }
    })
    const picked = roster.find((track) => track.id === selected)
    const pickedTrack = shown.find((track) => track.id === selected)
    const glyphOf = (id: string) => {
        const track = roster.find((each) => each.id === id)
        return track === undefined
            ? { name: id }
            : { name: track.name, glyph: <TrackGlyph kind={track.kind} affiliation={track.affiliation} heading={track.heading} /> }
    }
    const judge = (id: string, affiliation: TrackAffiliation) => setJudged((was) => ({ ...was, [id]: affiliation }))

    const panel = (
        <SidePanel
            tabs={[
                {
                    id: 'watch',
                    label: 'Watch',
                    content: (
                        <>
                            <PanelSection title="Track">
                                {picked === undefined || pickedTrack === undefined ? null : (
                                    <>
                                        <TrackCard
                                            name={picked.name}
                                            code={picked.id}
                                            kind={picked.kind}
                                            affiliation={picked.affiliation}
                                            heading={picked.heading}
                                            thumbnail={picked.thumbnail}
                                            states={picked.states}
                                            updatedAt={picked.updatedAt}
                                            now={now}
                                            onAffiliationChange={(affiliation) => judge(picked.id, affiliation)}
                                        />
                                        <DescriptionList
                                            size="sm"
                                            items={[
                                                { term: 'Position', value: formatCoordinates(pickedTrack.position), code: true },
                                                {
                                                    term: 'Speed',
                                                    value: picked.detail === undefined ? undefined : `${String(speedOf(picked.id))} kn`,
                                                    numeric: true,
                                                },
                                                {
                                                    term: 'Heading',
                                                    value:
                                                        pickedTrack.heading === undefined ? undefined : formatBearing(pickedTrack.heading),
                                                    numeric: true,
                                                },
                                            ]}
                                        />
                                    </>
                                )}
                            </PanelSection>
                            <PanelSection title="Tasks">
                                {WATCH_TASKS.map((task) => {
                                    const state = states[task.id] ?? task.state
                                    const open = state === 'pending' || state === 'executing' || state === 'paused'
                                    const setState = (next: TaskState) => setStates((was) => ({ ...was, [task.id]: next }))
                                    return (
                                        <TaskCard
                                            key={task.id}
                                            title={task.title}
                                            code={task.id}
                                            state={state}
                                            startedAt={task.started === undefined ? undefined : WATCH_NOW - task.started * MINUTE}
                                            endedAt={
                                                task.started === undefined || task.ran === undefined
                                                    ? undefined
                                                    : WATCH_NOW - (task.started - task.ran) * MINUTE
                                            }
                                            now={liveNow}
                                            from={glyphOf(task.from)}
                                            to={glyphOf(task.to)}
                                            selected={task.from === selected || task.to === selected}
                                            actions={
                                                open
                                                    ? [
                                                          { label: 'Edit', icon: <Pencil />, onSelect: () => undefined },
                                                          { label: 'Complete', icon: <Check />, onSelect: () => setState('done') },
                                                          {
                                                              label: 'Cancel',
                                                              icon: <X />,
                                                              destructive: true,
                                                              confirm: {
                                                                  question: `Cancel ${task.title} ${task.id}?`,
                                                                  detail: 'The task stops and is marked failed.',
                                                              },
                                                              onSelect: () => setState('failed'),
                                                          },
                                                      ]
                                                    : undefined
                                            }
                                        />
                                    )
                                })}
                            </PanelSection>
                        </>
                    ),
                },
            ]}
        />
    )

    return (
        <TooltipProvider>
            <Shell
                rail={<Rail mark={<TidevannMark />} name="Tidevann" groups={GROUPS} />}
                top={<TopBar trail={[{ label: 'Tidevann', href: '#' }, { label: 'Harbor watch' }]} />}
                panel={panel}
                bottom={
                    <PlaybackTimeline
                        label="Harbor watch"
                        from={liveNow - 6 * HOUR}
                        to={liveNow}
                        value={shownAt}
                        onValueChange={setShownAt}
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
                            now={now}
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
                            className="h-full"
                        >
                            <TrackLayer id="tracks" tracks={shown} />
                            <MapCoordinates />
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
            </Shell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Patterns/Tracking console', globals: { theme: 'dark' } }
export default meta

/**
 * A tracking console from the library's parts: the harbor watch's tracks on the map, the roster
 * left (grouped by affiliation, sharing the map's selection), the picked track and the tasks in the
 * side panel, and the playback timeline at the foot, which takes the map, the roster and the cards
 * back in time and returns to live.
 */
export const Watch: StoryObj = { name: 'Console', render: () => <Console /> }
