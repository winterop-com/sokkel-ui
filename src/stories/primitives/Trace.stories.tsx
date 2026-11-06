import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckIcon, DatabaseIcon, FileTextIcon, SearchIcon, TriangleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { DescriptionList } from '../../components/DescriptionList'
import { Stack } from '../../components/Layout'
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
function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

const meta: Meta = { title: 'Primitives/Chat/Trace', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Stack gap="xl" className="max-w-2xl">
            <Stack gap="sm">
                <Caption>line</Caption>
                <Trace>
                    <TraceLine>
                        <TraceTitle>Read run 01a1a5c2</TraceTitle>
                    </TraceLine>
                </Trace>
            </Stack>
            <Stack gap="sm">
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
            </Stack>
            <Stack gap="sm">
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
            </Stack>
            <Stack gap="sm">
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
            </Stack>
        </Stack>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Stack gap="xl" className="max-w-2xl">
            {(
                [
                    ['done', undefined],
                    ['running', 'running'],
                    ['error', 'error'],
                    ['pending', 'pending'],
                ] as const
            ).map(([label, status]) => (
                <Stack key={label} gap="sm">
                    <Caption>{label}</Caption>
                    <Trace>
                        <TraceLine status={status}>
                            <TraceIcon>{status === 'error' ? <TriangleAlertIcon /> : <DatabaseIcon />}</TraceIcon>
                            <TraceTitle>Read the log of step validate</TraceTitle>
                            {status === undefined || status === 'error' ? <TraceDescription>0.1s</TraceDescription> : null}
                        </TraceLine>
                    </Trace>
                </Stack>
            ))}
        </Stack>
    ),
}

export const ToolCalls: StoryObj = {
    render: () => (
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
                        <DescriptionList
                            items={[
                                { term: 'started', value: '2026-11-04 14:02', code: true },
                                { term: 'state', value: 'failed', code: true },
                                { term: 'step', value: 'validate', code: true },
                                { term: 'took', value: '0.3s', code: true },
                            ]}
                        />
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
                        <p className="font-mono text-xs">14:02:07 validate failed: 37 of 2,184 rows have an amount that is not a number</p>
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
    ),
}
