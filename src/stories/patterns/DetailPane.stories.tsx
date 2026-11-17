import type { Meta, StoryObj } from '@storybook/react-vite'
import { Pencil } from 'lucide-react'
import type { ReactNode } from 'react'

import { DetailPane } from '@winterop-com/sokkel-ui/DetailPane'
import { DiffView } from '@winterop-com/sokkel-ui/DiffView'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Timeline } from '@winterop-com/sokkel-ui/Timeline'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'

/**
 * One thing's detail in a side panel's tab: titled sections of a sentence, the facts and whatever
 * else the thing shows, then its verbs. The run, the file and the event of the app stories all draw
 * their panes with it.
 */
const meta: Meta = { title: 'Patterns/Detail pane' }
export default meta

/** The panel at the page's right edge, the full height of the canvas. */
function Edge({ children }: { children: ReactNode }) {
    return (
        <Row gap="none" align="stretch" justify="end" className="h-svh bg-background text-foreground">
            {children}
        </Row>
    )
}

/** A run's facts alone, in the panel beside a page. */
export const Facts: StoryObj = {
    render: () => (
        <Edge>
            <SidePanel
                tabs={[
                    {
                        id: 'details',
                        label: 'Details',
                        content: (
                            <DetailPane
                                sections={[
                                    {
                                        id: 'run',
                                        title: 'Run',
                                        facts: [
                                            { term: 'Job', value: 'nightly-export', code: true },
                                            { term: 'State', value: <StatusChip status="failed" /> },
                                            { term: 'Started by', value: 'scheduler' },
                                            { term: 'Started', value: 'Today, 02:00' },
                                            { term: 'Duration', value: '8s', numeric: true },
                                        ],
                                    },
                                ]}
                            />
                        ),
                    },
                ]}
            />
        </Edge>
    ),
}

/** A run with its steps after its facts, and the verbs at the end. */
export const Sections: StoryObj = {
    render: () => (
        <Edge>
            <SidePanel
                tabs={[
                    {
                        id: 'details',
                        label: 'Details',
                        content: (
                            <DetailPane
                                sections={[
                                    {
                                        id: 'run',
                                        title: 'Run',
                                        facts: [
                                            { term: 'Job', value: 'nightly-export', code: true },
                                            { term: 'State', value: <StatusChip status="failed" /> },
                                            { term: 'Started by', value: 'scheduler' },
                                            { term: 'Started', value: 'Today, 02:00' },
                                        ],
                                    },
                                    {
                                        id: 'steps',
                                        title: 'Steps',
                                        content: (
                                            <Timeline
                                                events={[
                                                    {
                                                        id: 'fetch',
                                                        title: 'fetch',
                                                        at: '02:00:05',
                                                        tone: 'succeeded',
                                                    },
                                                    {
                                                        id: 'transform',
                                                        title: 'transform',
                                                        at: '02:00:06',
                                                        tone: 'succeeded',
                                                    },
                                                    {
                                                        id: 'validate',
                                                        title: 'validate',
                                                        at: '02:00:08',
                                                        detail: '37 rows rejected',
                                                        tone: 'failed',
                                                    },
                                                    {
                                                        id: 'upload',
                                                        title: 'upload',
                                                        detail: 'skipped',
                                                        tone: 'skipped',
                                                    },
                                                ]}
                                            />
                                        ),
                                    },
                                ]}
                                actions={
                                    <>
                                        <Button size="sm">Run again</Button>
                                        <Button variant="ghost" size="sm">
                                            <Pencil aria-hidden />
                                            Edit the job
                                        </Button>
                                    </>
                                }
                            />
                        ),
                    },
                ]}
            />
        </Edge>
    ),
}

/** An audit event: a sentence over its facts, and the change it made as a diff. */
export const Summary: StoryObj = {
    render: () => (
        <Edge>
            <SidePanel
                defaultSize={400}
                tabs={[
                    {
                        id: 'event',
                        label: 'Event',
                        content: (
                            <DetailPane
                                sections={[
                                    {
                                        id: 'event',
                                        title: 'Event',
                                        summary: 'grace changed the schedule of nightly-export',
                                        facts: [
                                            { term: 'Action', value: 'job.update', code: true },
                                            { term: 'Object', value: 'nightly-export', code: true },
                                            { term: 'When', value: 'Today, 09:12 UTC' },
                                            { term: 'From', value: '192.0.2.14', code: true },
                                        ],
                                    },
                                    {
                                        id: 'change',
                                        title: 'Change',
                                        content: (
                                            <DiffView
                                                before={'schedule: "0 2 * * *"\n'}
                                                after={'schedule: "0 3 * * *"\n'}
                                                title="nightly-export"
                                                size="sm"
                                            />
                                        ),
                                    },
                                ]}
                            />
                        ),
                    },
                ]}
            />
        </Edge>
    ),
}
