import type { Meta, StoryObj } from '@storybook/react-vite'

import { StatusChip, type Status } from '../../components/StatusChip'
import { Button } from '../../components/ui/button'
import { Row, Stack } from '../../components/Layout'
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '../../components/ui/sheet'

const meta: Meta = { title: 'Primitives/Overlays/Sheet', parameters: { frame: 'padded' } }
export default meta

const SIDES = ['top', 'right', 'bottom', 'left'] as const

function Closed() {
    return (
        <Row gap="md" align="stretch" wrap>
            {SIDES.map((side) => (
                <Stack key={side} gap="2xs">
                    <Sheet>
                        <SheetTrigger render={<Button variant="outline" />}>Open {side}</SheetTrigger>
                        <SheetContent side={side}>
                            <SheetHeader>
                                <SheetTitle>Sheet from the {side}</SheetTitle>
                            </SheetHeader>
                        </SheetContent>
                    </Sheet>
                    <p className="text-xs text-muted-foreground">{side}</p>
                </Stack>
            ))}
        </Row>
    )
}

const STEPS: [string, Status, string][] = [
    ['fetch', 'succeeded', '0.8s'],
    ['validate', 'succeeded', '0.1s'],
    ['upload', 'failed', '0.3s'],
]

function RunDetail() {
    return (
        <Sheet defaultOpen>
            <SheetContent side="right">
                <SheetHeader>
                    <SheetTitle>Run 01a1a5c2</SheetTitle>
                    <SheetDescription>import-orders, started 2026-11-04 14:02 by nightly-sync.</SheetDescription>
                </SheetHeader>
                <Stack gap="sm" className="px-4">
                    {STEPS.map(([step, status, duration]) => (
                        <Row key={step} gap="md" justify="between" className="rounded-lg border px-3 py-2">
                            <span className="font-mono text-xs">{step}</span>
                            <Row as="span" gap="md">
                                <span className="text-xs text-muted-foreground tabular-nums">{duration}</span>
                                <StatusChip status={status} />
                            </Row>
                        </Row>
                    ))}
                    <p className="text-sm text-muted-foreground">upload was refused: the API token cannot write to harbor-exports.</p>
                </Stack>
                <SheetFooter>
                    <Button>Run again</Button>
                    <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

function Bottom() {
    return (
        <Sheet defaultOpen>
            <SheetContent side="bottom">
                <SheetHeader>
                    <SheetTitle>Steps</SheetTitle>
                    <SheetDescription>Pick a step to add after validate.</SheetDescription>
                </SheetHeader>
                <Row align="stretch" wrap className="px-4 pb-4">
                    {['bucket.put', 'parquet.write', 'rows.map', 'http.post'].map((code) => (
                        <Button key={code} variant="outline" size="sm" className="font-mono">
                            {code}
                        </Button>
                    ))}
                </Row>
            </SheetContent>
        </Sheet>
    )
}

export const Triggers: StoryObj = { render: () => <Closed /> }
export const RightRunDetail: StoryObj = { render: () => <RunDetail /> }
export const BottomPicker: StoryObj = { render: () => <Bottom /> }
