import type { Meta, StoryObj } from '@storybook/react-vite'
import { Search } from 'lucide-react'

import type { ChartLook } from '../../components/chart/look'
import { EChart } from '../../components/chart/EChart'
import { StatusChip, type Status } from '../../components/StatusChip'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * The same small piece of Tidevann every gallery tile shows a theme with: a heading, buttons, a
 * field, the run states, a short table and a bar chart. It fits a narrow tile and grows with it.
 */
const meta: Meta = { title: 'Themes/Sample' }
export default meta

const ROWS: { job: string; state: Status; took: string }[] = [
    { job: 'nightly-export', state: 'failed', took: '4.2s' },
    { job: 'rebuild-index', state: 'succeeded', took: '6m 03s' },
    { job: 'import-orders', state: 'running', took: '1m 12s' },
]

const HOURS = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22']
const RUNS = [12, 18, 9, 7, 14, 22, 26, 31, 24, 19, 15, 11]
const FAILED = [1, 0, 2, 0, 1, 3, 1, 0, 2, 1, 0, 1]

const BARS = (look: ChartLook) => ({
    grid: { left: 2, right: 2, top: 6, bottom: 2 },
    xAxis: { type: 'category', data: HOURS, axisLabel: { interval: 2 } },
    yAxis: { type: 'value', splitNumber: 2 },
    series: [
        { name: 'Runs', type: 'bar', stack: 'runs', data: RUNS, color: look.token('chart-2') },
        { name: 'Failed', type: 'bar', stack: 'runs', data: FAILED, color: look.token('status-failed') },
    ],
})

/** The tile's content, in whatever theme the document wears. */
function ThemeSample() {
    return (
        <div className="min-h-svh bg-background p-3 text-foreground">
            <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
                <div className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <TidevannMark />
                    </span>
                    <div className="min-w-0">
                        <h1 className="truncate text-sm font-semibold">Tidevann</h1>
                        <p className="truncate text-xs text-muted-foreground">harbor, 248 runs today</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <Button size="sm">Run</Button>
                    <Button size="sm" variant="secondary">
                        Pause
                    </Button>
                    <Button size="sm" variant="outline">
                        Edit
                    </Button>
                    <Button size="sm" variant="destructive">
                        Stop
                    </Button>
                </div>
                <div className="relative">
                    <Search
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input aria-label="Search runs" placeholder="Search runs" className="pl-8" />
                </div>
                <div className="flex flex-wrap gap-1">
                    <StatusChip status="succeeded" />
                    <StatusChip status="failed" />
                    <StatusChip status="running" />
                    <StatusChip status="queued" />
                    <StatusChip status="cancelled" />
                </div>
                <div className="overflow-hidden rounded-surface border border-border-strong bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Job</TableHead>
                                <TableHead>State</TableHead>
                                <TableHead className="text-right">Took</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ROWS.map((row) => (
                                <TableRow key={row.job}>
                                    <TableCell className="font-mono text-xs">{row.job}</TableCell>
                                    <TableCell>
                                        <StatusChip status={row.state} />
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{row.took}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="h-24 rounded-surface border border-border-strong bg-card p-2">
                    <EChart option={BARS} label="Runs and failures by hour" />
                </div>
            </div>
        </div>
    )
}

/** The sample in the toolbar's look. */
export const Sample: StoryObj = { render: () => <ThemeSample /> }
