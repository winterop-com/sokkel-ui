import { CheckboxField } from '@winterop-com/sokkel-ui/CheckboxField'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { addMonths, addWeeks, format, getDay, isSameMonth } from 'date-fns'
import {
    Activity,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    KanbanSquare,
    LayoutDashboard,
    ListChecks,
    Play,
    Plus,
    Server,
    Settings,
} from 'lucide-react'
import { useState } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { DayAgenda } from '@winterop-com/sokkel-ui/calendar/DayAgenda'
import { EventDetails, type EventFact } from '@winterop-com/sokkel-ui/calendar/EventDetails'
import { weekOf, type CalendarEvent } from '@winterop-com/sokkel-ui/calendar/events'
import { MiniMonth } from '@winterop-com/sokkel-ui/calendar/MiniMonth'
import { MonthGrid } from '@winterop-com/sokkel-ui/calendar/MonthGrid'
import { WeekGrid } from '@winterop-com/sokkel-ui/calendar/WeekGrid'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { SubNav } from '@winterop-com/sokkel-ui/SubNav'
import { Toolbar, ToolbarTitle } from '@winterop-com/sokkel-ui/Toolbar'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useIsMobile } from '@winterop-com/sokkel-ui/hooks/use-mobile'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import type { KindColor } from '@winterop-com/sokkel-ui/lib/kind'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import { DayStrip } from '@winterop-com/sokkel-ui/calendar/DayStrip'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'

/**
 * A schedule of job runs and team events in the library's frame: the week with its hours, all-day
 * events on top and the line at the current time; the month with "+N more" on a full day; a mini
 * month and the calendars to show in the sidebar; and an event's details in a popover. On a phone
 * the week becomes one day as a list. "Now" is fixed at Thursday 5 November 2026, 09:30.
 */
const NOW = new Date(2026, 10, 5, 9, 30)

const GROUPS: RailGroup[] = [
    {
        id: 'work',
        entries: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '#' },
            { id: 'board', label: 'Board', icon: KanbanSquare, href: '#' },
            { id: 'calendar', label: 'Calendar', icon: CalendarDays, href: '#', active: true },
            { id: 'runs', label: 'Runs', icon: Play, href: '#' },
            { id: 'jobs', label: 'Jobs', icon: ListChecks, href: '#' },
        ],
    },
    { id: 'system', title: 'System', entries: [{ id: 'settings', label: 'Settings', icon: Settings, href: '#' }] },
]

type CalendarId = 'runs' | 'deploys' | 'team' | 'oncall' | 'away'

const CALENDARS: { id: CalendarId; name: string; color: KindColor }[] = [
    { id: 'runs', name: 'Job runs', color: 'blue' },
    { id: 'deploys', name: 'Deploys', color: 'violet' },
    { id: 'team', name: 'Team', color: 'green' },
    { id: 'oncall', name: 'On call', color: 'pink' },
    { id: 'away', name: 'Time off', color: 'jade' },
]

interface Entry extends CalendarEvent {
    calendar: CalendarId
    job?: string
    state?: Status
    host?: string
    people?: string[]
    notes?: string
}

const at = (date: number, hour: number, minute = 0) => new Date(2026, 10, date, hour, minute)

function entry(calendar: CalendarId, id: string, title: string, start: Date, end: Date, more: Partial<Entry> = {}): Entry {
    const color = CALENDARS.find((item) => item.id === calendar)?.color
    return { id, title, start, end, calendar, color, ...more }
}

function runState(day: number, hour: number): Status {
    const start = at(day, hour)
    if (start > NOW) return 'queued'
    if (day === 3 || day === 4) return 'failed'
    return 'succeeded'
}

function build(): Entry[] {
    const list: Entry[] = []
    for (let date = 1; date <= 30; date++) {
        const weekday = getDay(at(date, 0))
        const workday = weekday !== 0 && weekday !== 6
        list.push(
            entry('runs', `nightly-export-${date}`, 'nightly-export', at(date, 2), at(date, 2, 20), {
                job: 'nightly-export',
                state: runState(date, 2),
                host: 'worker-1.example.org',
                detail: 'worker-1',
            }),
        )
        if (workday) {
            list.push(
                entry('team', `standup-${date}`, 'Standup', at(date, 9, 15), at(date, 9, 30), {
                    people: ['ada', 'grace', 'linus', 'margaret'],
                }),
            )
        }
        if (weekday === 1) {
            list.push(
                entry('runs', `send-digest-${date}`, 'send-digest', at(date, 9), at(date, 9, 10), {
                    job: 'send-digest',
                    state: runState(date, 9),
                    host: 'worker-2.example.org',
                    detail: 'worker-2',
                }),
                entry('team', `planning-${date}`, 'Planning', at(date, 10), at(date, 11), {
                    people: ['ada', 'grace', 'linus', 'margaret'],
                    detail: 'Room Fjord',
                    notes: 'What goes into Ready this week, and who takes it.',
                }),
            )
        }
        if (weekday === 0) {
            list.push(
                entry('runs', `rebuild-index-${date}`, 'rebuild-index', at(date, 3), at(date, 4, 30), {
                    job: 'rebuild-index',
                    state: runState(date, 3),
                    host: 'worker-1.example.org',
                    detail: 'worker-1',
                }),
            )
        }
    }
    list.push(
        entry('runs', 'import-orders-3', 'import-orders', at(3, 8), at(3, 8, 40), {
            job: 'import-orders',
            state: 'succeeded',
            host: 'worker-2.example.org',
            detail: 'worker-2',
        }),
        entry('runs', 'import-orders-5', 'import-orders', at(5, 8), at(5, 8, 40), {
            job: 'import-orders',
            state: 'succeeded',
            host: 'worker-2.example.org',
            detail: 'worker-2',
        }),
        entry('runs', 'import-orders-5b', 'import-orders', at(5, 14), at(5, 14, 40), {
            job: 'import-orders',
            state: 'queued',
            host: 'worker-2.example.org',
            detail: 'worker-2',
        }),
        entry('runs', 'sync-inventory-4', 'sync-inventory', at(4, 14), at(4, 14, 45), {
            job: 'sync-inventory',
            state: 'cancelled',
            host: 'worker-1.example.org',
            detail: 'cancelled by linus',
            muted: true,
        }),
        entry('team', 'design-review', 'Design review: run graph', at(3, 11), at(3, 12), {
            people: ['margaret', 'ada'],
            detail: 'Room Fjord',
            notes: 'The dark palette for the run graph, LRK-31.',
        }),
        entry('deploys', 'deploy-harbor', 'Deploy harbor 1.4.0', at(3, 15), at(3, 15, 45), {
            host: 'api.example.org',
            people: ['linus'],
            detail: 'api.example.org',
        }),
        entry('team', 'incident-review', 'Incident review: nightly-export', at(4, 13), at(4, 14, 30), {
            people: ['ada', 'grace', 'linus'],
            detail: 'Video call',
            notes: 'Two failed nights in a row on an empty orders feed, HRB-142.',
        }),
        entry('team', 'board-review', 'Board review', at(5, 13), at(5, 14), {
            people: ['ada', 'grace', 'linus', 'margaret'],
            detail: 'Room Fjord',
            notes: 'Walk the board from Review back to Ready. In progress is over its limit of four.',
        }),
        entry('team', 'one-on-one', '1:1 ada and grace', at(5, 13), at(5, 13, 30), { people: ['ada', 'grace'], detail: 'Video call' }),
        entry('deploys', 'deploy-juniper', 'Deploy juniper 2.1.0', at(5, 13, 30), at(5, 14, 15), {
            host: 'api.example.org',
            people: ['linus'],
            detail: 'api.example.org',
        }),
        entry('team', 'retro', 'Retro', at(5, 16), at(5, 17), { people: ['ada', 'grace', 'linus', 'margaret'], detail: 'Room Fjord' }),
        entry('team', 'focus', 'Focus: export formats', at(6, 10), at(6, 12), { people: ['ada'], notes: 'HRB-151.' }),
        entry('deploys', 'deploy-larkspur', 'Deploy larkspur 0.9.2', at(6, 15), at(6, 15, 30), {
            host: 'api.example.org',
            people: ['margaret'],
            detail: 'api.example.org',
        }),
        entry('oncall', 'oncall-linus', 'On call: linus', at(2, 0), at(4, 0), { allDay: true, people: ['linus'] }),
        entry('oncall', 'oncall-margaret', 'On call: margaret', at(5, 0), at(8, 0), { allDay: true, people: ['margaret'] }),
        entry('away', 'away-grace', 'grace away', at(6, 0), at(6, 0), { allDay: true, people: ['grace'] }),
        entry('deploys', 'freeze', 'harbor change freeze', at(5, 0), at(5, 0), { allDay: true }),
        entry('deploys', 'deploy-harbor-2', 'Deploy harbor 1.4.1', at(12, 11), at(12, 11, 30), {
            host: 'api.example.org',
            people: ['linus'],
        }),
        entry('team', 'one-on-one-2', '1:1 linus and margaret', at(12, 14), at(12, 14, 30), { people: ['linus', 'margaret'] }),
        entry('team', 'retro-2', 'Retro', at(12, 16), at(12, 17), { people: ['ada', 'grace', 'linus', 'margaret'] }),
        entry('away', 'away-ada', 'ada away', at(23, 0), at(27, 0), { allDay: true, people: ['ada'] }),
        entry('deploys', 'deploy-juniper-2', 'Deploy juniper 2.2.0', at(19, 13), at(19, 13, 45), { host: 'api.example.org' }),
        entry('team', 'offsite', 'Team day', at(26, 9), at(26, 16), { people: ['grace', 'linus', 'margaret'] }),
    )
    return list
}

const EVENTS = build()

function Detail({ event }: { event: Entry }) {
    const calendar = CALENDARS.find((item) => item.id === event.calendar)
    const facts: EventFact[] = [{ id: 'calendar', icon: <CalendarDays />, content: calendar?.name }]
    if (event.state !== undefined) facts.push({ id: 'state', icon: <Activity />, content: <StatusChip status={event.state} /> })
    if (event.host !== undefined) {
        facts.push({ id: 'host', icon: <Server />, content: <span className="font-mono text-xs">{event.host}</span> })
    }
    return (
        <EventDetails
            event={event}
            code={event.job !== undefined}
            facts={facts}
            location={event.job === undefined && event.host === undefined ? event.detail : undefined}
            people={event.people?.map((name) => ({ name, image: pictureOf(name) }))}
            notes={event.notes}
            actions={
                <Button size="sm" variant="outline">
                    {event.job !== undefined ? 'Open run' : 'Edit'}
                </Button>
            }
        />
    )
}

function CalendarToggles({ shown, onChange }: { shown: CalendarId[]; onChange: (shown: CalendarId[]) => void }) {
    return (
        <Stack as="section" gap="2xs">
            <GroupLabel as="h3" className="px-1.5 pb-1">
                Calendars
            </GroupLabel>
            {CALENDARS.map((calendar) => {
                const on = shown.includes(calendar.id)
                return (
                    <CheckboxField
                        key={calendar.id}
                        label={
                            <Row as="span" className={cn(!on && 'text-muted-foreground')}>
                                <Dot kind={calendar.color} />
                                {calendar.name}
                            </Row>
                        }
                        checked={on}
                        onCheckedChange={(next) =>
                            onChange(next ? [...shown, calendar.id] : shown.filter((other) => other !== calendar.id))
                        }
                    />
                )
            })}
        </Stack>
    )
}

type View = 'week' | 'month'

function CalendarApp({ view: initialView = 'week', open = null }: { view?: View; open?: string | null }) {
    const phone = useIsMobile()
    const [view, setView] = useState<View>(initialView)
    const [anchor, setAnchor] = useState(NOW)
    const [mini, setMini] = useState(NOW)
    const [shown, setShown] = useState<CalendarId[]>(CALENDARS.map((calendar) => calendar.id))
    const [openEvent, setOpenEvent] = useState<string | null>(open)
    const [collapsed, setCollapsed] = useState(false)
    const events = EVENTS.filter((event) => shown.includes(event.calendar))
    const week = weekOf(anchor)
    const go = (day: Date) => {
        setAnchor(day)
        setMini(day)
    }
    const step = (by: number) => go(view === 'week' ? addWeeks(anchor, by) : addMonths(anchor, by))
    const title =
        view === 'month'
            ? format(anchor, 'MMMM yyyy')
            : isSameMonth(week[0], week[6])
              ? `${format(week[0], 'd')} - ${format(week[6], 'd MMMM yyyy')}`
              : `${format(week[0], 'd MMM')} - ${format(week[6], 'd MMM yyyy')}`
    const detail = (event: Entry) => <Detail event={event} />

    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={GROUPS}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={
                            <AccountMenu
                                name="ada"
                                image={pictureOf('ada')}
                                where="tidevann.example.org"
                                collapsed={collapsed}
                                onSignOut={() => undefined}
                            />
                        }
                    />
                }
                top={<TopBar trail={[{ label: 'Tidevann', href: '#' }, { label: 'Calendar' }]} onSearch={() => undefined} />}
            >
                <Row gap="none" align="stretch" className="h-full min-h-0">
                    <SubNav label="Calendars" from="xl">
                        <Stack gap="xl">
                            <Row>
                                <Button size="sm">
                                    <Plus aria-hidden />
                                    New event
                                </Button>
                            </Row>
                            <MiniMonth
                                month={mini}
                                onMonthChange={setMini}
                                value={anchor}
                                onValueChange={go}
                                now={NOW}
                                range={view === 'week' ? { start: week[0], end: week[6] } : undefined}
                                marked={EVENTS.filter((event) => event.calendar !== 'runs' && shown.includes(event.calendar)).map(
                                    (event) => event.start,
                                )}
                            />
                            <CalendarToggles shown={shown} onChange={setShown} />
                        </Stack>
                    </SubNav>
                    <Stack gap="none" className="flex-1">
                        <Toolbar
                            variant="pane"
                            end={
                                <Segmented
                                    label="View"
                                    value={view}
                                    options={[
                                        { value: 'week', label: phone ? 'Day' : 'Week' },
                                        { value: 'month', label: 'Month' },
                                    ]}
                                    onValueChange={setView}
                                />
                            }
                        >
                            <Button size="sm" variant="outline" onClick={() => go(NOW)}>
                                Today
                            </Button>
                            <Row gap="none">
                                <IconButton label={`Previous ${view}`} onClick={() => step(-1)}>
                                    <ChevronLeft aria-hidden />
                                </IconButton>
                                <IconButton label={`Next ${view}`} onClick={() => step(1)}>
                                    <ChevronRight aria-hidden />
                                </IconButton>
                            </Row>
                            <ToolbarTitle as="h1">
                                {phone ? format(anchor, view === 'week' ? 'EEE d MMM' : 'MMM yyyy') : title}
                            </ToolbarTitle>
                        </Toolbar>
                        {phone ? (
                            <Stack gap="none" className="min-h-0 flex-1 overflow-y-auto">
                                {view === 'week' ? (
                                    <DayStrip
                                        days={week}
                                        value={anchor}
                                        today={NOW}
                                        onValueChange={go}
                                        className="shrink-0 border-b border-border px-2 py-2"
                                    />
                                ) : (
                                    <MonthGrid
                                        month={anchor}
                                        events={events}
                                        now={NOW}
                                        selected={anchor}
                                        onSelectDay={go}
                                        className="h-80 shrink-0 border-b border-border"
                                    />
                                )}
                                <DayAgenda
                                    day={anchor}
                                    events={events}
                                    now={NOW}
                                    renderDetail={detail}
                                    openEvent={openEvent}
                                    onOpenEventChange={setOpenEvent}
                                />
                            </Stack>
                        ) : view === 'week' ? (
                            <WeekGrid
                                days={week}
                                events={events}
                                now={NOW}
                                scrollToHour={7}
                                renderDetail={detail}
                                openEvent={openEvent}
                                onOpenEventChange={setOpenEvent}
                                className="flex-1"
                            />
                        ) : (
                            <MonthGrid
                                month={anchor}
                                events={events}
                                now={NOW}
                                renderDetail={detail}
                                openEvent={openEvent}
                                onOpenEventChange={setOpenEvent}
                                onMore={(day) => {
                                    go(day)
                                    setView('week')
                                }}
                                className="flex-1"
                            />
                        )}
                    </Stack>
                </Row>
            </Shell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Calendar' }
export default meta

/** The week of 2 November from 07:00, with today's line at 09:30 and the events at 13:00 on Thursday sharing its width. */
export const Week: StoryObj = { name: 'Week', render: () => <CalendarApp /> }

/** November as a grid; a day with more events than it has room for says how many more. */
export const Month: StoryObj = { name: 'Month', render: () => <CalendarApp view="month" /> }

/** The board review on Thursday open in its popover, with its calendar, people and notes. */
export const EventOpen: StoryObj = { name: 'Event open', render: () => <CalendarApp open="board-review" /> }
