import { Plus } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { DataTable, type DataColumn, type DataSort } from '@winterop-com/sokkel-ui/DataTable'
import { FilterBar, type Filter, type FilterField } from '@winterop-com/sokkel-ui/FilterBar'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SavedViews, type SavedView } from '@winterop-com/sokkel-ui/SavedViews'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { filterRows } from '@winterop-com/sokkel-ui/lib/filters'
import { EMPTY_VIEW, type ListViewState } from '@winterop-com/sokkel-ui/lib/list-views'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { RUN_FIELDS, TODAY, WEEK_RUNS, WEEK_START, type WeekRun } from './fixtures/weekRuns'

/**
 * Tidevann's runs of the week as a listing an app builds: a search, a `FilterBar` in the table's
 * bar filtering the rows in the browser, and the saved views of the listing, which the app keeps.
 */

export const RUN_COLUMNS: DataColumn<WeekRun>[] = [
    {
        id: 'job',
        header: 'Job',
        width: 'minmax(10rem,1fr)',
        cell: (run) => <span className="font-mono">{run.job}</span>,
        sortValue: (run) => run.job,
    },
    { id: 'state', header: 'State', width: '7.5rem', cell: (run) => <StatusChip status={run.state} />, sortValue: (run) => run.state },
    {
        id: 'by',
        header: 'Started by',
        width: '7rem',
        cell: (run) => <span className="text-muted-foreground">{run.by}</span>,
        sortValue: (run) => run.by,
    },
    {
        id: 'started',
        header: 'Started',
        width: '8rem',
        cell: (run) => <span className="tabular-nums">{run.started}</span>,
        sortValue: (run) => `${run.day} ${run.started.slice(-5)}`,
    },
    {
        id: 'duration',
        header: 'Duration',
        width: '6rem',
        align: 'end',
        cell: (run) => <span className="tabular-nums">{run.duration}</span>,
        sortValue: (run) => run.seconds,
    },
    { id: 'region', header: 'Region', width: '7rem', cell: (run) => run.region, sortValue: (run) => run.region },
]

export const RUN_COLUMN_IDS = RUN_COLUMNS.map((column) => column.id)

/** The views Tidevann's people keep on the runs: all of them, the failures of this week, and one's own. */
export const RUN_VIEWS: SavedView[] = [
    { id: 'all', name: 'All runs', state: EMPTY_VIEW, locked: true },
    {
        id: 'failed-week',
        name: 'Failed this week',
        state: {
            ...EMPTY_VIEW,
            filters: [
                { field: 'state', operator: 'oneOf', values: ['failed'] },
                { field: 'started', operator: 'between', values: [WEEK_START, TODAY] },
            ],
            sort: { column: 'started', direction: 'desc' },
        },
    },
    {
        id: 'mine',
        name: 'Mine',
        state: {
            ...EMPTY_VIEW,
            filters: [{ field: 'by', operator: 'oneOf', values: ['ada'] }],
            hidden: ['by'],
            order: ['state', 'duration'],
        },
    },
]

export interface RunsListingProps {
    /** The fields the filter bar offers; every field of a run by default. */
    fields?: readonly FilterField<WeekRun>[]
    /** Keeps saved views, starting from this one; without it the listing has only its filters. */
    view?: string
    /** The listing's filters at first, when it keeps no views. */
    filters?: readonly Filter[]
    /** Changes made after the view was picked, so it starts as differing from it. */
    changed?: Partial<ListViewState>
    /** Opens the menu of views at first. */
    viewsOpen?: boolean
    /** The field whose filter's editor is open at first. */
    editing?: string
    /** The page around the listing: a page header with the views among its actions, or the listing alone. */
    page?: boolean
    /** Called with a run pressed in the listing. */
    onOpen?: (run: WeekRun) => void
    opened?: (run: WeekRun) => boolean
}

let made = 0

/** The runs listing, its setup held here as an app holds it, so a view picked, saved or changed shows at once. */
export function RunsListing({
    fields = RUN_FIELDS,
    view,
    filters: initialFilters = [],
    changed,
    viewsOpen,
    editing,
    page = false,
    onOpen,
    opened,
}: RunsListingProps) {
    const [views, setViews] = useState<SavedView[]>(RUN_VIEWS)
    const [viewId, setViewId] = useState<string | null>(view ?? null)
    const start = { ...(views.find((one) => one.id === view)?.state ?? { ...EMPTY_VIEW, filters: initialFilters }), ...changed }
    const [filters, setFilters] = useState<readonly Filter[]>(start.filters)
    const [sort, setSort] = useState<DataSort | null>(start.sort)
    const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set(start.hidden))
    const [order, setOrder] = useState<readonly string[]>(start.order)
    const [widths, setWidths] = useState<Readonly<Record<string, number>>>(start.widths)
    const [query, setQuery] = useState('')

    const current: ListViewState = { filters, sort, hidden: [...hidden], order, widths }
    const apply = (state: ListViewState) => {
        setFilters(state.filters)
        setSort(state.sort)
        setHidden(new Set(state.hidden))
        setOrder(state.order)
        setWidths(state.widths)
    }
    const rows = useMemo(() => {
        const kept = filterRows(WEEK_RUNS, filters, fields)
        const wanted = query.trim().toLowerCase()
        return wanted === '' ? kept : kept.filter((run) => `${run.id} ${run.job}`.includes(wanted))
    }, [filters, query, fields])

    const saved: ReactNode = view !== undefined && (
        <SavedViews
            views={views}
            value={viewId}
            current={current}
            columns={RUN_COLUMN_IDS}
            defaultOpen={viewsOpen}
            onValueChange={(picked) => {
                setViewId(picked.id)
                apply(picked.state)
            }}
            onSave={(next) => setViews((all) => all.map((one) => (one.id === next.id ? next : one)))}
            onSaveNew={(name, state) => {
                made += 1
                const id = `view-${String(made)}`
                setViews((all) => [...all, { id, name, state }])
                setViewId(id)
            }}
            onRename={(renamed, name) => setViews((all) => all.map((one) => (one.id === renamed.id ? { ...one, name } : one)))}
            onDelete={(gone) => {
                setViews((all) => all.filter((one) => one.id !== gone.id))
                setViewId('all')
                apply(EMPTY_VIEW)
            }}
        />
    )
    const table = (
        <DataTable
            className="min-h-0 flex-1"
            search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
            toolbar={<FilterBar fields={fields} filters={filters} onFiltersChange={setFilters} defaultEditing={editing} />}
            columns={RUN_COLUMNS}
            rows={rows}
            rowKey={(run) => run.id}
            sort={sort}
            onSortChange={setSort}
            hiddenColumns={hidden}
            onHiddenColumnsChange={setHidden}
            columnOrder={order}
            onColumnOrderChange={setOrder}
            columnWidths={widths}
            onColumnWidthsChange={setWidths}
            onOpen={onOpen}
            opened={opened}
            words={{ rows: (count) => `${count.toLocaleString('en-US')} ${count === 1 ? 'run' : 'runs'}` }}
            minWidth="40rem"
        />
    )
    if (page)
        return (
            <Stack gap="lg" className="h-full min-h-0">
                <PageHeader
                    title="Runs"
                    count="this week"
                    actions={
                        <>
                            {saved}
                            <Button>
                                <Plus aria-hidden />
                                New
                            </Button>
                        </>
                    }
                />
                {table}
            </Stack>
        )
    return (
        <Stack gap="md" className="h-full min-h-0">
            {saved}
            {table}
        </Stack>
    )
}
