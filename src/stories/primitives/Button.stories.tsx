import type { Meta, StoryObj } from '@storybook/react-vite'
import { MoreHorizontal, Play, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'

import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Specimen } from '../fixtures/Specimen'

const VARIANTS = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const
const SIZES = ['xs', 'sm', 'default', 'lg'] as const
const ICON_SIZES = ['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const

const meta: Meta = { title: 'Primitives/Actions/Button', parameters: { frame: 'column' } }
export default meta

/** Every prop of a button, to try live. */
export const Playground: StoryObj<{
    label: string
    variant: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
    size: 'xs' | 'sm' | 'default' | 'lg'
    icon: boolean
    disabled: boolean
}> = {
    parameters: { frame: 'padded', controls: { disable: false } },
    args: { label: 'Run now', variant: 'default', size: 'default', icon: true, disabled: false },
    argTypes: {
        variant: { control: 'select', options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] },
        size: { control: 'inline-radio', options: ['xs', 'sm', 'default', 'lg'] },
    },
    render: (args) => (
        <Button variant={args.variant} size={args.size} disabled={args.disabled}>
            {args.icon && <Play aria-hidden />}
            {args.label}
        </Button>
    ),
}

export const Variants: StoryObj = {
    render: () => (
        <>
            <Row gap="md" align="stretch" wrap>
                {VARIANTS.map((variant) => (
                    <Specimen key={variant} label={variant}>
                        <Button variant={variant}>Run now</Button>
                    </Specimen>
                ))}
            </Row>
            <Row gap="md" align="end" wrap>
                {SIZES.map((size) => (
                    <Specimen key={size} label={size}>
                        <Button size={size}>Run now</Button>
                    </Specimen>
                ))}
            </Row>
            <Row gap="md" align="end" wrap>
                {ICON_SIZES.map((size) => (
                    <Specimen key={size} label={size}>
                        <Button size={size} variant="outline" aria-label="More actions">
                            <MoreHorizontal />
                        </Button>
                    </Specimen>
                ))}
            </Row>
            <Row gap="md" align="stretch" wrap>
                <Specimen label="icon inline-start">
                    <Button>
                        <Play data-icon="inline-start" />
                        Run now
                    </Button>
                </Specimen>
                <Specimen label="icon inline-end">
                    <Button variant="outline">
                        New job
                        <Plus data-icon="inline-end" />
                    </Button>
                </Specimen>
            </Row>
        </>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="md" align="stretch" wrap>
            <Specimen label="disabled">
                <Button disabled>Run now</Button>
            </Specimen>
            <Specimen label="disabled outline">
                <Button variant="outline" disabled>
                    Retry
                </Button>
            </Specimen>
            <Specimen label="invalid">
                <Button variant="outline" aria-invalid>
                    Apply
                </Button>
            </Specimen>
            <Specimen label="busy">
                <Button busy>
                    <Play data-icon="inline-start" />
                    Starting run
                </Button>
            </Specimen>
        </Row>
    ),
}

/**
 * Buttons whose press is under way: the spinner takes a leading icon's place, or an icon-only
 * button's, and comes before a label with none; the label stays, and the button keeps its focus
 * while it ignores presses.
 */
export const Busy: StoryObj = {
    render: () => (
        <Row gap="md" align="end" wrap>
            {SIZES.map((size) => (
                <Specimen key={size} label={size}>
                    <Button size={size} busy>
                        <Save data-icon="inline-start" />
                        Save
                    </Button>
                </Specimen>
            ))}
            <Specimen label="no icon">
                <Button variant="outline" busy>
                    Retry failed
                </Button>
            </Specimen>
            <Specimen label="icon-sm">
                <Button variant="outline" size="icon-sm" aria-label="Delete job" busy>
                    <Trash2 />
                </Button>
            </Specimen>
        </Row>
    ),
}

/** Buttons that cannot be pressed now and say why on hover and focus, and on a tap on a touch screen; they stay in the tab order. */
export const Reason: StoryObj = {
    render: () => (
        <Row gap="md" align="stretch" wrap>
            <Specimen label="reason">
                <Button reason="A run of nightly-export is already under way.">
                    <Play data-icon="inline-start" />
                    Run now
                </Button>
            </Specimen>
            <Specimen label="reason outline">
                <Button variant="outline" reason="Only an owner of harbor can delete it.">
                    <Trash2 data-icon="inline-start" />
                    Delete
                </Button>
            </Specimen>
        </Row>
    ),
}

/** `destructiveHover` on each quiet variant: the button stays quiet until pointed at, then takes the critical tint. */
export const DestructiveHover: StoryObj = {
    name: 'Destructive hover',
    render: () => (
        <Row gap="md" align="stretch" wrap>
            {(['outline', 'secondary', 'ghost'] as const).map((variant) => (
                <Specimen key={variant} label={variant}>
                    <Button variant={variant} destructiveHover>
                        <Trash2 data-icon="inline-start" />
                        Delete
                    </Button>
                </Specimen>
            ))}
        </Row>
    ),
}

export const RunActions: StoryObj = {
    render: () => (
        <Stack gap="lg" className="rounded-lg border border-border p-4">
            <Row gap="md" justify="between" wrap>
                <Stack gap="2xs">
                    <p className="text-sm font-medium">Import orders</p>
                    <p className="font-mono text-xs text-muted-foreground">import-orders</p>
                </Stack>
                <Row align="stretch" wrap>
                    <Button variant="ghost" size="sm">
                        <RotateCcw data-icon="inline-start" />
                        Retry failed
                    </Button>
                    <Button variant="outline" size="sm">
                        Edit
                    </Button>
                    <Button size="sm">
                        <Play data-icon="inline-start" />
                        Run now
                    </Button>
                    <Button variant="destructive" size="icon-sm" aria-label="Delete job">
                        <Trash2 />
                    </Button>
                </Row>
            </Row>
            <p className="text-sm text-muted-foreground">
                Last run failed at 2026-11-04 14:02 after 0.3s. The fetch step could not reach api.example.org.
            </p>
        </Stack>
    ),
}
