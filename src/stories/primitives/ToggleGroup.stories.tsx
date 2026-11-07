import type { Meta, StoryObj } from '@storybook/react-vite'
import { LayoutGrid, List, Rows3 } from 'lucide-react'
import { useState } from 'react'

import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { ToggleGroup, ToggleGroupItem } from '@winterop-com/sokkel-ui/primitives/toggle-group'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Specimen } from '../fixtures/Specimen'

function Views(props: React.ComponentProps<typeof ToggleGroup>) {
    return (
        <ToggleGroup defaultValue={['list']} {...props}>
            <ToggleGroupItem value="list" aria-label="List">
                <List />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table">
                <Rows3 />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid">
                <LayoutGrid />
            </ToggleGroupItem>
        </ToggleGroup>
    )
}

const meta: Meta = { title: 'Primitives/Actions/ToggleGroup', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="start" wrap>
            <Specimen label="default">
                <Views />
            </Specimen>
            <Specimen label="outline">
                <Views variant="outline" />
            </Specimen>
            <Specimen label="outline spacing 0">
                <Views variant="outline" spacing={0} />
            </Specimen>
            <Specimen label="sm">
                <Views variant="outline" size="sm" />
            </Specimen>
            <Specimen label="lg">
                <Views variant="outline" size="lg" />
            </Specimen>
            <Specimen label="vertical">
                <Views variant="outline" orientation="vertical" spacing={0} />
            </Specimen>
            <Specimen label="multiple">
                <ToggleGroup variant="outline" multiple defaultValue={['succeeded', 'failed']}>
                    <ToggleGroupItem value="succeeded">Succeeded</ToggleGroupItem>
                    <ToggleGroupItem value="failed">Failed</ToggleGroupItem>
                    <ToggleGroupItem value="running">Running</ToggleGroupItem>
                </ToggleGroup>
            </Specimen>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Specimen label="disabled group">
                <Views variant="outline" disabled />
            </Specimen>
            <Specimen label="one item disabled">
                <ToggleGroup variant="outline" defaultValue={['day']}>
                    <ToggleGroupItem value="day">Day</ToggleGroupItem>
                    <ToggleGroupItem value="week">Week</ToggleGroupItem>
                    <ToggleGroupItem value="month" disabled>
                        Month
                    </ToggleGroupItem>
                </ToggleGroup>
            </Specimen>
            <Specimen label="nothing pressed">
                <Views variant="outline" defaultValue={[]} />
            </Specimen>
        </Row>
    ),
}

interface Run {
    id: string
    state: Status
    at: string
    took: string
}

const RUNS: Run[] = [
    { id: '01a1a5c6', state: 'succeeded', at: '2026-11-04 14:02', took: '1.2s' },
    { id: '01a1a5c2', state: 'failed', at: '2026-11-04 13:58', took: '0.3s' },
    { id: '01a1a5c0', state: 'running', at: '2026-11-04 13:55', took: '' },
    { id: '01a1a5b1', state: 'succeeded', at: '2026-11-04 13:50', took: '8.2s' },
]

const COLUMNS: DataColumn<Run>[] = [
    { id: 'id', header: 'Run', width: '6rem', cell: (run) => <span className="font-mono text-xs">{run.id}</span> },
    { id: 'state', header: 'State', width: '6.5rem', cell: (run) => <StatusChip status={run.state} /> },
    {
        id: 'at',
        header: 'Started',
        width: 'minmax(0,1fr)',
        cell: (run) => <span className="text-muted-foreground tabular-nums">{run.at}</span>,
    },
    {
        id: 'took',
        header: 'Took',
        width: '3rem',
        align: 'end',
        cell: (run) => <span className="text-muted-foreground tabular-nums">{run.took === '' ? '-' : run.took}</span>,
    },
]

function RunFilter() {
    const [states, setStates] = useState<string[]>(['succeeded', 'failed', 'running'])
    const shown = RUNS.filter((run) => states.includes(run.state))
    return (
        <Stack>
            <Row gap="md" justify="between" wrap>
                <p className="text-sm font-medium">Runs of import-orders</p>
                <ToggleGroup variant="outline" size="sm" spacing={0} multiple value={states} onValueChange={setStates}>
                    <ToggleGroupItem value="succeeded">Succeeded</ToggleGroupItem>
                    <ToggleGroupItem value="failed">Failed</ToggleGroupItem>
                    <ToggleGroupItem value="running">Running</ToggleGroupItem>
                </ToggleGroup>
            </Row>
            <DataTable variant="list" columns={COLUMNS} rows={shown} rowKey={(run) => run.id} words={{ empty: 'No runs match.' }} />
        </Stack>
    )
}

export const RunStateFilter: StoryObj = { render: () => <RunFilter /> }
