import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleCheck, Clock, Repeat } from 'lucide-react'

import { Badge } from '@winterop-com/sokkel-ui/primitives/badge'
import type { KindColor } from '@winterop-com/sokkel-ui/lib/kind'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Display/Badge', parameters: { frame: 'column' } }
export default meta

/** Every prop of a badge, to try live. */
export const Playground: StoryObj<{ label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' }> = {
    parameters: { frame: 'padded', controls: { disable: false } },
    args: { label: 'nightly', variant: 'secondary' },
    argTypes: { variant: { control: 'select', options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] } },
    render: (args) => <Badge variant={args.variant}>{args.label}</Badge>,
}

const VARIANTS = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const

const KINDS: [KindColor, string][] = [
    ['teal', 'Monthly report'],
    ['pink', 'Single record'],
    ['blue', 'Registration'],
    ['green', 'Follow-up'],
    ['violet', 'Register'],
    ['jade', 'Survey'],
]

export const Variants: StoryObj = {
    render: () => (
        <>
            <Row gap="xl" align="stretch" wrap>
                {VARIANTS.map((variant) => (
                    <Specimen below key={variant} label={variant}>
                        <Badge variant={variant}>csv</Badge>
                    </Specimen>
                ))}
            </Row>
            <Row gap="xl" align="stretch" wrap>
                <Specimen below label="icon start">
                    <Badge variant="secondary">
                        <Repeat data-icon="inline-start" />
                        nightly
                    </Badge>
                </Specimen>
                <Specimen below label="icon end">
                    <Badge variant="outline">
                        pinned
                        <Clock data-icon="inline-end" />
                    </Badge>
                </Specimen>
                <Specimen below label="as a link">
                    <Badge render={<a href="#" />}>larkspur</Badge>
                </Specimen>
            </Row>
        </>
    ),
}

/** A categorical value in each of the kind colors, as a listing tells sorts of things apart: every form of one sort wears its color. */
export const Kinds: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            {KINDS.map(([kind, label]) => (
                <Specimen below key={kind} label={kind}>
                    <Badge kind={kind}>{label}</Badge>
                </Specimen>
            ))}
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Specimen below label="invalid">
                <Badge variant="outline" aria-invalid>
                    unknown-format
                </Badge>
            </Specimen>
            <Specimen below label="long text">
                <Badge variant="secondary">a-very-long-project-code-for-a-test</Badge>
            </Specimen>
        </Row>
    ),
}

const TONE: Record<string, string> = {
    succeeded: 'bg-status-succeeded/15 text-status-succeeded-ink',
    failed: 'bg-status-failed/15 text-status-failed-ink',
    running: 'bg-status-running/15 text-status-running-ink',
    queued: 'bg-status-queued/15 text-status-queued-ink',
    cancelled: 'bg-status-cancelled/15 text-status-cancelled-ink',
}

export const JobTags: StoryObj = {
    render: () => (
        <Stack className="max-w-xl rounded-lg border p-4">
            <Row wrap>
                <span className="font-mono text-sm font-medium">nightly-export</span>
                <Badge className={TONE.succeeded}>
                    <CircleCheck data-icon="inline-start" />
                    succeeded
                </Badge>
            </Row>
            <Row gap="xs" align="stretch" wrap>
                <Badge variant="outline">larkspur</Badge>
                <Badge variant="outline">csv</Badge>
                <Badge variant="secondary">
                    <Repeat data-icon="inline-start" />
                    every night at 02:00
                </Badge>
            </Row>
            <Row gap="xs" align="stretch" wrap>
                {Object.keys(TONE).map((state) => (
                    <Badge key={state} className={TONE[state]}>
                        {state}
                    </Badge>
                ))}
            </Row>
        </Stack>
    ),
}
