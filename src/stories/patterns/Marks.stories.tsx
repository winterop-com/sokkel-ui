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

/**
 * A job's last run as a status dot in the three sizes: named for a screen reader, explained in a
 * tooltip a keyboard reaches, its word said where the state is news, and hollow in the state's
 * ink for a state not known yet.
 */
export const StatusDots: StoryObj = {
    name: 'Status dots',
    render: () => (
        <Stack gap="lg" className="p-6 text-sm">
            <Row gap="md">
                {(['succeeded', 'failed', 'running', 'queued', 'cancelled', 'skipped'] as const).map((status) => (
                    <Dot key={status} status={status} size="md" label={status} tip={`Last run ${status}`} focusable />
                ))}
            </Row>
            <Row gap="md">
                <Dot status="failed" size="sm" label="failed" />
                <Dot status="failed" size="md" label="failed" />
                <Dot status="failed" size="lg" label="failed" />
                <Dot status="queued" size="md" outline label="unknown" tip="Not run since the schedule changed" focusable />
                <Dot kind="violet" size="md" outline />
            </Row>
            <Stack gap="xs">
                <Row gap="xs">
                    <span className="font-mono">nightly-export</span>
                    <Dot status="succeeded" size="md" label="succeeded" />
                </Row>
                <Row gap="xs">
                    <span className="font-mono">sync-inventory</span>
                    <Dot status="failed" size="md" say tip="Failed at upload, 02:14" focusable />
                </Row>
                <Row gap="xs">
                    <span className="font-mono">rebuild-index</span>
                    <Dot status="running" size="md" say="running, step 3 of 5" />
                </Row>
            </Stack>
        </Stack>
    ),
}
