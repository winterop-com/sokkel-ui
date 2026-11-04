import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { StatusChip, type Status } from '../../components/StatusChip'
import { ScrollArea, ScrollBar } from '../../components/ui/scroll-area'

/** A region that scrolls with a thin drawn scrollbar, vertically, sideways, or both. */
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

const STATES: Status[] = ['succeeded', 'succeeded', 'failed', 'succeeded', 'running', 'succeeded', 'cancelled', 'succeeded']

const RUNS = Array.from({ length: 24 }, (_, at) => ({
    id: `01a1a5${(0xc6 - at).toString(16)}`,
    status: STATES[at % STATES.length],
    at: `2026-11-04 ${String(23 - at).padStart(2, '0')}:02`,
    took: `${(1 + ((at * 7) % 10) / 10).toFixed(1)}s`,
}))

const BLOCKS = [
    'http.get',
    'jq.assert',
    'jq.map',
    'dhis2.data-values',
    'dhis2.metadata',
    'fhir.bundle',
    'parquet.write',
    's3.put',
    'csv.read',
]

const meta: Meta = { title: 'Primitives/Layout/ScrollArea' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-start gap-6">
                <div className="flex w-full max-w-xs flex-col gap-2">
                    <Caption>vertical</Caption>
                    <ScrollArea className="h-64 rounded-lg border border-border">
                        <ul className="flex flex-col p-2 text-sm">
                            {RUNS.map((run) => (
                                <li key={run.id} className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="font-mono">{run.id}</span>
                                    <span className="ml-auto text-muted-foreground tabular-nums">{run.took}</span>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </div>
                <div className="flex w-full max-w-xs flex-col gap-2">
                    <Caption>horizontal</Caption>
                    <ScrollArea className="w-full rounded-lg border border-border">
                        <div className="flex w-max gap-2 p-3">
                            {BLOCKS.map((block) => (
                                <span key={block} className="rounded-md border border-border px-2 py-1 font-mono text-xs">
                                    {block}
                                </span>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
                <div className="flex w-full max-w-xs flex-col gap-2">
                    <Caption>short content, no scrollbar</Caption>
                    <ScrollArea className="h-64 rounded-lg border border-border">
                        <p className="p-3 text-sm text-muted-foreground">No runs of fhir-tour today.</p>
                    </ScrollArea>
                </div>
            </div>
        </Ground>
    ),
}

export const RunHistory: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-xl flex-col gap-2">
                <h2 className="text-sm font-medium">Runs of weather-gate today</h2>
                <ScrollArea className="h-80 rounded-lg border border-border">
                    <table className="w-full min-w-[28rem] text-sm">
                        <tbody>
                            {RUNS.map((run) => (
                                <tr key={run.id} className="border-b border-border last:border-0">
                                    <td className="px-3 py-2 font-mono">{run.id}</td>
                                    <td className="px-3 py-2">
                                        <StatusChip status={run.status} />
                                    </td>
                                    <td className="px-3 py-2 tabular-nums">{run.at}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{run.took}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
        </Ground>
    ),
}
