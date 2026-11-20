/**
 * The watch as every page reads it: the simulated clock, the live picture read from the feed, and
 * the rows the backend keeps, with what turns them into the parts' shapes.
 */
import type { TrackRosterItem, TrackState } from '@winterop-com/sokkel-ui/TrackRoster'
import { createStore, useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import type { Track as MapTrack } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import { createSimClock } from '@winterop-com/sokkel-ui-tracking/simulate'
import type { Track, TrackAffiliation } from '@winterop-com/sokkel-ui-tracking/track'
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useCollection } from 'tidevann-shared/backend'

import { entries, isOpen, judgments, ME, tasks, zones, type Entry, type JudgmentRow, type Task, type ZoneRow } from './data'
import { motionLine } from './format'
import { pictureAt, type Picture } from './sim/feed'
import { EPOCH, findContact, nameAt } from './sim/world'
import { DEFAULT_SETTINGS, settings, type Settings } from './settings'

/** The simulated moment the watch stands at, kept so a visit goes on where the last left off. */
export const clock = createStore<number>(EPOCH, { key: 'clock', check: (value) => typeof value === 'number' && Number.isFinite(value) })

/**
 * Moves the simulated clock on each second by the feed's speed, unless the feed is paused: the
 * tracking add-on's clock plays from the kept moment, follows the settings' speed and pause, and
 * goes to any moment the clock is set to from outside, as the settings' reset does.
 */
export function startClock(): () => void {
    const options = () => ({ ...DEFAULT_SETTINGS, ...settings.get() })
    const played = createSimClock({ start: clock.get(), speed: options().speed, playing: !options().paused })
    const stops = [
        played.subscribe(() => clock.set(played.get())),
        settings.subscribe(() => {
            const { speed, paused } = options()
            if (speed !== played.speed) played.setSpeed(speed)
            if (paused) played.pause()
            else played.play()
        }),
        clock.subscribe(() => {
            if (clock.get() !== played.get()) played.seek(clock.get())
        }),
    ]
    return () => {
        for (const stop of stops) stop()
    }
}

/** The picked track, shared by the roster, the map, the card and the log. */
export const picked = createStore<string | null>(null)

export interface Watch {
    now: number
    options: Settings
    picture: Picture
    tasks: Task[] | undefined
    zones: ZoneRow[] | undefined
    entries: Entry[] | undefined
    judgments: JudgmentRow[]
    error: string | undefined
}

const WatchContext = createContext<Watch | null>(null)

/** Reads the feed at the clock's moment and the backend's rows, for every page under it. */
export function WatchProvider({ children }: { children: ReactNode }) {
    const now = useStore(clock)
    const options = { ...DEFAULT_SETTINGS, ...useStore(settings) }
    const taskRows = useCollection(tasks)
    const zoneRows = useCollection(zones)
    const entryRows = useCollection(entries)
    const judgmentRows = useCollection(judgments)
    const judged = useMemo(() => judgmentRows.rows ?? [], [judgmentRows.rows])
    const picture = useMemo(() => pictureAt(options.seed, now, judged), [options.seed, now, judged])
    const value: Watch = {
        now,
        options,
        picture,
        tasks: taskRows.rows,
        zones: zoneRows.rows,
        entries: entryRows.rows,
        judgments: judged,
        error: taskRows.error ?? zoneRows.error ?? entryRows.error ?? judgmentRows.error,
    }
    useEffect(() => startClock(), [])
    return <WatchContext.Provider value={value}>{children}</WatchContext.Provider>
}

export function useWatch(): Watch {
    const watch = useContext(WatchContext)
    if (watch === null) throw new Error('useWatch needs a WatchProvider above it.')
    return watch
}

/** A track as the map layer draws it. */
export function mapTrack(track: Track, options: Pick<Settings, 'trails'>): MapTrack {
    return {
        id: track.id,
        position: [track.lon, track.lat],
        heading: track.heading,
        affiliation: track.affiliation,
        kind: track.kind,
        label: track.label,
        trail: options.trails ? track.trail : undefined,
    }
}

const TASKED: TrackState = { label: 'Tasked', tone: 'info' }

/** The ids of the tracks an open task is about or done by. */
export function taskedIds(rows: readonly Task[] | undefined): Set<string> {
    return new Set((rows ?? []).filter(isOpen).flatMap((task) => [task.from.track, task.to.track]))
}

/** A track as the roster lists it: its name, its MMSI or address after it, how it moves and when it was last heard. */
export function rosterItem(track: Track, tasked: ReadonlySet<string>): TrackRosterItem {
    const label = track.label ?? track.id
    return {
        id: track.id,
        name: label,
        code: label === track.id || track.kind === 'sensor' ? undefined : track.id,
        kind: track.kind,
        affiliation: track.affiliation,
        heading: track.heading,
        states: tasked.has(track.id) ? [TASKED] : undefined,
        detail: motionLine(track),
        updatedAt: track.updatedAt ?? null,
    }
}

/** Sets a track's affiliation from now on, as a person on watch, and logs it. */
export function judge(watch: Watch, id: string, affiliation: TrackAffiliation): void {
    const track = watch.picture.tracks.find((each) => each.id === id)
    const contact = watch.picture.contacts.get(id) ?? findContact(watch.options.seed, id, watch.now)
    const was = track?.affiliation
    if (was === affiliation) return
    void judgments.create({ track: id, affiliation, at: watch.now, by: ME })
    void entries.create({
        at: watch.now,
        kind: 'affiliation',
        track: id,
        trackKind: track?.kind ?? contact?.kind,
        name: track?.label ?? (contact === undefined ? id : nameAt(contact, watch.now)),
        affiliation,
        was,
        detail: 'Set by hand',
        by: ME,
    })
}
