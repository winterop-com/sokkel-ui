import { Callout } from '@winterop-com/sokkel-ui/Callout'
import { DashboardGrid, DashboardPanel } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import type { FlowGroup } from '@winterop-com/sokkel-ui-tracking/network'
import { useMemo } from 'react'

import { clock, formatBytes, formatRate } from '../format'
import { SPANS, type Prefs } from '../model'
import { snapshotAt, type Snapshot, type WatchState } from '../watch'

/** The series colors the processes take in turn. */
const COLORS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']

/** The snapshots within `span` seconds up to `end`, at most one a second. */
function windowOf(state: WatchState, end: number, span: number): Snapshot[] {
    const from = end - span * 1000
    return state.history.filter((snapshot) => snapshot.at > from && snapshot.at <= end)
}

/** Each process's figure over the window, the busiest five named and the rest as Other. */
function byProcess(shown: readonly Snapshot[], figure: (group: FlowGroup) => number) {
    const totals = new Map<string, number>()
    for (const snapshot of shown)
        for (const group of snapshot.processes)
            totals.set(group.key || 'Unknown', (totals.get(group.key || 'Unknown') ?? 0) + figure(group))
    const named = [...totals]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, COLORS.length)
        .map(([name]) => name)
    const others = totals.size > named.length
    const series = named.map((name, index) => ({
        name,
        color: COLORS[index],
        stack: 'processes',
        values: shown.map((snapshot) => {
            const group = snapshot.processes.find((each) => (each.key || 'Unknown') === name)
            return group === undefined ? 0 : figure(group)
        }),
    }))
    if (others)
        series.push({
            name: 'Other',
            color: 'muted-foreground',
            stack: 'processes',
            values: shown.map((snapshot) =>
                snapshot.processes
                    .filter((group) => !named.includes(group.key || 'Unknown'))
                    .reduce((sum, group) => sum + figure(group), 0),
            ),
        })
    return series
}

function processColumns(metered: boolean): DataColumn<FlowGroup>[] {
    return [
        {
            id: 'process',
            header: 'Process',
            width: 'minmax(8rem,1fr)',
            cell: (group) => group.key || 'Unknown',
            sortValue: (group) => group.key,
        },
        {
            id: 'connections',
            header: 'Connections',
            width: '7rem',
            align: 'end',
            cell: (group) => group.connections,
            sortValue: (group) => group.connections,
            stack: 'secondary',
        },
        {
            id: 'hosts',
            header: 'Hosts',
            width: '5rem',
            align: 'end',
            cell: (group) => group.remoteAddresses.length,
            sortValue: (group) => group.remoteAddresses.length,
            stack: 'secondary',
        },
        ...(metered
            ? [
                  {
                      id: 'in',
                      header: 'In',
                      width: '7rem',
                      align: 'end' as const,
                      cell: (group: FlowGroup) => formatRate(group.rateIn),
                      sortValue: (group: FlowGroup) => group.rateIn,
                      stack: 'secondary' as const,
                  },
                  {
                      id: 'out',
                      header: 'Out',
                      width: '7rem',
                      align: 'end' as const,
                      cell: (group: FlowGroup) => formatRate(group.rateOut),
                      sortValue: (group: FlowGroup) => group.rateOut,
                      stack: 'secondary' as const,
                  },
              ]
            : []),
    ]
}

/**
 * Bytes a second in and out over the time chosen, for the whole machine and by process, with the
 * figures at the time shown and the processes then. The playback timeline at the foot moves the
 * time shown back; the charts end there. Read from this machine through lsof or netstat, which
 * count no bytes, the charts count connections instead.
 */
export function TrafficPage({
    state,
    shownAt,
    prefs,
    onSpan,
}: {
    state: WatchState
    shownAt: number | null
    prefs: Prefs
    onSpan: (span: number) => void
}) {
    const end = shownAt ?? state.at
    const shown = useMemo(() => windowOf(state, end, prefs.span), [state, end, prefs.span])
    const now = snapshotAt(state, shownAt)
    const x = useMemo(() => shown.map((snapshot) => clock(snapshot.at)), [shown])
    const metered = state.metered
    const totals = useMemo(
        () =>
            metered
                ? [
                      { name: 'In', color: 'chart-1', values: shown.map((snapshot) => snapshot.rateIn) },
                      { name: 'Out', color: 'chart-2', values: shown.map((snapshot) => snapshot.rateOut) },
                  ]
                : [{ name: 'Connections', color: 'chart-1', values: shown.map((snapshot) => snapshot.connections.length) }],
        [shown, metered],
    )
    const inByProcess = useMemo(() => byProcess(shown, (group) => (metered ? group.rateIn : group.connections)), [shown, metered])
    const outByProcess = useMemo(() => (metered ? byProcess(shown, (group) => group.rateOut) : []), [shown, metered])
    const peakIn = Math.max(0, ...shown.map((snapshot) => snapshot.rateIn))
    const peakOut = Math.max(0, ...shown.map((snapshot) => snapshot.rateOut))
    const span = SPANS.find((each) => each.value === prefs.span)?.label ?? `${String(prefs.span)} s`
    const every = Math.max(1, Math.round(shown.length / 6))

    return (
        <Stack gap="section">
            <PageHeader
                title="Traffic"
                count={shownAt === null ? `The last ${span}` : `${span} up to ${clock(shownAt)}`}
                actions={
                    <Segmented<string>
                        label="Time shown"
                        size="sm"
                        value={String(prefs.span)}
                        onValueChange={(value) => onSpan(Number(value))}
                        options={SPANS.map((each) => ({ value: String(each.value), label: each.label }))}
                    />
                }
            />
            {!metered && (
                <Callout tone="info" title="No byte counts from this machine">
                    lsof and netstat list sockets and their states, not the bytes they move, so the charts count connections in place of
                    rates.
                </Callout>
            )}
            <DashboardGrid>
                {metered ? (
                    <>
                        <StatPanel
                            title="In now"
                            value={now?.rateIn ?? null}
                            format={formatRate}
                            color="chart-1"
                            sparkline={totals[0].values}
                            span="quarter"
                        />
                        <StatPanel
                            title="Out now"
                            value={now?.rateOut ?? null}
                            format={formatRate}
                            color="chart-2"
                            sparkline={totals[1].values}
                            span="quarter"
                        />
                        <StatPanel title={`Peak in, ${span}`} value={peakIn} format={formatRate} color="chart-3" span="quarter" />
                        <StatPanel title={`Peak out, ${span}`} value={peakOut} format={formatRate} color="chart-4" span="quarter" />
                    </>
                ) : (
                    <>
                        <StatPanel title="Connections" value={now?.connections.length ?? null} color="chart-1" span="half" />
                        <StatPanel title="Remote hosts" value={now?.remotes.length ?? null} color="chart-2" span="half" />
                    </>
                )}
                <TimeSeriesPanel
                    title={metered ? 'Whole machine' : 'Connections'}
                    subtitle={metered ? 'bytes a second, in and out' : 'open at each reading'}
                    span="full"
                    x={x}
                    series={totals}
                    format={metered ? formatRate : undefined}
                    labelEvery={every}
                    bodyClassName="h-56"
                    legend="table"
                    legendStats={['max', 'avg', 'current']}
                    empty={shown.length === 0}
                    file="traffic-total"
                />
                <TimeSeriesPanel
                    title={metered ? 'In by process' : 'Connections by process'}
                    subtitle={metered ? 'bytes a second received' : 'open at each reading'}
                    span={metered ? 'half' : 'full'}
                    x={x}
                    series={inByProcess}
                    stacked
                    format={metered ? formatRate : undefined}
                    labelEvery={every}
                    bodyClassName="h-56"
                    empty={shown.length === 0}
                    file="traffic-in"
                />
                {metered && (
                    <TimeSeriesPanel
                        title="Out by process"
                        subtitle="bytes a second sent"
                        span="half"
                        x={x}
                        series={outByProcess}
                        stacked
                        format={formatRate}
                        labelEvery={every}
                        bodyClassName="h-56"
                        empty={shown.length === 0}
                        file="traffic-out"
                    />
                )}
                <DashboardPanel title="Processes" subtitle={shownAt === null ? 'now' : `at ${clock(shownAt)}`} span="full" flush>
                    <DataTable
                        variant="list"
                        framed={false}
                        columns={processColumns(metered)}
                        rows={now?.processes ?? []}
                        rowKey={(group) => group.key || 'unknown'}
                        defaultSort={{ column: metered ? 'in' : 'connections', direction: 'desc' }}
                        minWidth="auto"
                        foot={
                            metered && now !== undefined
                                ? `${formatBytes(now.processes.reduce((sum, group) => sum + group.bytesIn + group.bytesOut, 0))} moved in the last 10 seconds`
                                : undefined
                        }
                        empty="No process has a connection open."
                    />
                </DashboardPanel>
            </DashboardGrid>
        </Stack>
    )
}
