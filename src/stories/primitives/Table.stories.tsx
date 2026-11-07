import { StatusChip } from '../../components/StatusChip'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Stack } from '../../components/Layout'

const meta: Meta = { title: 'Primitives/Display/Table', parameters: { frame: 'column' } }
export default meta

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
        <Stack gap="sm" className="max-w-xl">
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
        </Stack>
    ),
}

export const Empty: StoryObj = {
    render: () => (
        <Stack gap="sm">
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
        </Stack>
    ),
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
                            <StatusChip status={state} />
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
    ),
}
