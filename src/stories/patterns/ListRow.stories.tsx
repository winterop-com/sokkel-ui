import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronRight, Clock, Server } from 'lucide-react'
import { useState } from 'react'

import { Chip } from '@winterop-com/sokkel-ui/Chip'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { Card, CardHeader, CardTitle } from '@winterop-com/sokkel-ui/primitives/card'
import { ListRow, ListRows } from '@winterop-com/sokkel-ui/ListRow'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'

/**
 * Rows of a list that is not a table: a title over a muted second line, with an icon before and an
 * aside after. Pressable, each row is a full-width button or link that opens its own detail.
 */
const meta: Meta = { title: 'Patterns/List row', parameters: { frame: 'padded' } }
export default meta

interface Failure {
    run: string
    job: string
    step: string
    reason: string
    when: string
    project: string
}

const FAILURES: Failure[] = [
    {
        run: 'run-4812',
        job: 'nightly-export',
        step: 'upload',
        reason: 'the bucket refused the write',
        when: '12 min ago',
        project: 'harbor',
    },
    { run: 'run-4807', job: 'sync-inventory', step: 'validate', reason: '14 rows have no site', when: '1 h ago', project: 'juniper' },
    {
        run: 'run-4799',
        job: 'import-orders',
        step: 'fetch',
        reason: 'api.example.org timed out after 30 s',
        when: '3 h ago',
        project: 'larkspur',
    },
    { run: 'run-4790', job: 'send-digest', step: 'notify', reason: 'no address for margaret', when: 'yesterday', project: 'harbor' },
]

/** Rows that only say something: no press, an icon before and a time after. */
export const Plain: StoryObj = {
    render: () => (
        <Section title="Schedule" variant="boxed" flush className="max-w-md">
            <ListRows>
                <ListRow icon={<Clock />} title="nightly-export" detail="Every day at 02:00" aside="worker" />
                <ListRow icon={<Clock />} title="sync-inventory" detail="Every hour" aside="worker" />
                <ListRow icon={<Clock />} title="send-digest" detail="Mondays at 08:00" aside="scheduler" />
            </ListRows>
        </Section>
    ),
}

/**
 * A job's failures, each row a button that opens its detail: the state's dot, the job over the
 * step and why it failed, and when. The open one is marked.
 */
export const Failures: StoryObj = {
    render: function Render() {
        const [open, setOpen] = useState('run-4807')
        return (
            <Section title="Failures" variant="boxed" flush className="max-w-xl">
                <ListRows label="Failures">
                    {FAILURES.map((failure) => (
                        <ListRow
                            key={failure.run}
                            icon={<Dot status="failed" size="md" />}
                            title={failure.job}
                            detail={`${failure.step}: ${failure.reason}`}
                            aside={
                                <>
                                    {failure.when}
                                    <ChevronRight className="size-4" aria-hidden />
                                </>
                            }
                            current={failure.run === open}
                            onPress={() => setOpen(failure.run)}
                        />
                    ))}
                </ListRows>
            </Section>
        )
    },
}

/**
 * Rows whose lines wrap rather than end in an ellipsis, for a reason a reader needs whole, each
 * saying on hover what a press opens.
 */
export const Wrapped: StoryObj = {
    render: () => (
        <Section title="Failures" variant="boxed" flush className="max-w-sm">
            <ListRows>
                {FAILURES.map((failure) => (
                    <ListRow
                        key={failure.run}
                        icon={<Dot status="failed" size="md" />}
                        title={`${failure.job} failed at ${failure.step}`}
                        detail={failure.reason}
                        aside={failure.when}
                        tooltip={`Open ${failure.run}`}
                        wrap
                        onPress={() => undefined}
                    />
                ))}
            </ListRows>
        </Section>
    ),
}

/**
 * Rows set flush in a panel: square, lined up with the panel's own padding and parted by
 * hairlines, the open one marked edge to edge.
 */
export const Flush: StoryObj = {
    render: function Render() {
        const [open, setOpen] = useState('run-4799')
        return (
            <Section title="Failures" variant="boxed" flush className="max-w-xl">
                <ListRows label="Failures" flush>
                    {FAILURES.map((failure) => (
                        <ListRow
                            key={failure.run}
                            icon={<Dot status="failed" size="md" />}
                            title={failure.job}
                            detail={`${failure.step}: ${failure.reason}`}
                            aside={<Chip mono>{failure.project}</Chip>}
                            current={failure.run === open}
                            onPress={() => setOpen(failure.run)}
                        />
                    ))}
                </ListRows>
            </Section>
        )
    },
}

const SERVICES = [
    { name: 'api', status: 'succeeded', note: 'p95 120 ms', host: 'api.example.org' },
    { name: 'worker', status: 'running', note: '3 runs in flight', host: 'worker.example.org' },
    { name: 'scheduler', status: 'failed', note: 'missed 2 ticks', host: 'scheduler.example.org' },
]

/**
 * Dense one-line rows in a card (`dense`), each a status dot and a mark before the service's name
 * in the code face (`mono`), its note beside it, and each opening its service, the open one marked.
 * A dense row that presses stands a finger tall on a phone. `inset="card"` lines the flush rows up
 * with the card's own padding, as its title is.
 */
export const Dense: StoryObj = {
    render: function Render() {
        const [open, setOpen] = useState('scheduler')
        return (
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle>Health</CardTitle>
                </CardHeader>
                <ListRows label="Services" flush inset="card">
                    {SERVICES.map((service) => (
                        <ListRow
                            key={service.name}
                            dense
                            mono
                            icon={
                                <>
                                    <Dot status={service.status} size="md" />
                                    <Server />
                                </>
                            }
                            title={service.name}
                            detail={service.note}
                            aside={service.host}
                            current={service.name === open}
                            onPress={() => setOpen(service.name)}
                        />
                    ))}
                </ListRows>
            </Card>
        )
    },
}

/** Rows that are links, each to its run's page, with the project as a chip at the end. */
export const Links: StoryObj = {
    render: () => (
        <Section title="Recent failures" variant="boxed" flush className="max-w-xl">
            <ListRows>
                {FAILURES.map((failure) => (
                    <ListRow
                        key={failure.run}
                        href={`#/runs/${failure.run}`}
                        title={failure.run}
                        detail={`${failure.job} at ${failure.step}`}
                        aside={<Chip mono>{failure.project}</Chip>}
                    />
                ))}
            </ListRows>
        </Section>
    ),
}

/**
 * Rows whose title alone is a link, in the quiet look: the ink around it, underlined only on hover,
 * so the row reads as a list and not as a page of links.
 */
export const LinkedTitles: StoryObj = {
    name: 'Linked titles',
    render: () => (
        <Section title="Failures" variant="boxed" flush className="max-w-xl">
            <ListRows>
                {FAILURES.map((failure) => (
                    <ListRow
                        key={failure.run}
                        icon={<Dot status="failed" size="md" />}
                        title={
                            <TextLink href={`#/jobs/${failure.job}`} variant="quiet">
                                {failure.job}
                            </TextLink>
                        }
                        detail={failure.reason}
                        aside={failure.when}
                    />
                ))}
            </ListRows>
        </Section>
    ),
}
