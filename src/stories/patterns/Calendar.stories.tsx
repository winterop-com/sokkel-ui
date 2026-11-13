import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DayAgenda as DayAgendaPart } from '@winterop-com/sokkel-ui/calendar/DayAgenda'
import { DayStrip as DayStripPart } from '@winterop-com/sokkel-ui/calendar/DayStrip'
import type { CalendarEventChange } from '@winterop-com/sokkel-ui/calendar/event-change'
import { weekOf, type CalendarEvent } from '@winterop-com/sokkel-ui/calendar/events'
import { MiniMonth as MiniMonthPart } from '@winterop-com/sokkel-ui/calendar/MiniMonth'
import { MonthGrid as MonthGridPart } from '@winterop-com/sokkel-ui/calendar/MonthGrid'
import { WeekGrid as WeekGridPart } from '@winterop-com/sokkel-ui/calendar/WeekGrid'

/** The parts of a calendar: a mini month, the week's grid, the month's grid, and a day as a list. */
const meta: Meta = { title: 'Patterns/Calendar' }
export default meta

const NOW = new Date(2026, 10, 5, 9, 30)
const at = (date: number, hour: number, minute = 0) => new Date(2026, 10, date, hour, minute)

const EVENTS: CalendarEvent[] = [
    { id: 'oncall', title: 'On call: linus', start: at(2, 0), end: at(4, 0), allDay: true, color: 'pink' },
    { id: 'freeze', title: 'harbor change freeze', start: at(5, 0), end: at(5, 0), allDay: true, color: 'violet' },
    { id: 'planning', title: 'Planning', start: at(2, 10), end: at(2, 11), color: 'green', detail: 'Room Fjord' },
    { id: 'export-3', title: 'nightly-export', start: at(3, 8), end: at(3, 8, 20), color: 'blue' },
    { id: 'standup', title: 'Standup', start: at(5, 9, 15), end: at(5, 9, 30), color: 'green' },
    { id: 'review', title: 'Board review', start: at(5, 13), end: at(5, 14), color: 'green', detail: 'Room Fjord' },
    { id: 'one-on-one', title: '1:1 ada and grace', start: at(5, 13), end: at(5, 13, 45), color: 'green' },
    { id: 'deploy', title: 'Deploy juniper 2.1.0', start: at(5, 13, 30), end: at(5, 14, 15), color: 'violet', detail: 'api.example.org' },
    { id: 'sync', title: 'sync-inventory', start: at(4, 14), end: at(4, 14, 45), color: 'blue', muted: true },
    { id: 'retro', title: 'Retro', start: at(5, 16), end: at(5, 17), color: 'green' },
    { id: 'focus', title: 'Focus: export formats', start: at(6, 10), end: at(6, 12), color: 'teal' },
    { id: 'rebuild', title: 'rebuild-index', start: at(8, 3), end: at(8, 4, 30), color: 'blue' },
    { id: 'away', title: 'ada away', start: at(23, 0), end: at(27, 0), allDay: true, color: 'jade' },
    { id: 'deploy-2', title: 'Deploy harbor 1.4.1', start: at(12, 11), end: at(12, 11, 30), color: 'violet' },
]

function Mini() {
    const [month, setMonth] = useState(NOW)
    const [chosen, setChosen] = useState(at(5, 0))
    const week = weekOf(chosen)
    return (
        <div className="w-64 p-6">
            <MiniMonthPart
                month={month}
                onMonthChange={setMonth}
                value={chosen}
                onValueChange={setChosen}
                now={NOW}
                range={{ start: week[0], end: week[6] }}
                marked={EVENTS.map((event) => event.start)}
            />
        </div>
    )
}

/** A month for a sidebar: today in the accent, the week in view washed, and dots on days with events. */
export const MiniMonth: StoryObj = { name: 'Mini month', render: () => <Mini /> }

function Strip() {
    const [chosen, setChosen] = useState(at(5, 0))
    return (
        <div className="max-w-md p-6">
            <DayStripPart days={weekOf(chosen)} value={chosen} today={NOW} onValueChange={setChosen} />
        </div>
    )
}

/** A week of days to choose from, as a phone shows above its agenda: today in the accent, the chosen day filled. */
export const DayStrip: StoryObj = { name: 'Day strip', render: () => <Strip /> }

/** A day's events as a list, with the line at now between the past and the rest. */
export const DayAgenda: StoryObj = {
    name: 'Day agenda',
    render: () => (
        <div className="w-96 max-w-full p-6">
            <DayAgendaPart day={at(5, 0)} events={EVENTS} now={NOW} />
        </div>
    ),
}

/** The week of 2 November from 07:00, with overlapping events on Thursday split three ways. */
export const WeekGrid: StoryObj = {
    name: 'Week grid',
    render: () => <WeekGridPart days={weekOf(NOW)} events={EVENTS} now={NOW} className="h-svh" />,
}

/** November as a grid, two events a day before a day says how many more it holds. */
export const MonthGrid: StoryObj = {
    name: 'Month grid',
    render: () => <MonthGridPart month={NOW} events={EVENTS} now={NOW} max={2} className="h-svh" />,
}

/** The events in the story's state, each change put in its place. */
function useEvents() {
    const [events, setEvents] = useState(EVENTS)
    const change = ({ event, start, end }: CalendarEventChange) =>
        setEvents((now) => now.map((each) => (each.id === event.id ? { ...each, start, end } : each)))
    return { events, change }
}

/**
 * The week with its events moved and resized: an event drags to another day and time, an outline
 * showing where it lands at the quarter hour; a block's lower edge, and an all-day bar's right end,
 * drag its end. With an event focused, Alt and the arrows move it a quarter hour or a day, and with
 * Shift its end. The muted sync-inventory run stays where it is.
 */
export const WeekMoves: StoryObj = {
    name: 'Week moves',
    render: function Render() {
        const { events, change } = useEvents()
        return (
            <WeekGridPart
                days={weekOf(NOW)}
                events={events}
                now={NOW}
                onEventMove={change}
                onEventResize={change}
                canChange={(event) => event.muted !== true}
                className="h-svh"
            />
        )
    },
}

/**
 * The month with its events moved and resized: an event drags to another day, the days it would
 * cover washed, and its right end on its last day drags that day. Alt and the arrows move the
 * focused event a day or a week, and with Shift its last day.
 */
export const MonthMoves: StoryObj = {
    name: 'Month moves',
    render: function Render() {
        const { events, change } = useEvents()
        return <MonthGridPart month={NOW} events={events} now={NOW} max={3} onEventMove={change} onEventResize={change} className="h-svh" />
    },
}
