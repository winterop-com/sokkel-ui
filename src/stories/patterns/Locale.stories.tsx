import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import en from '@winterop-com/sokkel-ui/messages/en.json'
import { CallBar } from '@winterop-com/sokkel-ui/CallBar'
import { MiniMonth } from '@winterop-com/sokkel-ui/calendar/MiniMonth'
import { DataTable, DATA_TABLE_PART, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DateField } from '@winterop-com/sokkel-ui/DateField'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { EmojiPicker } from '@winterop-com/sokkel-ui/EmojiPicker'
import { IssueCount } from '@winterop-com/sokkel-ui/IssueMark'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { LocaleProvider, useLocale, useWords } from '@winterop-com/sokkel-ui/LocaleProvider'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { NB_MESSAGES } from '../fixtures/messages-nb'
import { makeRuns, type TableRun } from '../fixtures/tableRuns'

/**
 * Translating the library: `LocaleProvider` around the page with a locale and a catalog of ICU
 * messages by id. Here a small Norwegian catalog spread over the core's English `messages/en.json`
 * translates a few parts, while every number, date and sort follows `nb-NO`, even in words it does
 * not translate. A part's own `words` would still win over both.
 */
const meta: Meta = { title: 'Patterns/Locale', parameters: { frame: 'padded' } }
export default meta

type Language = 'en-US' | 'nb-NO'

const CATALOGS: Record<Language, Record<string, string> | undefined> = { 'en-US': undefined, 'nb-NO': { ...en, ...NB_MESSAGES } }

/** The month the calendar shows and the day it takes as today, fixed so the story draws the same each time. */
const TODAY = new Date(2026, 10, 17)

const COLUMNS: DataColumn<TableRun>[] = [
    { id: 'id', header: 'Run', width: '8.5rem', cell: (run) => <span className="font-mono">{run.id}</span>, sortValue: (run) => run.id },
    {
        id: 'job',
        header: 'Job',
        width: 'minmax(10rem,1fr)',
        cell: (run) => <span className="font-mono">{run.job}</span>,
        sortValue: (run) => run.job,
    },
    { id: 'project', header: 'Project', width: '7rem', cell: (run) => run.project, sortValue: (run) => run.project },
    {
        id: 'records',
        header: 'Records',
        width: '7rem',
        align: 'end',
        cell: (run) => <Figure value={run.records} />,
        sortValue: (run) => run.records,
    },
]

/** A figure in the provider's locale, as an app's own cell writes one. */
function Figure({ value }: { value: number }) {
    return value.toLocaleString(useLocale())
}

/** A data table's count of rows at a few counts, so the plural is seen to switch with the locale's rules. */
function Plurals() {
    const words = useWords(DATA_TABLE_PART)
    return <DescriptionList items={[0, 1, 2, 5, 1234].map((count) => ({ term: String(count), value: words.rows(count), numeric: true }))} />
}

/** The parts a catalog translates, side by side, in the language the switch holds. */
function Page({ start }: { start: Language }) {
    const [language, setLanguage] = useState<Language>(start)
    const [date, setDate] = useState<string | null>('2026-10-28')
    const [muted, setMuted] = useState(false)
    return (
        <TooltipProvider>
            <Stack gap="lg">
                <Segmented
                    label="Language"
                    value={language}
                    options={[
                        { value: 'en-US', label: 'English' },
                        { value: 'nb-NO', label: 'Norsk bokmål' },
                    ]}
                    onValueChange={setLanguage}
                />
                <LocaleProvider locale={language} messages={CATALOGS[language]}>
                    <Stack gap="lg">
                        <DataTable
                            columns={COLUMNS}
                            rows={makeRuns(1234)}
                            rowKey={(run) => run.id}
                            selectable
                            paging="client"
                            defaultSelection={new Set(['run_8f3a00'])}
                        />
                        <Columns count={3} min="sm">
                            <Section title="Plurals">
                                <Plurals />
                            </Section>
                            <Section title="Date field">
                                <Stack gap="md">
                                    <DateField
                                        id="locale-due"
                                        label="Due"
                                        value={date}
                                        onValueChange={setDate}
                                        min="2026-11-01"
                                        today="2026-11-17"
                                        required
                                    />
                                    <IssueCount critical={1} warning={2} list={[]} />
                                </Stack>
                            </Section>
                            <Section title="Calendar">
                                <MiniMonth month={TODAY} value={TODAY} now={TODAY} weekStartsOn={1} />
                            </Section>
                        </Columns>
                        <CallBar muted={muted} onMutedChange={setMuted} onLeave={() => undefined} placement="docked" />
                        <EmojiPicker autoFocus={false} storeKey="locale-story" recent={[]} onPick={() => undefined} />
                    </Stack>
                </LocaleProvider>
            </Stack>
        </TooltipProvider>
    )
}

/** The parts in English, as they are without a provider: counts and dates in en-US. */
export const English: StoryObj = { render: () => <Page start="en-US" /> }

/** The same parts under `LocaleProvider` with `nb-NO` and a small Norwegian catalog: words, plurals, numbers, dates and the calendar's weekdays in bokmål. */
export const Norwegian: StoryObj = { render: () => <Page start="nb-NO" /> }
