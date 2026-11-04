import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { StatusChip, type Status } from '../../components/StatusChip'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../components/ui/resizable'

/** Panels with a handle between them that drags to share the space, side by side or stacked. */
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

function Fill({ children }: { children: ReactNode }) {
    return <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">{children}</div>
}

const meta: Meta = { title: 'Primitives/Layout/Resizable' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-col gap-2">
                <Caption>horizontal</Caption>
                <div className="h-40 rounded-lg border border-border">
                    <ResizablePanelGroup orientation="horizontal">
                        <ResizablePanel defaultSize="40">
                            <Fill>40%</Fill>
                        </ResizablePanel>
                        <ResizableHandle />
                        <ResizablePanel defaultSize="60">
                            <Fill>60%</Fill>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <Caption>horizontal, with a grip</Caption>
                <div className="h-40 rounded-lg border border-border">
                    <ResizablePanelGroup orientation="horizontal">
                        <ResizablePanel defaultSize="50">
                            <Fill>50%</Fill>
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize="50">
                            <Fill>50%</Fill>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <Caption>vertical, with a grip</Caption>
                <div className="h-64 rounded-lg border border-border">
                    <ResizablePanelGroup orientation="vertical">
                        <ResizablePanel defaultSize="30">
                            <Fill>30%</Fill>
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize="70">
                            <Fill>70%</Fill>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <Caption>disabled handle</Caption>
                <div className="h-40 rounded-lg border border-border">
                    <ResizablePanelGroup orientation="horizontal">
                        <ResizablePanel defaultSize="50">
                            <Fill>fixed</Fill>
                        </ResizablePanel>
                        <ResizableHandle withHandle disabled />
                        <ResizablePanel defaultSize="50">
                            <Fill>fixed</Fill>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>
        </Ground>
    ),
}

const RUNS: [string, Status, string][] = [
    ['01a1a5c6', 'succeeded', '1.2s'],
    ['01a1a5c2', 'failed', '0.3s'],
    ['01a1a5b9', 'succeeded', '1.4s'],
    ['01a1a5b1', 'running', '-'],
]

export const RunInspector: StoryObj = {
    render: () => (
        <Ground>
            <div className="h-[28rem] rounded-lg border border-border">
                <ResizablePanelGroup orientation="horizontal">
                    <ResizablePanel defaultSize="35" minSize="20">
                        <ul className="flex flex-col p-2 text-sm">
                            {RUNS.map(([id, status, took]) => (
                                <li
                                    key={id}
                                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${id === '01a1a5c2' ? 'bg-muted' : ''}`}
                                >
                                    <span className="font-mono">{id}</span>
                                    <StatusChip status={status} />
                                    <span className="ml-auto text-muted-foreground tabular-nums">{took}</span>
                                </li>
                            ))}
                        </ul>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize="65">
                        <ResizablePanelGroup orientation="vertical">
                            <ResizablePanel defaultSize="55">
                                <div className="flex flex-col gap-1 p-4">
                                    <p className="font-mono text-sm">01a1a5c2</p>
                                    <p className="text-sm text-muted-foreground">
                                        import-orders, started 2026-11-04 14:02, failed at validate after 0.3s
                                    </p>
                                </div>
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize="45">
                                <pre className="h-full overflow-auto p-4 font-mono text-xs text-muted-foreground">
                                    {
                                        '14:02:07 fetch succeeded in 0.2s\n14:02:07 validate failed: 37 of 2,184 rows have an amount that is not a number\n14:02:07 upload skipped'
                                    }
                                </pre>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </Ground>
    ),
}
