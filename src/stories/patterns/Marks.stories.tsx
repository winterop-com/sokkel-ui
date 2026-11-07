import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bell, Inbox } from 'lucide-react'

import { Count } from '@winterop-com/sokkel-ui/Count'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/** Small marks: a count of what is waiting, and a dot for a label, a calendar or a step not started. */
const meta: Meta = { title: 'Patterns/Marks' }
export default meta

/** Counts alone, over an icon, past their limit, and small and round as a strip of icons shows them. */
export const Counts: StoryObj = {
    render: () => (
        <Row gap="xl" wrap className="p-6">
            <Count value={3} />
            <Count value={12} />
            <Count value={240} />
            <Button variant="ghost" size="icon-lg" aria-label="Activity, 3 unread" className="relative">
                <Bell aria-hidden />
                <Count value={3} className="absolute -top-1 -right-1" />
            </Button>
            <Button variant="ghost" size="icon-lg" aria-label="Inbox, 128 unread" className="relative">
                <Inbox aria-hidden />
                <Count value={128} className="absolute -top-1 -right-1" />
            </Button>
            <Count value={3} size="sm" shape="round" />
            <Count value={42} size="sm" shape="round" />
            <Button variant="ghost" size="icon-lg" aria-label="Messages, 1 unread" className="relative">
                <Inbox aria-hidden />
                <Count value={1} size="sm" shape="round" className="absolute -top-0.5 -right-0.5" />
            </Button>
        </Row>
    ),
}

/** Dots in every kind color, in a CSS color, small, and as an outline. */
export const Dots: StoryObj = {
    render: () => (
        <Stack gap="lg" className="p-6 text-sm">
            <Row gap="md">
                {(['blue', 'violet', 'green', 'pink', 'teal', 'jade'] as const).map((kind) => (
                    <Dot key={kind} kind={kind} />
                ))}
            </Row>
            <Row gap="md">
                <Dot color="var(--status-failed)" />
                <Dot kind="blue" size="sm" />
                <Dot outline />
            </Row>
            <Row>
                <Dot kind="green" />
                harbor releases
            </Row>
        </Stack>
    ),
}
