import type { Meta, StoryObj } from '@storybook/react-vite'
import { Play } from 'lucide-react'
import { useState } from 'react'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { InlineEdit, type EditOption } from '@winterop-com/sokkel-ui/InlineEdit'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

/**
 * A value shown as text that turns into an editor on a press, Enter or F2. Enter saves, Escape
 * drops what was typed, and leaving saves it. While the app saves, the editor holds the value with a
 * spinner; a refusal keeps it open on what was typed, the reason in the mark at its end. Tidevann's
 * jobs edit their name, schedule, retries, owner and description in place.
 */
const meta: Meta = {
    title: 'Patterns/Inline edit',
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

const OWNERS: EditOption[] = [
    { value: 'ada', label: 'ada' },
    { value: 'grace', label: 'grace' },
    { value: 'linus', label: 'linus' },
    { value: 'margaret', label: 'margaret' },
]

/** A save that takes as long as a request to Tidevann's api would. */
const pause = (ms = 700) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** What Tidevann's scheduler says of a schedule it cannot read. */
async function saveSchedule(schedule: string) {
    await pause()
    if (schedule.trim().split(/\s+/).length !== 5) throw new Error('The scheduler reads five fields: minute, hour, day, month and weekday.')
}

const atMostTen = (retries: number | null) => (retries !== null && (retries < 0 || retries > 10) ? 'Retries go from 0 to 10.' : undefined)

/** One field's value: press it, or focus it and press Enter or F2, then Enter to save after a short wait. */
export const Field: StoryObj = {
    render: () => (
        <Stack className="max-w-sm">
            <InlineEdit label="Schedule" defaultValue="0 2 * * *" onSave={saveSchedule} />
        </Stack>
    ),
}

/** A page's title edited in place, in the title's own type, inside `PageHeader`. */
export const Title: StoryObj = {
    render: function TitleStory() {
        const [name, setName] = useState('Nightly export')
        return (
            <PageHeader
                title={
                    <InlineEdit
                        label="Name"
                        variant="title"
                        value={name}
                        onSave={async (next) => {
                            await pause()
                            setName(next)
                        }}
                    />
                }
                code="nightly-export"
                description="Exports the day's orders from harbor to the archive, then sends the digest to the team."
            />
        )
    },
}

/**
 * Each editor: a line of text, several lines (saved with ⌘ or Ctrl and Enter, or Save), a number,
 * a date and a time typed into `NumberField`, `DateField` and `TimeField`, the date with its
 * calendar and the time with its list of times, and a choice.
 */
export const Editors: StoryObj = {
    render: () => (
        <Stack className="max-w-lg">
            <DescriptionList
                termWidth="7rem"
                items={[
                    { term: 'Schedule', value: <InlineEdit label="Schedule" defaultValue="0 2 * * *" onSave={saveSchedule} /> },
                    {
                        term: 'Description',
                        value: (
                            <InlineEdit
                                label="Description"
                                editor="multiline"
                                defaultValue={"Exports the day's orders to the archive.\nSends the digest once the upload is done."}
                                onSave={() => pause()}
                            />
                        ),
                    },
                    {
                        term: 'Retries',
                        value: <InlineEdit label="Retries" editor="number" defaultValue={3} validate={atMostTen} onSave={() => pause()} />,
                    },
                    {
                        term: 'Paused until',
                        value: (
                            <InlineEdit
                                label="Paused until"
                                editor="date"
                                defaultValue="2026-11-20"
                                placeholder="Running"
                                onSave={() => pause()}
                            />
                        ),
                    },
                    {
                        term: 'Runs at',
                        value: (
                            <InlineEdit
                                label="Runs at"
                                editor="time"
                                defaultValue="02:30"
                                display={(time) => `${time ?? ''} UTC`}
                                onSave={() => pause()}
                            />
                        ),
                    },
                    {
                        term: 'Owner',
                        value: <InlineEdit label="Owner" editor="select" options={OWNERS} defaultValue="grace" onSave={() => pause()} />,
                    },
                ]}
            />
        </Stack>
    ),
}

/** The editor open on the value, its text selected, as a press, Enter or F2 leaves it. */
export const Open: StoryObj = {
    render: () => (
        <Stack className="max-w-sm">
            <InlineEdit label="Schedule" defaultValue="0 2 * * *" defaultEditing onSave={saveSchedule} />
        </Stack>
    ),
}

/** A save running: the typed value held read only, a spinner at its end. */
export const Saving: StoryObj = {
    render: () => (
        <Stack className="max-w-sm">
            <InlineEdit
                label="Schedule"
                defaultValue="0 2 * * *"
                defaultEditing={{ draft: '30 2 * * *', saving: true }}
                onSave={saveSchedule}
            />
        </Stack>
    ),
}

/** A save refused: the editor stays open on what was typed, with a critical edge and the app's reason opened from its mark. */
export const Refused: StoryObj = {
    render: () => (
        <Stack className="max-w-sm">
            <InlineEdit
                label="Schedule"
                defaultValue="0 2 * * *"
                defaultEditing={{ draft: 'every night', error: 'The scheduler reads five fields: minute, hour, day, month and weekday.' }}
                onSave={saveSchedule}
            />
        </Stack>
    ),
}

/** A value that cannot be edited now, shown read only. */
export const ReadOnly: StoryObj = {
    name: 'Read only',
    render: () => (
        <Stack className="max-w-sm">
            <InlineEdit label="Schedule" defaultValue="0 2 * * *" disabled onSave={saveSchedule} />
        </Stack>
    ),
}

/**
 * A job's page with its name and settings edited in place: the schedule refused by the scheduler
 * unless it has five fields, the retries refused past ten before anything is sent, and the owner
 * and the description saved after a short wait.
 */
export const JobPage: StoryObj = {
    name: 'Job page',
    render: function JobPageStory() {
        const [name, setName] = useState('Nightly export')
        const [schedule, setSchedule] = useState('0 2 * * *')
        const [owner, setOwner] = useState('grace')
        return (
            <Stack gap="page" className="max-w-3xl">
                <PageHeader
                    title={
                        <InlineEdit
                            label="Name"
                            variant="title"
                            value={name}
                            onSave={async (next) => {
                                await pause()
                                setName(next)
                            }}
                        />
                    }
                    code="nightly-export"
                    meta={<MetaLine items={[`Owned by ${owner}`, 'Project harbor', `Runs at ${schedule}`]} />}
                    actions={
                        <Button size="sm">
                            <Play aria-hidden />
                            Run
                        </Button>
                    }
                />
                <Section title="Settings" description="Each setting saves on its own as it is changed.">
                    <DescriptionList
                        termWidth="7rem"
                        items={[
                            {
                                term: 'Schedule',
                                value: (
                                    <InlineEdit
                                        label="Schedule"
                                        value={schedule}
                                        onSave={async (next) => {
                                            await saveSchedule(next)
                                            setSchedule(next)
                                        }}
                                    />
                                ),
                            },
                            {
                                term: 'Retries',
                                value: (
                                    <InlineEdit
                                        label="Retries"
                                        editor="number"
                                        defaultValue={3}
                                        validate={atMostTen}
                                        onSave={() => pause()}
                                    />
                                ),
                            },
                            {
                                term: 'Owner',
                                value: (
                                    <InlineEdit
                                        label="Owner"
                                        editor="select"
                                        options={OWNERS}
                                        value={owner}
                                        onSave={async (next) => {
                                            await pause()
                                            setOwner(next)
                                        }}
                                    />
                                ),
                            },
                            {
                                term: 'Timeout',
                                value: (
                                    <InlineEdit
                                        label="Timeout"
                                        editor="number"
                                        defaultValue={null}
                                        placeholder="None"
                                        display={(minutes) => (minutes === null ? 'None' : `${String(minutes)} min`)}
                                        onSave={() => pause()}
                                    />
                                ),
                            },
                            {
                                term: 'Description',
                                value: (
                                    <InlineEdit
                                        label="Description"
                                        editor="multiline"
                                        defaultValue="Exports the day's orders from harbor to the archive, then sends the digest to the team."
                                        onSave={() => pause()}
                                    />
                                ),
                            },
                            { term: 'Last run', value: <StatusChip status="succeeded" /> },
                            {
                                term: 'Project',
                                value: <InlineEdit label="Project" defaultValue="harbor" disabled onSave={() => pause()} />,
                            },
                        ]}
                    />
                </Section>
            </Stack>
        )
    },
}
