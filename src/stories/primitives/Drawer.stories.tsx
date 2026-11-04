import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '../../components/ui/button'
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '../../components/ui/drawer'

const meta: Meta = { title: 'Primitives/Overlays/Drawer' }
export default meta

function Closed() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="flex flex-wrap gap-3">
                <Drawer>
                    <DrawerTrigger render={<Button variant="outline" />}>Schedule details</DrawerTrigger>
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>every-night</DrawerTitle>
                        </DrawerHeader>
                    </DrawerContent>
                </Drawer>
            </div>
        </div>
    )
}

const FACTS: [string, string][] = [
    ['Job', 'nightly-export'],
    ['Schedule', 'Every day at 02:00'],
    ['Last run', '2026-11-04 02:00, succeeded in 1.2s'],
    ['Next run', '2026-11-05 02:00'],
]

function ScheduleDetail() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <Drawer defaultOpen showSwipeHandle>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>every-night</DrawerTitle>
                        <DrawerDescription>A schedule that starts nightly-export once a day.</DrawerDescription>
                    </DrawerHeader>
                    <dl className="grid gap-2 p-4 text-sm">
                        {FACTS.map(([term, value]) => (
                            <div key={term} className="flex flex-wrap justify-between gap-2">
                                <dt className="text-muted-foreground">{term}</dt>
                                <dd className="font-mono text-xs">{value}</dd>
                            </div>
                        ))}
                    </dl>
                    <DrawerFooter>
                        <Button>Run now</Button>
                        <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </div>
    )
}

function Right() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <Drawer defaultOpen swipeDirection="right">
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>api</DrawerTitle>
                        <DrawerDescription>A service used by 3 jobs.</DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4 text-sm text-muted-foreground">Last checked 2026-11-04 14:02. The server answered in 0.4s.</div>
                    <DrawerFooter>
                        <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </div>
    )
}

export const Trigger: StoryObj = { render: () => <Closed /> }
export const BottomWithHandle: StoryObj = { render: () => <ScheduleDetail /> }
export const FromRight: StoryObj = { render: () => <Right /> }
