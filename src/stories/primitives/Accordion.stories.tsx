import type { Meta, StoryObj } from '@storybook/react-vite'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion'

const meta: Meta = { title: 'Primitives/Display/Accordion' }
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

function Steps() {
    return (
        <>
            <AccordionItem value="fetch">
                <AccordionTrigger>fetch</AccordionTrigger>
                <AccordionContent>Reads the orders placed since the last run.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="validate">
                <AccordionTrigger>validate</AccordionTrigger>
                <AccordionContent>Stops the run when an order has no customer.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="upload">
                <AccordionTrigger>upload</AccordionTrigger>
                <AccordionContent>Writes orders-2026-10.csv to the harbor archive.</AccordionContent>
            </AccordionItem>
        </>
    )
}

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-lg flex-col gap-2">
                <Caption>single, first item open</Caption>
                <Accordion defaultValue={['fetch']}>
                    <Steps />
                </Accordion>
            </div>
            <div className="flex max-w-lg flex-col gap-2">
                <Caption>multiple, two items open</Caption>
                <Accordion multiple defaultValue={['fetch', 'upload']}>
                    <Steps />
                </Accordion>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-lg flex-col gap-2">
                <Caption>all closed, one item disabled</Caption>
                <Accordion>
                    <AccordionItem value="settings">
                        <AccordionTrigger>Settings</AccordionTrigger>
                        <AccordionContent>The job's settings.</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="output" disabled>
                        <AccordionTrigger>Output (no run yet)</AccordionTrigger>
                        <AccordionContent>The job's last output.</AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </Ground>
    ),
}

function StepTrigger({ code, detail, tone }: { code: string; detail: string; tone?: string }) {
    return (
        <AccordionTrigger>
            <span className="flex flex-1 items-center justify-between gap-3 pr-3">
                <span className="font-mono">{code}</span>
                <span className={`text-xs tabular-nums ${tone ?? 'text-muted-foreground'}`}>{detail}</span>
            </span>
        </AccordionTrigger>
    )
}

export const RunSteps: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-2xl flex-col gap-2">
                <h2 className="text-sm font-medium">
                    Run <span className="font-mono">01a1a5c2</span> of <span className="font-mono">nightly-export</span>
                </h2>
                <Accordion defaultValue={['validate']}>
                    <AccordionItem value="fetch">
                        <StepTrigger code="fetch" detail="0.8s" />
                        <AccordionContent>
                            <p className="text-muted-foreground">Read 312 orders at 2026-11-04 14:02.</p>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="validate">
                        <StepTrigger code="validate" detail="failed, 0.3s" tone="text-status-failed-ink" />
                        <AccordionContent>
                            <p className="text-muted-foreground">Order 41 has no customer. The run stopped here.</p>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="upload" disabled>
                        <StepTrigger code="upload" detail="skipped" />
                        <AccordionContent>Not reached.</AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </Ground>
    ),
}
