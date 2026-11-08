import type { Meta, StoryObj } from '@storybook/react-vite'
import { Activity, CalendarDays, Server } from 'lucide-react'
import { useState } from 'react'

import { EventDetails } from '@winterop-com/sokkel-ui/calendar/EventDetails'
import { weekOf, type CalendarEvent } from '@winterop-com/sokkel-ui/calendar/events'
import { WeekGrid } from '@winterop-com/sokkel-ui/calendar/WeekGrid'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Surface } from '@winterop-com/sokkel-ui/Section'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { pictureOf } from '../fixtures/portraits'

/** What an event is, as a calendar's popover or a dialog shows it. */
const meta: Meta = { title: 'Patterns/Event details' }
export default meta

const NOW = new Date(2026, 10, 5, 9, 30)
const at = (date: number, hour: number, minute = 0) => new Date(2026, 10, date, hour, minute)

const REVIEW: CalendarEvent = {
    id: 'review',
    title: 'Board review',
    start: at(5, 13),
    end: at(5, 14),
    color: 'green',
    detail: 'Room Fjord',
}
const EXPORT: CalendarEvent = { id: 'export', title: 'nightly-export', start: at(4, 2), end: at(4, 2, 20), color: 'blue' }
const OFFSITE: CalendarEvent = { id: 'offsite', title: 'Team days', start: at(25, 0), end: at(26, 0), allDay: true, color: 'violet' }

const PEOPLE = ['ada', 'grace', 'linus', 'margaret'].map((name) => ({ name, image: pictureOf(name) }))
const MANY = [...PEOPLE, ...['ada.b', 'grace.h', 'linus.t', 'margaret.h'].map((name) => ({ name }))]

const review = (
    <EventDetails
        event={REVIEW}
        facts={[{ id: 'calendar', icon: <CalendarDays />, content: 'Team' }]}
        location="Room Fjord"
        people={PEOPLE}
        notes="Walk the board from Review back to Ready. In progress is over its limit of four."
        actions={
            <Button size="sm" variant="outline">
                Edit
            </Button>
        }
    />
)

/** A meeting: its calendar, room, people and notes, with Edit at its foot. */
export const Meeting: StoryObj = {
    parameters: { frame: 'padded' },
    render: () => <Surface className="w-80 max-w-full p-3.5">{review}</Surface>,
}

/** A job's run, its name in the code face, with its state and host as facts and no people. */
export const Run: StoryObj = {
    parameters: { frame: 'padded' },
    render: () => (
        <Surface className="w-80 max-w-full p-3.5">
            <EventDetails
                event={EXPORT}
                code
                facts={[
                    { id: 'calendar', icon: <CalendarDays />, content: 'Job runs' },
                    { id: 'state', icon: <Activity />, content: <StatusChip status="failed" /> },
                    { id: 'host', icon: <Server />, content: <span className="font-mono text-xs">worker-1.example.org</span> },
                ]}
                actions={
                    <Button size="sm" variant="outline">
                        Open run
                    </Button>
                }
            />
        </Surface>
    ),
}

/** Two all-day days with eight people: five pictures and a count of the rest, every name after them. */
export const Crowded: StoryObj = {
    parameters: { frame: 'padded' },
    render: () => (
        <Surface className="w-80 max-w-full p-3.5">
            <EventDetails event={OFFSITE} location="Harbor office, third floor" people={MANY} />
        </Surface>
    ),
}

function InGrid() {
    const [open, setOpen] = useState<string | null>('review')
    return (
        <WeekGrid
            days={weekOf(NOW)}
            events={[REVIEW, EXPORT]}
            now={NOW}
            scrollToHour={11}
            renderDetail={() => review}
            openEvent={open}
            onOpenEventChange={setOpen}
            className="h-dvh"
        />
    )
}

/** The details as a week's popover, opened from the board review. */
export const Popover: StoryObj = { parameters: { layout: 'fullscreen' }, render: () => <InGrid /> }

function InDialog() {
    const [open, setOpen] = useState(true)
    return (
        <>
            <WeekGrid
                days={weekOf(NOW)}
                events={[REVIEW, EXPORT]}
                now={NOW}
                scrollToHour={11}
                onSelectEvent={() => setOpen(true)}
                className="h-dvh"
            />
            <DialogShell open={open} onOpenChange={setOpen} width="sm" title="Event">
                {review}
            </DialogShell>
        </>
    )
}

/** The same details in a dialog over the week, as a phone or a list of events opens them; pressing an event opens it again. */
export const Dialog: StoryObj = { parameters: { layout: 'fullscreen' }, render: () => <InDialog /> }
