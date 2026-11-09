import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { Row, Split, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { PersonRow } from '@winterop-com/sokkel-ui/PersonRow'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { tableEditing } from '@winterop-com/sokkel-ui/table-editing'
import { Timeline } from '@winterop-com/sokkel-ui/Timeline'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { ArrowRightLeft, PhoneCall } from 'lucide-react'

import { dateOfMoment, dayOf, PEOPLE, type Person, type Shift, shifts } from '../data'
import { useRows } from '../rows'
import type { Settings } from '../settings'
import { formatDay, formatMoment } from '../status'

const PEOPLE_OPTIONS = PEOPLE.map((person) => ({ value: person, label: person }))

/** A `YYYY-MM-DD` day as a local date. */
function dateOf(day: string): Date {
    const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
    return new Date(year, month - 1, date)
}

function columns(today: string): DataColumn<Shift>[] {
    return [
        {
            id: 'week',
            header: 'Week',
            width: 'minmax(12rem,1fr)',
            cell: (shift) => {
                const ends = dateOf(shift.ends)
                ends.setDate(ends.getDate() - 1)
                return `${formatDay(dateOf(shift.starts))} to ${formatDay(ends)}`
            },
            sortValue: (shift) => shift.starts,
        },
        {
            id: 'when',
            header: 'When',
            width: '8rem',
            cell: (shift) =>
                shift.starts <= today && today < shift.ends ? (
                    <StatusChip status="on_call" label="this week" />
                ) : shift.ends <= today ? (
                    'past'
                ) : (
                    'ahead'
                ),
            stack: 'secondary',
        },
        {
            id: 'person',
            header: 'On call',
            width: '10rem',
            cell: (shift) => (
                <Row gap="2xs" inline>
                    <PersonAvatar name={shift.person} size="2xs" />
                    {shift.person}
                </Row>
            ),
            sortValue: (shift) => shift.person,
            edit: {
                editor: 'select',
                options: PEOPLE_OPTIONS,
                value: (shift) => shift.person,
                save: (shift, value) => shifts.update(shift.id, { person: value as Person }).then(() => undefined),
            },
        },
    ]
}

/** Who is on call now and since when, the rotation week by week with each week's person changed in place, and the handovers. */
export function OnCall({ options, onHandOver }: { options: Settings; onHandOver: () => void }) {
    const rows = useRows()
    const today = dayOf(new Date())
    const now = rows.onCall
    const rotation = [...(rows.shifts ?? [])].sort((left, right) => left.starts.localeCompare(right.starts))
    const next = rotation.find((shift) => shift.starts > today)
    const current = rotation.findIndex((shift) => shift.starts <= today && today < shift.ends)
    // The backup is whoever had last week, unless that is who has the pager now.
    const before = current > 0 ? rotation[current - 1]?.person : undefined
    const escalates =
        now === undefined
            ? undefined
            : before !== undefined && before !== now.person && before !== next?.person
              ? before
              : PEOPLE.find((person) => person !== now.person && person !== next?.person)
    return (
        <PageState loading={rows.onCall === undefined && rows.error === undefined} error={rows.error}>
            <Stack gap="page">
                <PageHeader
                    title="On call"
                    description="Who answers when something goes wrong, and the weeks ahead."
                    actions={
                        <Button onClick={onHandOver}>
                            <ArrowRightLeft aria-hidden />
                            Hand over
                        </Button>
                    }
                />
                <Split
                    width="lg"
                    aside={
                        <Section title="Handovers" meta={String(rows.handovers?.length ?? 0)}>
                            <Timeline
                                events={[...(rows.handovers ?? [])]
                                    .sort((left, right) => right.at.localeCompare(left.at))
                                    .map((handover) => ({
                                        id: handover.id,
                                        title: `${handover.from} to ${handover.to}`,
                                        at: <RelativeTime date={handover.at} />,
                                        detail: handover.note === '' ? formatMoment(new Date(handover.at), options.clock) : handover.note,
                                        icon: <PhoneCall aria-hidden />,
                                    }))}
                            />
                        </Section>
                    }
                >
                    <Stack gap="section">
                        {now !== undefined && (
                            <Section title="Now" description={now.note === '' ? undefined : `From the handover: ${now.note}`}>
                                <Stack gap="md">
                                    <PersonRow
                                        name={now.person}
                                        detail={`on call since ${formatMoment(dateOfMoment(now.since), options.clock)}`}
                                        aside={<StatusChip status="on_call" />}
                                    />
                                    {escalates !== undefined && (
                                        <PersonRow
                                            name={escalates}
                                            detail="takes it if nobody answers in 15 minutes"
                                            aside={<StatusChip status="waiting" label="escalation" />}
                                        />
                                    )}
                                    {next !== undefined && (
                                        <PersonRow
                                            name={next.person}
                                            detail={`on call from ${formatDay(dateOf(next.starts))}`}
                                            aside={<StatusChip status="queued" label="next week" />}
                                        />
                                    )}
                                </Stack>
                            </Section>
                        )}
                        <Section
                            title="Rotation"
                            description="A week each, Monday to Monday. Press a name to change who takes the week."
                            flush
                        >
                            <DataTable
                                variant="list"
                                minWidth="auto"
                                columns={columns(today)}
                                rows={rotation}
                                rowKey={(shift) => shift.id}
                                editing={tableEditing}
                            />
                        </Section>
                    </Stack>
                </Split>
            </Stack>
        </PageState>
    )
}
