import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckIcon, DatabaseIcon, FileTextIcon, SearchIcon, TriangleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import {
    Trace,
    TraceCollapsible,
    TraceCollapsibleContent,
    TraceCollapsibleTrigger,
    TraceDescription,
    TraceIcon,
    TraceLine,
    TraceTitle,
} from '../../components/ui/trace'

/** The steps an assistant took, one line each, with a detail that folds open beneath a line. */
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

const meta: Meta = { title: 'Primitives/Chat/Trace' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-2xl flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <Caption>line</Caption>
                    <Trace>
                        <TraceLine>
                            <TraceTitle>Read run 01a1a5c2</TraceTitle>
                        </TraceLine>
                    </Trace>
                </div>
                <div className="flex flex-col gap-2">
                    <Caption>icon, title and description</Caption>
                    <Trace>
                        <TraceLine>
                            <TraceIcon>
                                <FileTextIcon />
                            </TraceIcon>
                            <TraceTitle>Read run 01a1a5c2</TraceTitle>
                            <TraceDescription>0.2s</TraceDescription>
                        </TraceLine>
                    </Trace>
                </div>
                <div className="flex flex-col gap-2">
                    <Caption>collapsible, closed</Caption>
                    <Trace>
                        <TraceCollapsible>
                            <TraceCollapsibleTrigger>
                                <TraceLine>
                                    <TraceTitle>Searched 3 services</TraceTitle>
                                </TraceLine>
                            </TraceCollapsibleTrigger>
                            <TraceCollapsibleContent>api, worker, scheduler</TraceCollapsibleContent>
                        </TraceCollapsible>
                    </Trace>
                </div>
                <div className="flex flex-col gap-2">
                    <Caption>collapsible, open</Caption>
                    <Trace>
                        <TraceCollapsible defaultOpen>
                            <TraceCollapsibleTrigger>
                                <TraceLine>
                                    <TraceTitle>Searched 3 services</TraceTitle>
                                </TraceLine>
                            </TraceCollapsibleTrigger>
                            <TraceCollapsibleContent>api, worker, scheduler</TraceCollapsibleContent>
                        </TraceCollapsible>
                    </Trace>
                </div>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-2xl flex-col gap-6">
                {(
                    [
                        ['done', undefined],
                        ['running', 'running'],
                        ['error', 'error'],
                        ['pending', 'pending'],
                    ] as const
                ).map(([label, status]) => (
                    <div key={label} className="flex flex-col gap-2">
                        <Caption>{label}</Caption>
                        <Trace>
                            <TraceLine status={status}>
                                <TraceIcon>{status === 'error' ? <TriangleAlertIcon /> : <DatabaseIcon />}</TraceIcon>
                                <TraceTitle>Read the log of step validate</TraceTitle>
                                {status === undefined || status === 'error' ? <TraceDescription>0.1s</TraceDescription> : null}
                            </TraceLine>
                        </Trace>
                    </div>
                ))}
            </div>
        </Ground>
    ),
}

export const ToolCalls: StoryObj = {
    render: () => (
        <Ground>
            <div className="max-w-2xl">
                <Trace>
                    <TraceLine>
                        <TraceIcon>
                            <SearchIcon />
                        </TraceIcon>
                        <TraceTitle>Found the last failed run of import-orders</TraceTitle>
                        <TraceDescription>0.1s</TraceDescription>
                    </TraceLine>
                    <TraceCollapsible defaultOpen>
                        <TraceCollapsibleTrigger>
                            <TraceLine>
                                <TraceIcon>
                                    <FileTextIcon />
                                </TraceIcon>
                                <TraceTitle>Read run 01a1a5c2</TraceTitle>
                                <TraceDescription>0.2s</TraceDescription>
                            </TraceLine>
                        </TraceCollapsibleTrigger>
                        <TraceCollapsibleContent>
                            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                                <dt>started</dt>
                                <dd className="font-mono">2026-11-04 14:02</dd>
                                <dt>state</dt>
                                <dd className="font-mono">failed</dd>
                                <dt>step</dt>
                                <dd className="font-mono">validate</dd>
                                <dt>took</dt>
                                <dd className="font-mono">0.3s</dd>
                            </dl>
                        </TraceCollapsibleContent>
                    </TraceCollapsible>
                    <TraceCollapsible defaultOpen>
                        <TraceCollapsibleTrigger>
                            <TraceLine status="error">
                                <TraceIcon>
                                    <TriangleAlertIcon />
                                </TraceIcon>
                                <TraceTitle>Read the log of step validate</TraceTitle>
                                <TraceDescription>0.1s</TraceDescription>
                            </TraceLine>
                        </TraceCollapsibleTrigger>
                        <TraceCollapsibleContent>
                            <p className="font-mono text-xs">
                                14:02:07 validate failed: 37 of 2,184 rows have an amount that is not a number
                            </p>
                        </TraceCollapsibleContent>
                    </TraceCollapsible>
                    <TraceLine>
                        <TraceIcon>
                            <CheckIcon />
                        </TraceIcon>
                        <TraceTitle>Read jobs/import-orders.yaml</TraceTitle>
                        <TraceDescription>0.1s</TraceDescription>
                    </TraceLine>
                </Trace>
            </div>
        </Ground>
    ),
}
