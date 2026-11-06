import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { MessageRow, type MessageLabel } from '../../components/MessageRow'

/** A row of a message list, alone and in a list column with every mark it carries. */
const HARBOR: MessageLabel = { id: 'harbor', label: 'harbor', color: 'var(--color-kind-blue)' }
const JUNIPER: MessageLabel = { id: 'juniper', label: 'juniper', color: 'var(--color-kind-green)' }

function Column({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto w-full max-w-md overflow-hidden rounded-surface border border-border-strong bg-card">{children}</div>
}

function Rows({ highlight }: { highlight?: string }) {
    const [checked, setChecked] = useState<string[]>(['b'])
    const [starred, setStarred] = useState<string[]>(['a'])
    const rows = [
        {
            id: 'a',
            from: 'Grace',
            subject: 'Harbor launch checklist',
            snippet: 'Linus is right about the cutover window. I have attached the final checklist.',
            time: '09:42',
            unread: true,
            attachment: true,
            count: 4,
            labels: [HARBOR],
        },
        {
            id: 'b',
            from: 'Tidevann scheduler',
            subject: 'nightly-export failed at validate',
            snippet: '37 rows of orders-2026-10.csv were rejected.',
            time: '08:15',
            unread: true,
        },
        {
            id: 'c',
            from: 'Margaret',
            subject: 'Re: sync-inventory schedule',
            snippet: 'Every hour on weekdays works for the warehouse. Weekends can stay at once a day.',
            time: 'Nov 3',
            count: 5,
            labels: [JUNIPER],
        },
        {
            id: 'd',
            from: 'Linus',
            subject: 'Photos from the harbor site visit',
            snippet: 'Twelve photos of the loading dock and the new office.',
            time: 'Nov 3',
            attachment: true,
            labels: [HARBOR],
        },
    ]
    return (
        <>
            {rows.map((row) => (
                <MessageRow
                    key={row.id}
                    {...row}
                    open={row.id === 'c'}
                    starred={starred.includes(row.id)}
                    checked={checked.includes(row.id)}
                    onCheckedChange={(on) => setChecked((current) => (on ? [...current, row.id] : current.filter((id) => id !== row.id)))}
                    onStarredChange={(on) => setStarred((current) => (on ? [...current, row.id] : current.filter((id) => id !== row.id)))}
                    highlight={highlight}
                />
            ))}
        </>
    )
}

const meta: Meta = { title: 'Patterns/Message row', parameters: { frame: 'padded' } }
export default meta

/** One read row with no controls, as a list that cannot select or star draws it. */
export const Plain: StoryObj = {
    render: () => (
        <Column>
            <MessageRow
                from="Margaret"
                subject="Welcome to larkspur"
                snippet="I have added you to the larkspur project. The first thing to look at is the scheduler."
                time="Oct 30"
                starred
            />
        </Column>
    ),
}

/** Unread, checked, open, starred, with attachments, threads and labels. */
export const List: StoryObj = {
    render: () => (
        <Column>
            <Rows />
        </Column>
    ),
}

/** The same rows with a search term marked wherever it occurs. */
export const Highlighted: StoryObj = {
    render: () => (
        <Column>
            <Rows highlight="harbor" />
        </Column>
    ),
}
