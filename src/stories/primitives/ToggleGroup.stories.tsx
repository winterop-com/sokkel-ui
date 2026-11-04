import type { Meta, StoryObj } from '@storybook/react-vite'
import { LayoutGrid, List, Rows3 } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

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

const meta: Meta = { title: 'Primitives/Actions/ToggleGroup' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-start gap-6">
                <Labeled label="default">
                    <Views />
                </Labeled>
                <Labeled label="outline">
                    <Views variant="outline" />
                </Labeled>
                <Labeled label="outline spacing 0">
                    <Views variant="outline" spacing={0} />
                </Labeled>
                <Labeled label="sm">
                    <Views variant="outline" size="sm" />
                </Labeled>
                <Labeled label="lg">
                    <Views variant="outline" size="lg" />
                </Labeled>
                <Labeled label="vertical">
                    <Views variant="outline" orientation="vertical" spacing={0} />
                </Labeled>
                <Labeled label="multiple">
                    <ToggleGroup variant="outline" multiple defaultValue={['succeeded', 'failed']}>
                        <ToggleGroupItem value="succeeded">Succeeded</ToggleGroupItem>
                        <ToggleGroupItem value="failed">Failed</ToggleGroupItem>
                        <ToggleGroupItem value="running">Running</ToggleGroupItem>
                    </ToggleGroup>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <Labeled label="disabled group">
                    <Views variant="outline" disabled />
                </Labeled>
                <Labeled label="one item disabled">
                    <ToggleGroup variant="outline" defaultValue={['day']}>
                        <ToggleGroupItem value="day">Day</ToggleGroupItem>
                        <ToggleGroupItem value="week">Week</ToggleGroupItem>
                        <ToggleGroupItem value="month" disabled>
                            Month
                        </ToggleGroupItem>
                    </ToggleGroup>
                </Labeled>
                <Labeled label="nothing pressed">
                    <Views variant="outline" defaultValue={[]} />
                </Labeled>
            </div>
        </Ground>
    ),
}

const RUNS = [
    { id: '01a1a5c6', state: 'succeeded', at: '2026-11-04 14:02', took: '1.2s' },
    { id: '01a1a5c2', state: 'failed', at: '2026-11-04 13:58', took: '0.3s' },
    { id: '01a1a5c0', state: 'running', at: '2026-11-04 13:55', took: '' },
    { id: '01a1a5b1', state: 'succeeded', at: '2026-11-04 13:50', took: '8.2s' },
]

function RunFilter() {
    const [states, setStates] = useState<string[]>(['succeeded', 'failed', 'running'])
    const shown = RUNS.filter((run) => states.includes(run.state))
    return (
        <Ground>
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium">Runs of weather-gate</p>
                    <ToggleGroup variant="outline" size="sm" spacing={0} multiple value={states} onValueChange={setStates}>
                        <ToggleGroupItem value="succeeded">Succeeded</ToggleGroupItem>
                        <ToggleGroupItem value="failed">Failed</ToggleGroupItem>
                        <ToggleGroupItem value="running">Running</ToggleGroupItem>
                    </ToggleGroup>
                </div>
                <ul className="divide-y divide-border rounded-lg border border-border">
                    {shown.map((run) => (
                        <li key={run.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span className="font-mono text-xs">{run.id}</span>
                            <span>{run.state}</span>
                            <span className="text-muted-foreground">{run.at}</span>
                            <span className="w-10 text-right text-muted-foreground tabular-nums">{run.took}</span>
                        </li>
                    ))}
                    {shown.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">No runs match.</li>}
                </ul>
            </div>
        </Ground>
    )
}

export const RunStateFilter: StoryObj = { render: () => <RunFilter /> }
