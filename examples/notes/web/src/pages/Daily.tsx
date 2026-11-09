import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Markdown } from '@winterop-com/sokkel-ui/Markdown'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { MiniMonth } from '@winterop-com/sokkel-ui/calendar/MiniMonth'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { CalendarPlus, Settings } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { dateOf, day, fromTemplate, longDay, wordCount, type Note } from '../model'
import { useVault } from '../state'
import { noteActions } from './AllNotes'

/** The journal: today's note a press away, a month to jump to any day, and the days written so far. */
export function Daily() {
    const state = useVault()
    const { vault, prefs, openDay, open } = state
    const today = day(0)
    const [month, setMonth] = useState(() => dateOf(today))
    const days = vault.notes.filter((note) => note.day !== undefined).sort((a, b) => (b.day ?? '').localeCompare(a.day ?? ''))
    const written = days.find((note) => note.day === today)
    const folder = prefs.dailyFolder === null ? 'the top of the vault' : vault.path(prefs.dailyFolder)

    const columns: DataColumn<Note>[] = [
        {
            id: 'day',
            header: 'Day',
            width: '7.5rem',
            cell: (note) => <span className="tabular-nums">{note.day}</span>,
            sortValue: (note) => note.day ?? '',
        },
        { id: 'long', header: 'Date', width: 'minmax(12rem,1fr)', cell: (note) => longDay(note.day ?? today) },
        {
            id: 'words',
            header: 'Words',
            width: '6rem',
            align: 'end',
            stack: 'secondary',
            cell: (note) => wordCount(note.body),
            sortValue: (note) => wordCount(note.body),
        },
        {
            id: 'links',
            header: 'Links out',
            width: '6.5rem',
            align: 'end',
            stack: 'secondary',
            cell: (note) => vault.links.get(note.id)?.length ?? 0,
        },
    ]

    return (
        <>
            <PageHeader
                title="Daily"
                count={`${String(days.length)} days`}
                description={`A note a day, made from the template in ${folder}.`}
                actions={
                    <>
                        <Button size="sm" variant="ghost" onClick={() => go('/settings')}>
                            <Settings />
                            Template
                        </Button>
                        <Button size="sm" onClick={() => openDay(today)}>
                            <CalendarPlus />
                            {written === undefined ? "Start today's note" : "Open today's note"}
                        </Button>
                    </>
                }
            />
            <Row gap="section" align="start" stackBelow="md">
                <Stack gap="section" className="w-full shrink-0 md:w-72">
                    <Section title="Jump to a day" description="A day with a note carries a dot; any other starts one.">
                        <MiniMonth
                            month={month}
                            onMonthChange={setMonth}
                            value={dateOf(today)}
                            now={dateOf(today)}
                            marked={days.map((note) => dateOf(note.day ?? today))}
                            onValueChange={(picked) => openDay(day(0, picked))}
                        />
                    </Section>
                    <Section title="Template" description={`What a new day's note starts with; {{date}} is the day.`}>
                        <Markdown content={fromTemplate(prefs.template, today)} scale="message" />
                    </Section>
                </Stack>
                <Section title="Days written" flush className="min-w-0 flex-1">
                    <DataTable
                        variant="list"
                        minWidth="auto"
                        stackLayout="compact"
                        columns={columns}
                        rows={days}
                        rowKey={(note) => note.id}
                        defaultSort={{ column: 'day', direction: 'desc' }}
                        onOpen={(note) => open(note.id)}
                        rowActions={noteActions(state)}
                        empty="No day written yet. Start today's note."
                    />
                </Section>
            </Row>
        </>
    )
}
