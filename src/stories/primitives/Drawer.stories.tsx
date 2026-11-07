import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@winterop-com/sokkel-ui/primitives/drawer'

const meta: Meta = { title: 'Primitives/Overlays/Drawer', parameters: { frame: 'padded' } }
export default meta

function Closed() {
    return (
        <Row gap="md" align="stretch" wrap>
            <Drawer>
                <DrawerTrigger render={<Button variant="outline" />}>Schedule details</DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>every-night</DrawerTitle>
                    </DrawerHeader>
                </DrawerContent>
            </Drawer>
        </Row>
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
        <Drawer defaultOpen showSwipeHandle>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>every-night</DrawerTitle>
                    <DrawerDescription>A schedule that starts nightly-export once a day.</DrawerDescription>
                </DrawerHeader>
                <Stack as="dl" gap="sm" className="p-4 text-sm">
                    {FACTS.map(([term, value]) => (
                        <Row key={term} align="stretch" justify="between" wrap>
                            <dt className="text-muted-foreground">{term}</dt>
                            <dd className="font-mono text-xs">{value}</dd>
                        </Row>
                    ))}
                </Stack>
                <DrawerFooter>
                    <Button>Run now</Button>
                    <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}

function Right() {
    return (
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
    )
}

export const Trigger: StoryObj = { render: () => <Closed /> }
export const BottomWithHandle: StoryObj = { render: () => <ScheduleDetail /> }
export const FromRight: StoryObj = { render: () => <Right /> }
