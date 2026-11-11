import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { FilterChip } from '@winterop-com/sokkel-ui/FilterChip'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { ListingBar } from '@winterop-com/sokkel-ui/ListingBar'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { STATUS_OPTIONS } from '../fixtures/filters'
import { makeRuns, type TableRun } from '../fixtures/tableRuns'

const meta: Meta = { title: 'Patterns/Listing bar', parameters: { frame: 'padded' } }
export default meta

const RUNS = makeRuns(24)
const COLUMNS: DataColumn<TableRun>[] = [
    { id: 'id', header: 'Run', width: '8.5rem', cell: (run) => <span className="font-mono">{run.id}</span> },
    { id: 'job', header: 'Job', width: 'minmax(10rem,1fr)', cell: (run) => <span className="font-mono">{run.job}</span> },
    { id: 'state', header: 'State', width: '7.5rem', cell: (run) => <StatusChip status={run.state} /> },
    { id: 'by', header: 'Started by', width: '7rem', cell: (run) => run.by },
]

/** The bar alone: a search and the count on the first line, a filter on the line under it. */
export const Short: StoryObj = {
    render: () => (
        <ListingBar
            search={<SearchField value="" onChange={() => undefined} placeholder="Search" />}
            toolbar={<FilterChip facet="State" options={STATUS_OPTIONS} multiple />}
            count="24 runs"
        />
    ),
}

function TwoListings() {
    const [query, setQuery] = useState('')
    const [states, setStates] = useState<string[]>([])
    const keep = (run: TableRun) =>
        (query === '' || run.job.includes(query) || run.id.includes(query)) && (states.length === 0 || states.includes(run.state))
    const harbor = RUNS.filter((run) => run.project === 'harbor' && keep(run))
    const juniper = RUNS.filter((run) => run.project === 'juniper' && keep(run))
    return (
        <Stack gap="lg">
            <ListingBar
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                toolbar={<FilterChip facet="State" options={STATUS_OPTIONS} multiple selected={states} onSelectedChange={setStates} />}
                count={`${String(harbor.length + juniper.length)} runs`}
            />
            <Section title="harbor">
                <DataTable columns={COLUMNS} rows={harbor} rowKey={(run) => run.id} bar={false} empty="No run in harbor matches" />
            </Section>
            <Section title="juniper">
                <DataTable columns={COLUMNS} rows={juniper} rowKey={(run) => run.id} bar={false} empty="No run in juniper matches" />
            </Section>
        </Stack>
    )
}

/** One search and one filter narrowing the runs of two projects, each in a table of its own with no bar. */
export const TwoTables: StoryObj = { name: 'Two tables', render: () => <TwoListings /> }
