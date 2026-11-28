import { useEffect, useRef, useState, type ReactNode } from 'react'

import { filterRows, type Filter } from '../lib/filters'
import {
    TRACK_AFFILIATIONS,
    TRACK_COLORS,
    TRACK_KINDS,
    TRACK_NAMES_PART,
    type TrackAffiliation,
    type TrackKind,
    type TrackNameWords,
} from '../lib/tracks'
import { useWords, type WordsPart } from '../lib/words'
import { DataTable, type DataColumn, type DataReveal, type DataSort, type DataTableWords } from './DataTable'
import { Dot } from './Dot'
import { FilterBar, type FilterBarProps, type FilterField } from './FilterBar'
import type { FreshnessThresholds, FreshnessTime, FreshnessWords } from './Freshness'
import { TrackCard, type TrackCardWords, type TrackState } from './TrackCard'
import { TrackGlyph } from './TrackGlyph'

export type { TrackAffiliation, TrackKind } from '../lib/tracks'
export type { TrackState } from './TrackCard'

/** One track as the roster lists it: what its card shows. */
export interface TrackRosterItem {
    id: string
    name: string
    /** Its id in the code face after the name; left out, the roster shows `id` when it differs from the name. */
    code?: string
    kind: TrackKind
    affiliation: TrackAffiliation
    heading?: number
    thumbnail?: string | ReactNode
    states?: readonly TrackState[]
    detail?: ReactNode
    updatedAt?: FreshnessTime | null
}

export interface TrackRosterWords {
    /** The search field's placeholder. */
    search: string
    /** The filter field and sort choice of the affiliation. */
    affiliation: string
    /** The filter field and sort choice of the kind. */
    kind: string
    /** The filter field of the states. */
    state: string
    /** The sort choice of the name. */
    name: string
    /** The sort choice of the freshness, the freshest first. */
    freshest: string
    /** Said with no tracks, or none the search and filters keep. */
    empty: string
}

export const TRACK_ROSTER_WORDS: TrackRosterWords = {
    search: 'Search',
    affiliation: 'Affiliation',
    kind: 'Kind',
    state: 'State',
    name: 'Name',
    freshest: 'Last heard',
    empty: 'No tracks.',
}

/** Where a catalog holds a track roster's words. */
export const TRACK_ROSTER_PART: WordsPart<TrackRosterWords> = { id: 'trackRoster', words: TRACK_ROSTER_WORDS }

function stateLabel(state: TrackState): string {
    return typeof state === 'string' ? state : state.label
}

function timeOf(time: FreshnessTime | null | undefined): number {
    if (time === null || time === undefined) return -Infinity
    const ms = time instanceof Date ? time.getTime() : typeof time === 'number' ? time : Date.parse(time)
    return Number.isNaN(ms) ? -Infinity : ms
}

/** The fields a roster filters on: the affiliation, the kind and, when any track has one, the states. */
export function trackFilterFields(
    tracks: readonly TrackRosterItem[],
    words: TrackRosterWords & TrackNameWords = { ...TRACK_ROSTER_WORDS, ...TRACK_NAMES_PART.words },
): FilterField<TrackRosterItem>[] {
    const states = [...new Set(tracks.flatMap((track) => (track.states ?? []).map(stateLabel)))].sort()
    const kinds = TRACK_KINDS.filter((kind) => tracks.some((track) => track.kind === kind))
    return [
        {
            id: 'affiliation',
            label: words.affiliation,
            type: 'set',
            options: TRACK_AFFILIATIONS.map((affiliation) => ({
                value: affiliation,
                label: words[affiliation],
                icon: <Dot color={TRACK_COLORS[affiliation]} size="md" />,
            })),
            value: (track) => track.affiliation,
        },
        {
            id: 'kind',
            label: words.kind,
            type: 'set',
            options: kinds.map((kind) => ({ value: kind, label: words[kind], icon: <TrackGlyph kind={kind} size="sm" /> })),
            value: (track) => track.kind,
        },
        ...(states.length === 0
            ? []
            : [
                  {
                      id: 'state',
                      label: words.state,
                      type: 'set' as const,
                      options: states.map((state) => ({ value: state })),
                      value: (track: TrackRosterItem) => (track.states ?? []).map(stateLabel),
                  },
              ]),
    ]
}

export interface TrackRosterProps {
    tracks: readonly TrackRosterItem[]
    /** The id of the track picked, drawn as chosen and brought into view when it changes from outside, as a press on the map does. */
    selected?: string | null
    /** Called with the track pressed in the list. */
    onSelect?: (id: string) => void
    /** Makes each card's affiliation a menu, calling this with the track and the affiliation chosen. */
    onAffiliationChange?: (id: string, affiliation: TrackAffiliation) => void
    /** The moment every card's freshness counts from; without it, the shared clock. */
    now?: FreshnessTime
    /** Where the cards' freshness turns stale and lost. */
    freshness?: Partial<FreshnessThresholds>
    /** The filters, held by the app; the roster holds them itself from `defaultFilters` without. */
    filters?: readonly Filter[]
    defaultFilters?: readonly Filter[]
    onFiltersChange?: (filters: Filter[]) => void
    /** The order, held by the app: by `name`, `affiliation`, `kind` or `updated`. Name, A to Z, by default. */
    sort?: DataSort | null
    defaultSort?: DataSort | null
    onSortChange?: (sort: DataSort | null) => void
    /** The affiliations folded, held by the app. */
    foldedGroups?: ReadonlySet<string>
    defaultFoldedGroups?: ReadonlySet<string>
    onFoldedGroupsChange?: (folded: ReadonlySet<string>) => void
    /** Draws the list without its own frame, for a panel or a section that draws one. */
    framed?: boolean
    words?: Partial<TrackRosterWords & TrackNameWords & TrackCardWords & FreshnessWords>
    /** The table's own words, such as its count. */
    tableWords?: Partial<DataTableWords>
    /** The filter bar's words. */
    filterWords?: FilterBarProps['words']
    className?: string
}

/**
 * The tracks a console watches, as one list: a `DataTable` list of `TrackCard` rows gathered under
 * their affiliations' heads, friend first, each head with its count and folding its group. Its bar
 * holds a search over the names and ids, a `FilterBar` on the affiliation, the kind and the states,
 * and a sort menu (name, affiliation, kind, or the freshest first), the list having no column heads.
 * The track picked (`selected`) is drawn as chosen and a press picks another (`onSelect`), so a map
 * beside it shares the one selection; one picked from outside unfolds its group and comes into view.
 */
export function TrackRoster({
    tracks,
    selected = null,
    onSelect,
    onAffiliationChange,
    now,
    freshness,
    filters: heldFilters,
    defaultFilters = [],
    onFiltersChange,
    sort,
    defaultSort = { column: 'name', direction: 'asc' },
    onSortChange,
    foldedGroups,
    defaultFoldedGroups,
    onFoldedGroupsChange,
    framed = true,
    words: given,
    tableWords,
    filterWords,
    className,
}: TrackRosterProps) {
    const own = useWords(TRACK_ROSTER_PART)
    const names = useWords(TRACK_NAMES_PART)
    const words = { ...own, ...names, ...given }
    const [ownFilters, setOwnFilters] = useState<readonly Filter[]>(defaultFilters)
    const filters = heldFilters ?? ownFilters
    const setFilters = (next: Filter[]) => {
        if (heldFilters === undefined) setOwnFilters(next)
        onFiltersChange?.(next)
    }
    const fields = trackFilterFields(tracks, words)
    const shown = filterRows(tracks, filters, fields)

    // A track picked from outside, such as on the map, unfolds its group and comes into view; one pressed here is in view already.
    const pressed = useRef<string | null>(null)
    const [reveal, setReveal] = useState<DataReveal | null>(null)
    useEffect(() => {
        if (selected === null || selected === pressed.current) return
        pressed.current = null
        setReveal({ key: selected, focus: false })
    }, [selected])

    const columns: DataColumn<TrackRosterItem>[] = [
        {
            id: 'name',
            header: words.name,
            width: 'minmax(0, 1fr)',
            minWidth: '12rem',
            hideable: false,
            resizable: false,
            sortValue: (track) => track.name.toLocaleLowerCase(),
            cell: (track) => (
                <TrackCard
                    framed={false}
                    name={track.name}
                    code={track.code ?? (track.id === track.name ? undefined : track.id)}
                    kind={track.kind}
                    affiliation={track.affiliation}
                    heading={track.heading}
                    thumbnail={track.thumbnail}
                    states={track.states}
                    detail={track.detail}
                    updatedAt={track.updatedAt}
                    now={now}
                    freshness={freshness}
                    onAffiliationChange={
                        onAffiliationChange === undefined ? undefined : (affiliation) => onAffiliationChange(track.id, affiliation)
                    }
                    words={words}
                    className="py-1.5"
                />
            ),
        },
        {
            id: 'affiliation',
            header: words.affiliation,
            width: '0px',
            hideable: false,
            sortValue: (track) => TRACK_AFFILIATIONS.indexOf(track.affiliation),
            cell: () => null,
        },
        {
            id: 'kind',
            header: words.kind,
            width: '0px',
            hideable: false,
            sortValue: (track) => TRACK_KINDS.indexOf(track.kind),
            cell: () => null,
        },
        {
            id: 'updated',
            header: words.freshest,
            width: '0px',
            hideable: false,
            sortValue: (track) => -timeOf(track.updatedAt),
            cell: () => null,
        },
    ]

    return (
        <DataTable
            variant="list"
            columns={columns}
            hiddenColumns={HIDDEN}
            reorderable={false}
            columnHeads={false}
            rows={shown}
            total={tracks.length === shown.length ? undefined : shown.length}
            rowKey={(track) => track.id}
            rowHeight="auto"
            stackBelow={false}
            minWidth="auto"
            resizable={false}
            searchBy={(track) => `${track.name} ${track.code ?? track.id}`}
            searchField={{ placeholder: words.search }}
            toolbar={<FilterBar fields={fields} filters={filters} onFiltersChange={setFilters} words={filterWords} />}
            sort={sort}
            defaultSort={defaultSort}
            onSortChange={onSortChange}
            groupBy="affiliation"
            groupOrder={TRACK_AFFILIATIONS}
            groupLabel={(key) => (
                <span className="flex items-center gap-2">
                    <Dot color={TRACK_COLORS[key as TrackAffiliation] ?? 'var(--faint)'} size="md" />
                    {words[key as TrackAffiliation] ?? key}
                </span>
            )}
            foldedGroups={foldedGroups}
            defaultFoldedGroups={defaultFoldedGroups}
            onFoldedGroupsChange={onFoldedGroupsChange}
            onOpen={(track) => {
                pressed.current = track.id
                onSelect?.(track.id)
            }}
            opened={(track) => track.id === selected}
            reveal={reveal}
            empty={words.empty}
            framed={framed}
            words={tableWords}
            className={className}
        />
    )
}

/** The columns only the sort menu reads. */
const HIDDEN: ReadonlySet<string> = new Set(['affiliation', 'kind', 'updated'])
