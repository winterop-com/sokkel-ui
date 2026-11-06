import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bell, Inbox } from 'lucide-react'

import { Count } from '../../components/Count'
import { Dot } from '../../components/Dot'
import { Button } from '../../components/ui/button'

/** Small marks: a count of what is waiting, and a dot for a label, a calendar or a step not started. */
const meta: Meta = { title: 'Patterns/Marks' }
export default meta

/** Counts alone, over an icon, past their limit, and small and round as a strip of icons shows them. */
export const Counts: StoryObj = {
    render: () => (
        <div className="flex flex-wrap items-center gap-6 p-6">
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
        </div>
    ),
}

/** Dots in every kind color, in a CSS color, small, and as an outline. */
export const Dots: StoryObj = {
    render: () => (
        <div className="flex flex-col gap-4 p-6 text-sm">
            <div className="flex items-center gap-3">
                {(['blue', 'violet', 'green', 'pink', 'teal', 'jade'] as const).map((kind) => (
                    <Dot key={kind} kind={kind} />
                ))}
            </div>
            <div className="flex items-center gap-3">
                <Dot color="var(--status-failed)" />
                <Dot kind="blue" size="sm" />
                <Dot outline />
            </div>
            <div className="flex items-center gap-2">
                <Dot kind="green" />
                harbor releases
            </div>
        </div>
    ),
}
