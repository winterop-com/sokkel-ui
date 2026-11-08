import type { Meta, StoryObj } from '@storybook/react-vite'
import { ListStart, Play, SlidersHorizontal } from 'lucide-react'

import { Row } from '@winterop-com/sokkel-ui/Layout'
import { SplitButton, type SplitButtonItem } from '@winterop-com/sokkel-ui/SplitButton'
import { Specimen } from '../fixtures/Specimen'

/** The main action and a menu of other ways to do it. */
const meta: Meta = { title: 'Patterns/Split button', parameters: { frame: 'column' } }
export default meta

const WAYS: SplitButtonItem[] = [
    {
        label: 'Run with options',
        description: 'Set the date range and the rows to take first.',
        icon: <SlidersHorizontal aria-hidden />,
        onSelect: () => undefined,
    },
    {
        label: 'Run from a step',
        description: 'Start at transform, keeping what fetch took.',
        icon: <ListStart aria-hidden />,
        onSelect: () => undefined,
    },
    { label: 'Run as a dry run', disabled: true, onSelect: () => undefined },
]

/** Each of Button's variants, the menu under the whole control. */
export const Variants: StoryObj = {
    render: () => (
        <Row gap="md" align="stretch" wrap>
            {(['default', 'outline', 'secondary', 'ghost', 'destructive'] as const).map((variant) => (
                <Specimen key={variant} label={variant}>
                    <SplitButton variant={variant} items={WAYS}>
                        Run now
                    </SplitButton>
                </Specimen>
            ))}
        </Row>
    ),
}

/** The sizes, both halves standing the same height. */
export const Sizes: StoryObj = {
    render: () => (
        <Row gap="md" align="end" wrap>
            {(['xs', 'sm', 'default', 'lg'] as const).map((size) => (
                <Specimen key={size} label={size}>
                    <SplitButton size={size} variant="outline" items={WAYS}>
                        Run now
                    </SplitButton>
                </Specimen>
            ))}
        </Row>
    ),
}

/** The menu open: the other ways, each with a line on how it differs. */
export const Open: StoryObj = {
    render: () => (
        <Row>
            <SplitButton items={WAYS} defaultOpen>
                <Play data-icon="inline-start" aria-hidden />
                Run now
            </SplitButton>
        </Row>
    ),
}

/** Both halves disabled, saying why on hover and focus. */
export const Reason: StoryObj = {
    render: () => (
        <Row>
            <SplitButton items={WAYS} reason="A run of nightly-export is already under way.">
                <Play data-icon="inline-start" aria-hidden />
                Run now
            </SplitButton>
        </Row>
    ),
}
