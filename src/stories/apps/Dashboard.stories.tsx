import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { CheckList } from '../../components/CheckList'
import { DashboardGrid, DashboardPanel, KpiRow } from '../../components/dashboard/DashboardGrid'
import { RefreshControl, TimeRangePicker, type TimeRangeValue } from '../../components/dashboard/TimeRange'
import { LogView } from '../../components/LogView'
import { Sparkline } from '../../components/Stat'
import { StatusChip, type Status } from '../../components/StatusChip'
import { Timeline } from '../../components/Timeline'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart'
import { DropdownMenuItem } from '../../components/ui/dropdown-menu'
import { TooltipProvider } from '../../components/ui/tooltip'

/**
 * A dashboard from the library's parts: key figures across the top, panels of one to three widths
 * in a grid, the range and refresh controls in the head, and panels in their loading and empty
 * states.
 */
const DAYS = ['Oct 29', 'Oct 30', 'Oct 31', 'Nov 1', 'Nov 2', 'Nov 3', 'Nov 4']
const BY_DAY = DAYS.map((day, index) => ({
    day,
    succeeded: [212, 230, 198, 241, 255, 249, 262][index],
    failed: [9, 6, 12, 4, 5, 7, 3][index],
}))
const CONFIG = {
    succeeded: { label: 'Succeeded', color: 'var(--status-succeeded)' },
    failed: { label: 'Failed', color: 'var(--status-failed)' },
} satisfies ChartConfig

const RUNS: { job: string; state: Status; took: string }[] = [
    { job: 'import-orders', state: 'running', took: '1m 12s' },
    { job: 'nightly-export', state: 'failed', took: '4.2s' },
    { job: 'rebuild-index', state: 'succeeded', took: '6m 03s' },
    { job: 'send-digest', state: 'succeeded', took: '12.8s' },
    { job: 'sync-inventory', state: 'queued', took: '-' },
]

function Head({ range, onRange }: { range: TimeRangeValue; onRange: (value: TimeRangeValue) => void }) {
    const [interval, setInterval] = useState(60)
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h1 className="text-page font-semibold">Overview</h1>
                <p className="text-sm text-muted-foreground">atlas, every job</p>
            </div>
            <div className="flex items-center gap-2">
                <RefreshControl
                    onRefresh={() => undefined}
                    interval={interval}
                    onIntervalChange={setInterval}
                    updated="updated 2 min ago"
                />
                <TimeRangePicker value={range} onChange={onRange} defaultMonth={new Date(2026, 9, 1)} today={new Date(2026, 9, 20)} />
            </div>
        </div>
    )
}

function Dashboard() {
    const [range, setRange] = useState<TimeRangeValue>({ preset: '7d' })
    return (
        <TooltipProvider>
            <div className="min-h-svh bg-background p-6 text-foreground">
                <div className="mx-auto flex max-w-7xl flex-col gap-(--density-section-gap)">
                    <Head range={range} onRange={setRange} />
                    <KpiRow
                        items={[
                            {
                                id: 'runs',
                                label: 'Runs',
                                value: '1,847',
                                change: '+6%',
                                good: true,
                                note: 'vs the week before',
                                trend: <Sparkline values={BY_DAY.map((d) => d.succeeded)} label="Runs per day" />,
                            },
                            {
                                id: 'failed',
                                label: 'Failure rate',
                                value: '2.5',
                                unit: '%',
                                change: '-0.8',
                                good: true,
                                note: 'vs the week before',
                                trend: <Sparkline values={BY_DAY.map((d) => d.failed)} tone="good" label="Failures per day" />,
                            },
                            { id: 'median', label: 'Median duration', value: '4.2', unit: 's', change: '+0.6s', good: false, note: 'p50' },
                            { id: 'jobs', label: 'Jobs', value: '18', note: '3 paused' },
                        ]}
                    />
                    <DashboardGrid>
                        <DashboardPanel
                            title="Runs by day"
                            subtitle="last 7 days"
                            span="two-thirds"
                            expandable
                            menu={
                                <>
                                    <DropdownMenuItem>Export as CSV</DropdownMenuItem>
                                    <DropdownMenuItem>Open runs</DropdownMenuItem>
                                </>
                            }
                        >
                            <ChartContainer config={CONFIG} className="h-56 w-full">
                                <BarChart data={BY_DAY} accessibilityLayer>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis tickLine={false} axisLine={false} width={32} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="succeeded" stackId="runs" fill="var(--color-succeeded)" isAnimationActive={false} />
                                    <Bar
                                        dataKey="failed"
                                        stackId="runs"
                                        fill="var(--color-failed)"
                                        radius={[3, 3, 0, 0]}
                                        isAnimationActive={false}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </DashboardPanel>
                        <DashboardPanel title="Health" span="third" flush>
                            <CheckList
                                checks={[
                                    { name: 'API', status: 'ok', detail: 'p95 182ms' },
                                    { name: 'Worker', status: 'warn', detail: 'queue depth 41', hint: 'Two runs are waiting for a slot.' },
                                    { name: 'Scheduler', status: 'ok', detail: 'last tick 4s ago' },
                                ]}
                            />
                        </DashboardPanel>
                        <DashboardPanel title="Latest runs" span="half" flush footer="5 of 248 today">
                            <ul className="divide-y divide-border">
                                {RUNS.map((run) => (
                                    <li
                                        key={run.job + run.state}
                                        className="grid grid-cols-[minmax(0,1fr)_7rem_4rem] items-center gap-3 px-3 py-2 text-sm"
                                    >
                                        <span className="truncate font-mono">{run.job}</span>
                                        <span>
                                            <StatusChip status={run.state} />
                                        </span>
                                        <span className="text-right text-muted-foreground tabular-nums">{run.took}</span>
                                    </li>
                                ))}
                            </ul>
                        </DashboardPanel>
                        <DashboardPanel title="Activity" span="half">
                            <Timeline
                                events={[
                                    { id: '1', title: 'ada paused send-digest', at: '13:40' },
                                    { id: '2', title: 'nightly-export failed at validate', at: '02:00', tone: 'failed' },
                                    { id: '3', title: 'grace added the job sync-inventory', at: 'yesterday' },
                                ]}
                            />
                        </DashboardPanel>
                        <DashboardPanel title="Worker log" subtitle="live" span="two-thirds" loading flush>
                            <LogView
                                className="m-3"
                                lines={[
                                    { at: '14:02:11', level: 'info', source: 'worker', text: 'picked up import-orders' },
                                    { at: '14:02:12', level: 'info', source: 'worker', text: 'read 4,912 rows' },
                                    { at: '14:02:13', level: 'warning', source: 'worker', text: 'queue depth 41' },
                                ]}
                            />
                        </DashboardPanel>
                        <DashboardPanel title="Cancelled runs" subtitle="last 7 days" span="third" empty />
                    </DashboardGrid>
                </div>
            </div>
        </TooltipProvider>
    )
}

function Picker() {
    const [range, setRange] = useState<TimeRangeValue>({ preset: '24h' })
    return (
        <div className="flex min-h-svh justify-end bg-background p-6 text-foreground">
            <TimeRangePicker value={range} onChange={setRange} defaultMonth={new Date(2026, 9, 1)} today={new Date(2026, 9, 20)} open />
        </div>
    )
}

const meta: Meta = { title: 'Apps/Dashboard' }
export default meta

export const Overview: StoryObj = { render: () => <Dashboard /> }
export const TimeRange: StoryObj = { name: 'Time range', render: () => <Picker /> }
