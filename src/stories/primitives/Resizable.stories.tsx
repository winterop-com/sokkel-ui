import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@winterop-com/sokkel-ui/primitives/resizable'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { LogView, type LogLine } from '@winterop-com/sokkel-ui/LogView'
import { Surface } from '@winterop-com/sokkel-ui/Section'

/** Panels with a handle between them that drags to share the space, side by side or stacked. */
function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

function Fill({ children }: { children: ReactNode }) {
    return (
        <Row gap="none" justify="center" className="h-full p-4 text-sm text-muted-foreground">
            {children}
        </Row>
    )
}

const meta: Meta = { title: 'Primitives/Layout/Resizable', parameters: { frame: 'column' } }
export default meta

/** Panels split across, with a grip, split down with a grip, and with a handle that does not move. */
export const Variants: StoryObj = {
    render: () => (
        <>
            <Stack gap="sm">
                <Caption>horizontal</Caption>
                <Surface className="h-40">
                    <ResizablePanelGroup orientation="horizontal">
                        <ResizablePanel defaultSize="40">
                            <Fill>40%</Fill>
                        </ResizablePanel>
                        <ResizableHandle />
                        <ResizablePanel defaultSize="60">
                            <Fill>60%</Fill>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </Surface>
            </Stack>
            <Stack gap="sm">
                <Caption>horizontal, with a grip</Caption>
                <Surface className="h-40">
                    <ResizablePanelGroup orientation="horizontal">
                        <ResizablePanel defaultSize="50">
                            <Fill>50%</Fill>
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize="50">
                            <Fill>50%</Fill>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </Surface>
            </Stack>
            <Stack gap="sm">
                <Caption>vertical, with a grip</Caption>
                <Surface className="h-64">
                    <ResizablePanelGroup orientation="vertical">
                        <ResizablePanel defaultSize="30">
                            <Fill>30%</Fill>
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize="70">
                            <Fill>70%</Fill>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </Surface>
            </Stack>
            <Stack gap="sm">
                <Caption>disabled handle</Caption>
                <Surface className="h-40">
                    <ResizablePanelGroup orientation="horizontal">
                        <ResizablePanel defaultSize="50">
                            <Fill>fixed</Fill>
                        </ResizablePanel>
                        <ResizableHandle withHandle disabled />
                        <ResizablePanel defaultSize="50">
                            <Fill>fixed</Fill>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </Surface>
            </Stack>
        </>
    ),
}

interface Run {
    id: string
    status: Status
    took: string
}

const RUNS: Run[] = [
    { id: '01a1a5c6', status: 'succeeded', took: '1.2s' },
    { id: '01a1a5c2', status: 'failed', took: '0.3s' },
    { id: '01a1a5b9', status: 'succeeded', took: '1.4s' },
    { id: '01a1a5b1', status: 'running', took: '-' },
]

const COLUMNS: DataColumn<Run>[] = [
    { id: 'id', header: 'Run', width: '6rem', cell: (run) => <span className="font-mono">{run.id}</span> },
    { id: 'status', header: 'Status', width: 'minmax(0,1fr)', cell: (run) => <StatusChip status={run.status} /> },
    {
        id: 'took',
        header: 'Took',
        width: '4rem',
        align: 'end',
        cell: (run) => <span className="text-muted-foreground tabular-nums">{run.took}</span>,
    },
]

const LOG: LogLine[] = [
    { at: '14:02:07', level: 'info', source: 'fetch', text: 'succeeded in 0.2s' },
    { at: '14:02:07', level: 'error', source: 'validate', text: 'failed: 37 of 2,184 rows have an amount that is not a number' },
    { at: '14:02:07', level: 'info', source: 'upload', text: 'skipped' },
]

/** A list of runs beside the chosen run, which is split again into its summary and its log, each split resizable. */
export const RunInspector: StoryObj = {
    render: () => (
        <Surface className="h-[28rem]">
            <ResizablePanelGroup orientation="horizontal">
                <ResizablePanel defaultSize="35" minSize="20">
                    <DataTable
                        variant="list"
                        columns={COLUMNS}
                        rows={RUNS}
                        rowKey={(run) => run.id}
                        opened={(run) => run.id === '01a1a5c2'}
                    />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="65">
                    <ResizablePanelGroup orientation="vertical">
                        <ResizablePanel defaultSize="55">
                            <Stack gap="2xs" className="p-4">
                                <p className="font-mono text-sm">01a1a5c2</p>
                                <p className="text-sm text-muted-foreground">
                                    import-orders, started 2026-11-04 14:02, failed at validate after 0.3s
                                </p>
                            </Stack>
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize="45">
                            <LogView lines={LOG} framed={false} className="h-full" />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>
            </ResizablePanelGroup>
        </Surface>
    ),
}
