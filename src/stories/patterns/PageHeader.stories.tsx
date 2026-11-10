import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarClock, Copy, Download, History, ListPlus, Pin, Play, RotateCcw, Settings, Upload } from 'lucide-react'
import { useState } from 'react'

import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { StarButton } from '@winterop-com/sokkel-ui/StarButton'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

/**
 * The head of a page: its title with what is known about it under it, and its actions at the end,
 * the primary one last. A page reached from another carries a back button and the trail of places
 * above it. On a phone the actions move under the title, or, given as `items`, fold into More
 * beside it.
 */
const meta: Meta = {
    title: 'Patterns/Page header',
    parameters: { frame: 'padded' },
    decorators: [
        (Story) => (
            <TooltipProvider>
                <Story />
            </TooltipProvider>
        ),
    ],
}
export default meta

/** A title alone, as a page with nothing to act on yet has. */
export const Title: StoryObj = { render: () => <PageHeader title="Jobs" /> }

/** A listing's head: how many it holds beside the title, and its actions, the primary one last. */
export const Actions: StoryObj = {
    render: () => (
        <PageHeader
            title="Jobs"
            count="5 jobs"
            actions={
                <>
                    <Button size="sm" variant="outline">
                        <Upload aria-hidden />
                        Import
                    </Button>
                    <Button size="sm">New</Button>
                </>
            }
        />
    ),
}

/**
 * One thing's page: its name over its code, a sentence on what it does, a line of small facts and
 * three actions, which on a phone wrap under the title and then onto as many lines as they need.
 */
export const Details: StoryObj = {
    render: () => (
        <PageHeader
            title="Nightly export"
            code="nightly-export"
            description="Exports the day's orders from harbor to the archive, then sends the digest to the team."
            meta={<MetaLine items={['Owned by grace', 'Project harbor', 'Every night at 02:00']} />}
            actions={
                <>
                    <Button size="sm" variant="outline">
                        <History aria-hidden />
                        Run history
                    </Button>
                    <Button size="sm" variant="outline">
                        <CalendarClock aria-hidden />
                        Change the schedule
                    </Button>
                    <Button size="sm">
                        <Play aria-hidden />
                        Run
                    </Button>
                </>
            }
        />
    ),
}

/**
 * A job's head with more actions than a phone has room for: Run history, the schedule, Duplicate,
 * Export and Pinned give way from the last into More as the header narrows, while Run, the primary
 * action, stays, and the title keeps its whole width on the row.
 */
export const Folding: StoryObj = {
    render: function Render() {
        const [pinned, setPinned] = useState(false)
        return (
            <PageHeader
                title="Sync inventory"
                code="sync-inventory"
                meta={<MetaLine items={['Project juniper', 'Every hour']} />}
                items={[
                    { id: 'history', label: 'Run history', icon: <History aria-hidden />, onSelect: () => undefined },
                    { id: 'schedule', label: 'Change the schedule', icon: <CalendarClock aria-hidden />, onSelect: () => undefined },
                    { id: 'duplicate', label: 'Duplicate', icon: <Copy aria-hidden />, onSelect: () => undefined },
                    { id: 'export', label: 'Export', icon: <Download aria-hidden />, onSelect: () => undefined },
                    { id: 'pin', label: 'Pinned', icon: <Pin aria-hidden />, pressed: pinned, onSelect: () => setPinned(!pinned) },
                ]}
                actions={
                    <Button size="sm">
                        <Play aria-hidden />
                        Run
                    </Button>
                }
            />
        )
    },
}

/** A page reached from another: back level with the title, and the places above it, each a link back up. */
export const Trail: StoryObj = {
    render: () => (
        <PageHeader
            onBack={() => undefined}
            trail={[
                { label: 'Jobs', href: '#' },
                { label: 'nightly-export', href: '#', code: true },
            ]}
            title="Run 4812"
            meta={
                <>
                    <StatusChip status="failed" />
                    <MetaLine items={['Started at 02:00', 'Stopped at validate after 4 min']} />
                </>
            }
            actions={
                <Button size="sm">
                    <RotateCcw aria-hidden />
                    Run again
                </Button>
            }
        />
    ),
}

/**
 * A project's page: its mark set before the title block and centered on it, after the back button,
 * with the project's name over its code and its owner and jobs under them.
 */
export const Aside: StoryObj = {
    render: () => (
        <PageHeader
            onBack={() => undefined}
            trail={[{ label: 'Projects', href: '#' }]}
            aside={<PersonAvatar name="larkspur" initials="L" color="violet" shape="square" size="xl" />}
            title="Larkspur"
            code="larkspur"
            meta={<MetaLine items={['Owned by margaret', '3 jobs', 'Updated today']} />}
            actions={
                <Button size="sm" variant="outline">
                    <Settings aria-hidden />
                    Settings
                </Button>
            }
        />
    ),
}

/**
 * An album's head: back, the trail through the music and its artist, the artist and year under
 * the title, and Download, the favorite star and Add to playlist at the end, none of them naming
 * the album the page is about.
 */
export const Album: StoryObj = {
    render: function Render() {
        const [starred, setStarred] = useState(true)
        return (
            <PageHeader
                onBack={() => undefined}
                trail={[
                    { label: 'Music', href: '#' },
                    { label: 'Grace', href: '#' },
                ]}
                title="Open Water"
                meta={<MetaLine size="sm" items={['Grace', 2025, '10 tracks, 41 min']} />}
                actions={
                    <>
                        <Button size="sm" variant="outline">
                            <Download aria-hidden />
                            Download
                        </Button>
                        <StarButton variant="outline" starred={starred} onStarredChange={setStarred} />
                        <Button size="sm" variant="outline">
                            <ListPlus aria-hidden />
                            Add to playlist
                        </Button>
                    </>
                }
            />
        )
    },
}
