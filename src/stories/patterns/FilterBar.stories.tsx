import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo, useState } from 'react'

import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DataTable, type DataSort } from '@winterop-com/sokkel-ui/DataTable'
import { FilterBar, type Filter } from '@winterop-com/sokkel-ui/FilterBar'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { activeFilters, filterRows } from '@winterop-com/sokkel-ui/lib/filters'
import { RUN_COLUMNS, RunsListing } from '../RunsListing'
import { RUN_FIELDS, TODAY, WEEK_RUNS, WEEK_START } from '../fixtures/weekRuns'

/**
 * Filters on a listing as chips: Filter adds one from a menu of the fields, each chip opens its
 * operator and value, and Clear all takes them away. Tidevann's runs of one week, the same every time.
 */
const meta: Meta = { title: 'Patterns/Filter bar', parameters: { frame: 'padded' } }
export default meta

/** One filter of each kind: a set, a date range, a number bound and text. */
const SET: Filter[] = [
    { field: 'state', operator: 'oneOf', values: ['failed', 'cancelled'] },
    { field: 'job', operator: 'oneOf', values: ['nightly-export'] },
    { field: 'started', operator: 'between', values: [WEEK_START, TODAY] },
    { field: 'duration', operator: 'atLeast', values: ['60'] },
    { field: 'run', operator: 'contains', values: ['8f3a'] },
]

/** Nothing set: the bar is the one button that adds a filter. */
export const Empty: StoryObj = { render: () => <FilterBar fields={RUN_FIELDS} /> }

/** A filter of each kind set, each chip saying its field, how it compares and its value, with Clear all after them. */
export const Chosen: StoryObj = { name: 'Set', render: () => <FilterBar fields={RUN_FIELDS} defaultFilters={SET} /> }

/** The menu of fields open, with its search; choosing one adds its filter and opens its editor. */
export const Fields: StoryObj = { render: () => <FilterBar fields={RUN_FIELDS} defaultFilters={SET.slice(0, 1)} defaultMenuOpen /> }

/** A set's editor: any of or none of, over its values to tick. */
export const Editing: StoryObj = { render: () => <FilterBar fields={RUN_FIELDS} defaultFilters={SET.slice(0, 2)} defaultEditing="state" /> }

/** A date range's editor: between, after or before, with the two days of the range. */
export const Range: StoryObj = { render: () => <FilterBar fields={RUN_FIELDS} defaultFilters={SET.slice(2, 4)} defaultEditing="started" /> }

/** A number's editor: at least, at most or between, in the field's unit. */
export const Bound: StoryObj = {
    render: () => <FilterBar fields={RUN_FIELDS} defaultFilters={SET.slice(2, 4)} defaultEditing="duration" />,
}

/** A set too long to scan, its values narrowed by the search over them. */
export const LongList: StoryObj = {
    name: 'Long list',
    render: () => (
        <FilterBar
            fields={RUN_FIELDS}
            defaultFilters={[{ field: 'region', operator: 'oneOf', values: ['Norway', 'Kenya'] }]}
            defaultEditing="region"
        />
    ),
}

/** In a table's bar, filtering its rows in the browser through `filterRows` with the same fields. */
export const InTable: StoryObj = {
    name: 'In a table',
    parameters: { frame: 'none' },
    render: () => (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <RunsListing filters={SET.slice(0, 1)} />
        </Stack>
    ),
}

const PAGE = 25

/** What a server answers for one page of runs: those passing the filters, in the sort asked, and how many pass in all. */
function serve(filters: readonly Filter[], sort: DataSort | null, page: number) {
    const kept = filterRows(WEEK_RUNS, filters, RUN_FIELDS)
    const column = RUN_COLUMNS.find((one) => one.id === sort?.column)
    const sorted =
        column?.sortValue === undefined || sort === null
            ? kept
            : [...kept].sort((a, b) => {
                  const [x, y] = [column.sortValue?.(a) ?? '', column.sortValue?.(b) ?? '']
                  return (x < y ? -1 : x > y ? 1 : 0) * (sort.direction === 'asc' ? 1 : -1)
              })
    return { rows: sorted.slice(page * PAGE, (page + 1) * PAGE), total: kept.length }
}

/** The filters as a query string, the way Tidevann's server reads them. */
function query(filters: readonly Filter[]): string {
    const parts = activeFilters(filters).map(
        (filter) => `${filter.field}.${filter.operator}=${filter.values.map(encodeURIComponent).join(',')}`,
    )
    return parts.length === 0 ? '' : `?${parts.join('&')}`
}

function ServerRuns() {
    const [filters, setFilters] = useState<Filter[]>(SET.slice(0, 1))
    const [sort, setSort] = useState<DataSort | null>(null)
    const [page, setPage] = useState(0)
    const answer = useMemo(() => serve(filters, sort, page), [filters, sort, page])
    return (
        <Stack gap="md" className="h-svh bg-background p-4 text-foreground">
            <ApiLink path={`/api/runs${query(filters)}`} href={`https://tidevann.example.org/api/runs${query(filters)}`} />
            <DataTable
                className="min-h-0 flex-1"
                toolbar={
                    <FilterBar
                        fields={RUN_FIELDS}
                        filters={filters}
                        onFiltersChange={(next) => {
                            setFilters(next)
                            setPage(0)
                        }}
                    />
                }
                columns={RUN_COLUMNS}
                rows={answer.rows}
                rowKey={(run) => run.id}
                paging="server"
                total={answer.total}
                manualSort
                sort={sort}
                onSortChange={setSort}
                page={page}
                onPageChange={setPage}
                pageSize={PAGE}
                pageSizes={[PAGE]}
                minWidth="40rem"
            />
        </Stack>
    )
}

/**
 * Filtered on a server: the app holds the filters, sends the complete ones (`activeFilters`) with
 * the sort and the page, and hands the table the page it gets back. The request is named over it.
 */
export const Server: StoryObj = { parameters: { frame: 'none' }, render: () => <ServerRuns /> }
