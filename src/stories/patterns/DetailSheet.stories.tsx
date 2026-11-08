import type { Meta, StoryObj } from '@storybook/react-vite'
import { ArrowUpRight, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { DetailSheet } from '@winterop-com/sokkel-ui/DetailSheet'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { Badge } from '@winterop-com/sokkel-ui/primitives/badge'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

/**
 * One thing's detail in a sheet from the right, so a row is read without leaving its list: the
 * head with the code, the title, the chips and the actions on one line, and the same parts the
 * thing's own page draws in the body.
 */
const meta: Meta = { title: 'Patterns/Detail sheet' }
export default meta

interface Step {
    step: string
    state: Status
    duration: string
    records: string
}

const STEPS: Step[] = [
    { step: 'fetch', state: 'succeeded', duration: '0.8s', records: '12,480' },
    { step: 'transform', state: 'succeeded', duration: '2.1s', records: '12,480' },
    { step: 'validate', state: 'succeeded', duration: '0.4s', records: '12,471' },
    { step: 'upload', state: 'failed', duration: '0.3s', records: '0' },
    { step: 'notify', state: 'skipped', duration: '', records: '' },
]

const COLUMNS: DataColumn<Step>[] = [
    { id: 'step', header: 'Step', width: 'minmax(8rem,1fr)', cell: (row) => <span className="font-mono">{row.step}</span> },
    { id: 'state', header: 'State', width: '7rem', cell: (row) => <StatusChip status={row.state} /> },
    { id: 'duration', header: 'Took', width: '5rem', align: 'end', cell: (row) => row.duration, sortValue: (row) => row.duration },
    { id: 'records', header: 'Records', width: '6rem', align: 'end', cell: (row) => row.records },
]

function RunSheet() {
    const [open, setOpen] = useState(true)
    return (
        <TooltipProvider>
            <Button variant="outline" onClick={() => setOpen(true)}>
                Open the run
            </Button>
            <DetailSheet
                open={open}
                onOpenChange={setOpen}
                code="01a1a5c6"
                title="nightly-export"
                chips={
                    <>
                        <Badge kind="teal">Scheduled</Badge>
                        <StatusChip status="failed" />
                        <Badge variant="outline">harbor</Badge>
                    </>
                }
                actions={
                    <>
                        <Button size="sm" variant="outline" render={<a href="#" />}>
                            Open the full page
                            <ArrowUpRight data-icon="inline-end" aria-hidden />
                        </Button>
                        <ApiLink path="/api/runs/01a1a5c6" />
                    </>
                }
                foot={
                    <Button size="sm">
                        <RotateCcw aria-hidden />
                        Run again
                    </Button>
                }
            >
                <Section title="Run" description="What the scheduler started and how far it came before upload was refused.">
                    <DescriptionList
                        layout="stacked"
                        columns={2}
                        items={[
                            { term: 'Started', value: 'Nov 4, 02:00:04' },
                            { term: 'Took', value: '3.6s' },
                            { term: 'Started by', value: 'schedule' },
                            { term: 'Worker', value: 'worker-3', code: true },
                        ]}
                    />
                </Section>
                <Section variant="flat" title="Steps" meta="5">
                    <DataTable variant="list" columns={COLUMNS} rows={STEPS} rowKey={(row) => row.step} />
                </Section>
            </DetailSheet>
        </TooltipProvider>
    )
}

/** A failed run open from its list: its kind, state and project as chips beside the full page and the request, its facts and steps in the body, and Run again at the foot. */
export const Open: StoryObj = { render: () => <RunSheet /> }
