import type { Meta, StoryObj } from '@storybook/react-vite'

import { Badge } from '../../components/ui/badge'
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../../components/ui/table'

const meta: Meta = { title: 'Primitives/Display/Table' }
export default meta

function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

const FILES = [
    ['orders-2026-08.csv', '9,812', '2.1 MB'],
    ['orders-2026-09.csv', '10,240', '2.2 MB'],
    ['orders-2026-10.csv', '11,006', '2.4 MB'],
] as const

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-xl flex-col gap-2">
                <Caption>plain, with caption and footer</Caption>
                <Table>
                    <TableCaption>Files in the harbor archive.</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead>File</TableHead>
                            <TableHead className="text-right">Rows</TableHead>
                            <TableHead className="text-right">Size</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {FILES.map(([file, rows, size], at) => (
                            <TableRow key={file} data-state={at === 1 ? 'selected' : undefined}>
                                <TableCell className="font-mono">{file}</TableCell>
                                <TableCell className="text-right tabular-nums">{rows}</TableCell>
                                <TableCell className="text-right tabular-nums">{size}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right tabular-nums">31,058</TableCell>
                            <TableCell className="text-right tabular-nums">6.7 MB</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
                <Caption>the middle row is selected (data-state="selected")</Caption>
            </div>
        </Ground>
    ),
}

export const Empty: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-col gap-2">
                <Caption>no rows</Caption>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Job</TableHead>
                            <TableHead>State</TableHead>
                            <TableHead className="text-right">Duration</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                No runs yet.
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </Ground>
    ),
}

const TONE: Record<string, string> = {
    succeeded: 'bg-status-succeeded/15 text-status-succeeded-ink',
    failed: 'bg-status-failed/15 text-status-failed-ink',
    running: 'bg-status-running/15 text-status-running-ink',
    queued: 'bg-status-queued/15 text-status-queued-ink',
    cancelled: 'bg-status-cancelled/15 text-status-cancelled-ink',
}

const RUNS = [
    ['rebuild-index', 'running', 'grace', '2026-11-04 14:05', ''],
    ['send-digest', 'queued', 'schedule', '2026-11-04 14:06', ''],
    ['nightly-export', 'succeeded', 'schedule', '2026-11-04 02:00', '1.2s'],
    ['sync-inventory', 'failed', 'ada', '2026-11-04 13:45', '0.3s'],
    ['rebuild-index', 'succeeded', 'linus', '2026-11-04 12:10', '48.7s'],
    ['sync-inventory', 'cancelled', 'margaret', '2026-11-04 11:30', '4.0s'],
    ['nightly-export', 'succeeded', 'schedule', '2026-11-03 02:00', '12.0s'],
] as const

export const Runs: StoryObj = {
    render: () => (
        <Ground>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Started by</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {RUNS.map(([job, state, by, started, duration], at) => (
                        <TableRow key={at}>
                            <TableCell className="font-mono">{job}</TableCell>
                            <TableCell>
                                <Badge className={TONE[state]}>{state}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{by}</TableCell>
                            <TableCell className="text-muted-foreground tabular-nums">{started}</TableCell>
                            <TableCell className="text-right tabular-nums">
                                {duration === '' ? <span className="text-muted-foreground">-</span> : duration}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Ground>
    ),
}
