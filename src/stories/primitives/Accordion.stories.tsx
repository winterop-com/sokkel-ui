import type { Meta, StoryObj } from '@storybook/react-vite'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion'
import { Row, Stack } from '../../components/Layout'

const meta: Meta = { title: 'Primitives/Display/Accordion', parameters: { frame: 'column' } }
export default meta

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
        <>
            <Stack gap="sm" className="max-w-lg">
                <Caption>single, first item open</Caption>
                <Accordion defaultValue={['fetch']}>
                    <Steps />
                </Accordion>
            </Stack>
            <Stack gap="sm" className="max-w-lg">
                <Caption>multiple, two items open</Caption>
                <Accordion multiple defaultValue={['fetch', 'upload']}>
                    <Steps />
                </Accordion>
            </Stack>
        </>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Stack gap="sm" className="max-w-lg">
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
        </Stack>
    ),
}

function StepTrigger({ code, detail, tone }: { code: string; detail: string; tone?: string }) {
    return (
        <AccordionTrigger>
            <Row as="span" gap="md" justify="between" className="flex-1 pr-3">
                <span className="font-mono">{code}</span>
                <span className={`text-xs tabular-nums ${tone ?? 'text-muted-foreground'}`}>{detail}</span>
            </Row>
        </AccordionTrigger>
    )
}

export const RunSteps: StoryObj = {
    render: () => (
        <Stack gap="sm" className="max-w-2xl">
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
        </Stack>
    ),
}
