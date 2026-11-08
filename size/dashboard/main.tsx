/** A dashboard app: Tidevann's job runs board, with stat and chart panels on ECharts, the range controls and a table of runs. */

import './styles.css'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import { BarPanel } from '@winterop-com/sokkel-ui-charts/dashboard/BarPanel'
import { DashboardRow } from '@winterop-com/sokkel-ui/dashboard/DashboardRow'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import type { Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'
import { RefreshControl, TimeRangePicker, type TimeRangeValue } from '@winterop-com/sokkel-ui/dashboard/TimeRange'
import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import { VariablesBar, type Variable } from '@winterop-com/sokkel-ui/dashboard/VariablesBar'
import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { type Status, StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Gauge, ListChecks } from 'lucide-react'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

const GROUPS: RailGroup[] = [
    {
        id: 'work',
        entries: [
            { id: 'jobs', label: 'Jobs', icon: ListChecks, href: '#' },
            { id: 'dashboards', label: 'Dashboards', icon: Gauge, href: '#', active: true },
        ],
    },
]

const HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)
const RUNS = HOURS.map((_, hour) => 40 + ((hour * 7) % 23))
const FAILURES = HOURS.map((_, hour) => (hour * 5) % 4)
const SUCCESS: Threshold[] = [{ color: 'critical' }, { value: 95, color: 'warning' }, { value: 98, color: 'good' }]
const STEP_ROWS = HOURS.map((time, hour) => ({ time, Runs: RUNS[hour], Failures: FAILURES[hour] }))

interface Run {
    id: string
    job: string
    state: Status
}

const TABLE: Run[] = [
    { id: 'r-1041', job: 'nightly-export', state: 'succeeded' },
    { id: 'r-1042', job: 'sync-inventory', state: 'failed' },
    { id: 'r-1043', job: 'rebuild-index', state: 'running' },
    { id: 'r-1044', job: 'send-digest', state: 'queued' },
]

const COLUMNS: DataColumn<Run>[] = [
    { id: 'id', header: 'Run', width: '8rem', cell: (run) => run.id, sortValue: (run) => run.id },
    { id: 'job', header: 'Job', width: 'minmax(10rem,1fr)', cell: (run) => run.job, sortValue: (run) => run.job },
    { id: 'state', header: 'State', width: '8rem', cell: (run) => <StatusChip status={run.state} /> },
]

function App() {
    const [range, setRange] = useState<TimeRangeValue>({ preset: '24h' })
    const [project, setProject] = useState('all')
    const [every, setEvery] = useState(0)
    const variables: Variable[] = [
        {
            kind: 'select',
            id: 'project',
            label: 'project',
            value: project,
            options: ['all', 'harbor', 'juniper', 'larkspur'].map((value) => ({ value, label: value })),
            onChange: setProject,
        },
    ]
    const controls = (
        <>
            <TimeRangePicker value={range} onChange={setRange} />
            <RefreshControl onRefresh={() => undefined} interval={every} onIntervalChange={setEvery} />
        </>
    )
    return (
        <TooltipProvider>
            <Shell
                rail={<Rail name="Tidevann" groups={GROUPS} foot={<AccountMenu name="ada" where="tidevann.example.org" />} />}
                top={<TopBar trail={[{ label: 'Dashboards', href: '#' }, { label: 'Job runs' }]} />}
            >
                <Page>
                    <VariablesBar variables={variables} end={controls} />
                    <DashboardRow title="Overview" count={5}>
                        <StatPanel title="Success rate" value={98.4} unit="%" decimals={1} thresholds={SUCCESS} sparkline={RUNS} />
                        <StatPanel title="Runs" value={1203} color="chart-2" sparkline={RUNS} delta="+4.2%" good />
                        <TimeSeriesPanel
                            title="Runs and failures"
                            span="two-thirds"
                            x={HOURS}
                            series={[
                                { name: 'Runs', values: RUNS },
                                { name: 'Failures', values: FAILURES, color: 'status-failed' },
                            ]}
                        />
                        <BarPanel title="Failures" span="third" x={HOURS} series={[{ name: 'Failures', values: FAILURES }]} />
                    </DashboardRow>
                    <DashboardRow title="Runs" count={2}>
                        <ChartFrame title="Runs by hour">
                            {(state) => (
                                <Chart kind="line" label="Runs by hour" rows={STEP_ROWS} x="time" y={['Runs', 'Failures']} {...state} />
                            )}
                        </ChartFrame>
                        <DataTable variant="list" columns={COLUMNS} rows={TABLE} rowKey={(run) => run.id} />
                    </DashboardRow>
                </Page>
            </Shell>
        </TooltipProvider>
    )
}

const root = document.getElementById('root')
if (root === null) throw new Error('No #root element')
createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
