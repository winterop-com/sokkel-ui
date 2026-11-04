import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import {
    type ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '../../components/ui/chart'

/**
 * Recharts drawn in the chart tokens: a container that names each series' label and color, a
 * tooltip and a legend in the library's type. Every chart here has fixed data and no animation.
 */
function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

/** Seconds a run of weather-gate took, per day, from 2026-10-22 to 2026-11-04. */
const DURATIONS = [
    { day: '10-22', median: 1.2, p95: 1.9, runs: 24, failed: 0 },
    { day: '10-23', median: 1.3, p95: 2.1, runs: 24, failed: 1 },
    { day: '10-24', median: 1.1, p95: 1.8, runs: 24, failed: 0 },
    { day: '10-25', median: 1.2, p95: 2.0, runs: 24, failed: 0 },
    { day: '10-26', median: 1.4, p95: 2.6, runs: 23, failed: 2 },
    { day: '10-27', median: 1.2, p95: 1.9, runs: 24, failed: 0 },
    { day: '10-28', median: 1.0, p95: 1.6, runs: 24, failed: 0 },
    { day: '10-29', median: 1.1, p95: 1.7, runs: 24, failed: 0 },
    { day: '10-30', median: 1.6, p95: 3.4, runs: 22, failed: 3 },
    { day: '10-31', median: 1.3, p95: 2.2, runs: 24, failed: 1 },
    { day: '11-01', median: 1.2, p95: 1.9, runs: 24, failed: 0 },
    { day: '11-02', median: 1.1, p95: 1.8, runs: 24, failed: 0 },
    { day: '11-03', median: 1.2, p95: 2.0, runs: 24, failed: 0 },
    { day: '11-04', median: 1.5, p95: 2.9, runs: 15, failed: 4 },
]

const DURATION_CONFIG = {
    median: { label: 'Median', color: 'var(--chart-2)' },
    p95: { label: 'p95', color: 'var(--chart-1)' },
} satisfies ChartConfig

const RUNS_CONFIG = {
    runs: { label: 'Runs', color: 'var(--chart-3)' },
    failed: { label: 'Failed', color: 'var(--chart-5)' },
} satisfies ChartConfig

const seconds = (value: number) => `${value}s`

const meta: Meta = { title: 'Primitives/Data/Chart' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="grid gap-8 md:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
                    <Caption>bar</Caption>
                    <ChartContainer config={RUNS_CONFIG} className="h-56 w-full">
                        <BarChart data={DURATIONS} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                            <Bar dataKey="runs" fill="var(--color-runs)" radius={3} isAnimationActive={false} />
                        </BarChart>
                    </ChartContainer>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    <Caption>stacked bar, with legend</Caption>
                    <ChartContainer config={RUNS_CONFIG} className="h-56 w-full">
                        <BarChart data={DURATIONS.map((d) => ({ ...d, runs: d.runs - d.failed }))} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                            <Bar dataKey="runs" stackId="a" fill="var(--color-runs)" isAnimationActive={false} />
                            <Bar dataKey="failed" stackId="a" fill="var(--color-failed)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                            <ChartLegend content={<ChartLegendContent />} />
                        </BarChart>
                    </ChartContainer>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    <Caption>line</Caption>
                    <ChartContainer config={DURATION_CONFIG} className="h-56 w-full">
                        <LineChart data={DURATIONS} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                width={40}
                                domain={[0, 4]}
                                ticks={[0, 1, 2, 3, 4]}
                                tickFormatter={seconds}
                            />
                            <Line dataKey="median" stroke="var(--color-median)" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line dataKey="p95" stroke="var(--color-p95)" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                    </ChartContainer>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    <Caption>area</Caption>
                    <ChartContainer config={DURATION_CONFIG} className="h-56 w-full">
                        <AreaChart data={DURATIONS} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                            <Area
                                dataKey="median"
                                type="monotone"
                                stroke="var(--color-median)"
                                fill="var(--color-median)"
                                fillOpacity={0.25}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ChartContainer>
                </div>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="grid gap-8 md:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
                    <Caption>empty, no runs in the window</Caption>
                    <div className="relative">
                        <ChartContainer config={RUNS_CONFIG} className="h-56 w-full">
                            <BarChart data={[]} accessibilityLayer>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                                <Bar dataKey="runs" fill="var(--color-runs)" isAnimationActive={false} />
                            </BarChart>
                        </ChartContainer>
                        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                            No runs between 2026-10-22 and 2026-11-04.
                        </p>
                    </div>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    <Caption>tooltip shown on a fixed day</Caption>
                    <ChartContainer config={DURATION_CONFIG} className="h-56 w-full">
                        <BarChart data={DURATIONS} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                            <ChartTooltip content={<ChartTooltipContent />} defaultIndex={8} active isAnimationActive={false} />
                            <Bar dataKey="median" fill="var(--color-median)" radius={3} isAnimationActive={false} />
                            <Bar dataKey="p95" fill="var(--color-p95)" radius={3} isAnimationActive={false} />
                        </BarChart>
                    </ChartContainer>
                </div>
            </div>
        </Ground>
    ),
}

export const RunDurations: StoryObj = {
    render: () => (
        <Ground>
            <section className="max-w-3xl rounded-lg border border-border p-4">
                <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                        <h2 className="text-sm font-medium">Run durations</h2>
                        <p className="font-mono text-xs text-muted-foreground">weather-gate</p>
                    </div>
                    <p className="text-xs text-muted-foreground">2026-10-22 to 2026-11-04, 14 days, 324 runs</p>
                </header>
                <ChartContainer config={DURATION_CONFIG} className="h-64 w-full">
                    <BarChart data={DURATIONS} accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            width={40}
                            domain={[0, 4]}
                            ticks={[0, 1, 2, 3, 4]}
                            tickFormatter={seconds}
                        />
                        <ChartTooltip
                            content={<ChartTooltipContent indicator="line" />}
                            defaultIndex={8}
                            active
                            isAnimationActive={false}
                        />
                        <Bar dataKey="median" fill="var(--color-median)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                        <Bar dataKey="p95" fill="var(--color-p95)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                        <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                </ChartContainer>
            </section>
        </Ground>
    ),
}
