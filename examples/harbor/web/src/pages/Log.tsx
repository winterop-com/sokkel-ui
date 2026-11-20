import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { TrackGlyph } from '@winterop-com/sokkel-ui/TrackGlyph'
import { TRACKING_WORDS } from '@winterop-com/sokkel-ui-tracking/affiliation'
import type { TrackAffiliation, TrackKind } from '@winterop-com/sokkel-ui-tracking/track'
import { useMemo, useState } from 'react'

import { go } from 'tidevann-shared/router'
import { formatStamp } from '../format'
import { eventsBetween, HOUR, MINUTE } from '../sim/world'
import { picked, useWatch } from '../watch'
import { followed } from './Watch'

/** What a line of the log tells of. */
type Kind = 'appeared' | 'named' | 'affiliation' | 'stale' | 'lost' | 'left' | 'task' | 'zone'

/** One line of the log: from the feed, or from a person on watch. */
interface Line {
    id: string
    at: number
    kind: Kind
    track?: string
    trackKind?: TrackKind
    name: string
    affiliation?: TrackAffiliation
    detail: string
    by: string
}

const SAID: Record<Kind, string> = {
    appeared: 'New contact',
    named: 'Named',
    affiliation: 'Affiliation',
    stale: 'Stale',
    lost: 'Lost',
    left: 'Left the area',
    task: 'Task',
    zone: 'Zone',
}

type Shown = 'all' | 'contacts' | 'affiliation' | 'tasks'

const SHOWS: Record<Shown, readonly Kind[]> = {
    all: ['appeared', 'named', 'affiliation', 'stale', 'lost', 'left', 'task', 'zone'],
    contacts: ['appeared', 'named', 'stale', 'lost', 'left'],
    affiliation: ['affiliation'],
    tasks: ['task'],
}

/** How far back the log reaches. */
const BACK = 6 * HOUR

const word = (affiliation: TrackAffiliation | undefined) => (affiliation === undefined ? '' : TRACKING_WORDS.affiliations[affiliation])

const COLUMNS: DataColumn<Line>[] = [
    { id: 'at', header: 'Time (UTC)', width: '10rem', cell: (line) => formatStamp(line.at), sortValue: (line) => line.at },
    { id: 'kind', header: 'Event', width: '8.5rem', cell: (line) => SAID[line.kind], sortValue: (line) => SAID[line.kind] },
    {
        id: 'track',
        header: 'Track',
        width: 'minmax(10rem,1fr)',
        cell: (line) => (
            <Row as="span" gap="sm">
                {line.trackKind !== undefined && <TrackGlyph kind={line.trackKind} affiliation={line.affiliation} />}
                {line.name}
            </Row>
        ),
        sortValue: (line) => line.name,
    },
    { id: 'detail', header: 'Detail', width: 'minmax(12rem,1.6fr)', cell: (line) => line.detail, stack: 'secondary' },
    { id: 'by', header: 'By', width: '7rem', cell: (line) => line.by, sortValue: (line) => line.by, stack: 'secondary' },
]

/** What the feed saw happen and what people on watch did, the newest first: contacts heard, named, gone stale, lost or gone, affiliations changed, tasks moved and zones edited. */
export function Log() {
    const watch = useWatch()
    const [shown, setShown] = useState<Shown>('all')
    const [search, setSearch] = useState('')
    // The feed's events are found again each minute of the clock, not each tick.
    const minute = Math.floor(watch.now / MINUTE) * MINUTE
    const seen = useMemo(() => eventsBetween(watch.options.seed, minute - BACK, minute), [watch.options.seed, minute])
    const lines = useMemo((): Line[] => {
        const fromFeed: Line[] = seen.map((event) => ({
            id: event.id,
            at: event.at,
            kind: event.kind,
            track: event.track,
            trackKind: event.trackKind,
            name: event.name,
            affiliation: event.affiliation,
            detail:
                event.kind === 'affiliation'
                    ? `${word(event.was)} to ${word(event.affiliation)}`
                    : event.kind === 'appeared'
                      ? `First heard, ${event.trackKind === 'aircraft' ? 'by ADS-B' : 'by AIS'}`
                      : event.kind === 'named'
                        ? `Sent its name, MMSI ${event.track}`
                        : event.kind === 'stale'
                          ? 'Silent for a minute'
                          : event.kind === 'lost'
                            ? 'Silent for five minutes'
                            : 'Out of the watch area',
            by: 'feed',
        }))
        const byHand: Line[] = (watch.entries ?? [])
            .filter((entry) => entry.at <= watch.now)
            .map((entry) => ({
                id: entry.id,
                at: entry.at,
                kind: entry.kind,
                track: entry.track,
                trackKind: entry.trackKind,
                name: entry.name,
                affiliation: entry.affiliation,
                detail: entry.kind === 'affiliation' ? `${word(entry.was)} to ${word(entry.affiliation)}, set by hand` : entry.detail,
                by: entry.by,
            }))
        return [...fromFeed, ...byHand].sort((a, b) => b.at - a.at)
    }, [seen, watch.entries, watch.now])
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const listed = lines.filter(
        (line) =>
            SHOWS[shown].includes(line.kind) &&
            words.every((each) =>
                `${line.name} ${line.track ?? ''} ${line.detail} ${SAID[line.kind]} ${line.by}`.toLowerCase().includes(each),
            ),
    )
    const count = (which: Shown) => lines.filter((line) => SHOWS[which].includes(line.kind)).length
    return (
        <Stack gap="section" className="h-full">
            <PageHeader title="Log" count={`the last ${String(BACK / HOUR)} hours`} />
            <Toolbar>
                <Segmented
                    label="Events shown"
                    value={shown}
                    onValueChange={setShown}
                    options={[
                        { value: 'all', label: 'All', count: count('all') },
                        { value: 'contacts', label: 'Contacts', count: count('contacts') },
                        { value: 'affiliation', label: 'Affiliation', count: count('affiliation') },
                        { value: 'tasks', label: 'Tasks', count: count('tasks') },
                    ]}
                />
            </Toolbar>
            <DataTable
                className="min-h-0 flex-1"
                columns={COLUMNS}
                rows={listed}
                rowKey={(line) => line.id}
                search={<SearchField value={search} onChange={setSearch} placeholder="Search" />}
                onOpen={(line) => {
                    if (line.track === undefined) return
                    picked.set(line.track)
                    followed.set(null)
                    go('/watch')
                }}
                rowLabel={(line) => `${SAID[line.kind]}: ${line.name}`}
                empty="Nothing in the log matches."
            />
        </Stack>
    )
}
