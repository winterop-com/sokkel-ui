import type { Meta, StoryObj } from '@storybook/react-vite'

import { StatusChip, type Status } from '../../components/StatusChip'
import { Button } from '../../components/ui/button'
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

const meta: Meta = { title: 'Primitives/Overlays/Sheet' }
export default meta

const SIDES = ['top', 'right', 'bottom', 'left'] as const

function Closed() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="flex flex-wrap gap-3">
                {SIDES.map((side) => (
                    <div key={side} className="flex flex-col gap-1">
                        <Sheet>
                            <SheetTrigger render={<Button variant="outline" />}>Open {side}</SheetTrigger>
                            <SheetContent side={side}>
                                <SheetHeader>
                                    <SheetTitle>Sheet from the {side}</SheetTitle>
                                </SheetHeader>
                            </SheetContent>
                        </Sheet>
                        <p className="text-xs text-muted-foreground">{side}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

const STEPS: [string, Status, string][] = [
    ['fetch', 'succeeded', '0.8s'],
    ['gate', 'succeeded', '0.1s'],
    ['store', 'failed', '0.3s'],
]

function RunDetail() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <Sheet defaultOpen>
                <SheetContent side="right">
                    <SheetHeader>
                        <SheetTitle>Run 01a1a5c2</SheetTitle>
                        <SheetDescription>weather-gate, started 2026-11-04 14:02 by nightly-sync.</SheetDescription>
                    </SheetHeader>
                    <div className="flex flex-col gap-2 px-4">
                        {STEPS.map(([step, status, duration]) => (
                            <div key={step} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                                <span className="font-mono text-xs">{step}</span>
                                <span className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground tabular-nums">{duration}</span>
                                    <StatusChip status={status} />
                                </span>
                            </div>
                        ))}
                        <p className="text-sm text-muted-foreground">
                            store refused the batch: the schema readings-v2 has no field humidity.
                        </p>
                    </div>
                    <SheetFooter>
                        <Button>Run again</Button>
                        <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}

function Bottom() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <Sheet defaultOpen>
                <SheetContent side="bottom">
                    <SheetHeader>
                        <SheetTitle>Blocks</SheetTitle>
                        <SheetDescription>Pick a block to add after gate.</SheetDescription>
                    </SheetHeader>
                    <div className="flex flex-wrap gap-2 px-4 pb-4">
                        {['dhis2.import', 'parquet.write', 'jq.transform', 'http.post'].map((code) => (
                            <Button key={code} variant="outline" size="sm" className="font-mono">
                                {code}
                            </Button>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}

export const Triggers: StoryObj = { render: () => <Closed /> }
export const RightRunDetail: StoryObj = { render: () => <RunDetail /> }
export const BottomPicker: StoryObj = { render: () => <Bottom /> }
