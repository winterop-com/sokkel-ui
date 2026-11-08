import { format, isSameDay } from 'date-fns'
import { Clock, MapPin, Users } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { KIND_FILL } from '../../lib/kind'
import { PersonAvatar } from '../PersonAvatar'
import type { CalendarEvent } from './events'

/** A person at an event, by name, with their picture when there is one. */
export interface EventPerson {
    name: string
    image?: string
}

/** A line of the details with its own icon: the calendar, a run's state, a host. */
export interface EventFact {
    id: string
    icon: ReactNode
    content: ReactNode
}

export interface EventDetailsWords {
    /** The date and time line, from the event. */
    when: (event: CalendarEvent) => string
    /** The badge after the pictures shown, for the people left out. */
    more: (count: number) => string
    people: string
    location: string
}

/** `Thursday 5 November, 13:00 - 14:00`, a whole day, or the days an all-day event covers. */
function when(event: CalendarEvent): string {
    if (event.allDay === true) {
        return isSameDay(event.start, event.end)
            ? format(event.start, 'EEEE d MMMM')
            : `${format(event.start, 'EEEE d')} to ${format(event.end, 'EEEE d MMMM')}`
    }
    return `${format(event.start, 'EEEE d MMMM')}, ${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}`
}

const WORDS: EventDetailsWords = {
    when,
    more: (count) => `+${String(count)}`,
    people: 'People',
    location: 'Location',
}

/** One line of the details: its icon in the faint ink, then what it says. */
function Line({ icon, label, children }: { icon: ReactNode; label?: string; children: ReactNode }) {
    return (
        <li className="flex min-w-0 items-center gap-2" aria-label={label}>
            <span className="flex size-4 shrink-0 items-center justify-center text-faint [&_svg]:size-4" aria-hidden>
                {icon}
            </span>
            {children}
        </li>
    )
}

/**
 * What an event is, as its popover or a dialog shows it: its color and title over the date and
 * time, then a line for each fact the app gives (`facts`: the calendar, a run's state, a host),
 * where it is, and who comes, their pictures up to `peopleShown` with a count of the rest and
 * their names after. Notes follow, and `actions` sit at the foot over a rule.
 *
 * Give it as a `renderDetail` to WeekGrid, MonthGrid or DayAgenda, or put it in a `DialogShell`.
 * `code` writes the title in the code face, as a job's name. The date and time are written by
 * `words.when`, which an app replaces for its own language and clock.
 */
export function EventDetails({
    event,
    code = false,
    facts,
    location,
    people,
    peopleShown = 5,
    notes,
    actions,
    className,
    words: given,
}: {
    event: CalendarEvent
    code?: boolean
    facts?: readonly EventFact[]
    /** Where it happens: a room, an address, a call. */
    location?: ReactNode
    people?: readonly EventPerson[]
    /** How many pictures show before the rest are counted. */
    peopleShown?: number
    notes?: ReactNode
    actions?: ReactNode
    className?: string
    words?: Partial<EventDetailsWords>
}) {
    const words = { ...WORDS, ...given }
    const shown = people?.slice(0, peopleShown) ?? []
    const rest = (people?.length ?? 0) - shown.length
    const hasLines = (facts?.length ?? 0) > 0 || location !== undefined || shown.length > 0
    return (
        <div data-slot="event-details" className={cn('flex min-w-0 flex-col gap-3', className)}>
            <div className="flex min-w-0 items-start gap-2">
                <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-sm', KIND_FILL[event.color ?? 'blue'])} aria-hidden />
                <div className="flex min-w-0 flex-col gap-0.5">
                    <h3 className={cn('text-title font-semibold wrap-break-word', code && 'font-mono')}>{event.title}</h3>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="size-3.5 shrink-0" aria-hidden />
                        {words.when(event)}
                    </span>
                </div>
            </div>
            {hasLines && (
                <ul className="flex min-w-0 flex-col gap-1.5 text-sm">
                    {facts?.map((fact) => (
                        <Line key={fact.id} icon={fact.icon}>
                            {fact.content}
                        </Line>
                    ))}
                    {location !== undefined && (
                        <Line icon={<MapPin />} label={words.location}>
                            <span className="min-w-0 truncate">{location}</span>
                        </Line>
                    )}
                    {shown.length > 0 && (
                        <Line icon={<Users />} label={words.people}>
                            <span className="flex shrink-0 items-center gap-0.5">
                                {shown.map((person) => (
                                    <PersonAvatar key={person.name} name={person.name} image={person.image} size="xs" />
                                ))}
                                {rest > 0 && (
                                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-2xs font-medium text-muted-foreground">
                                        {words.more(rest)}
                                    </span>
                                )}
                            </span>
                            <span className="min-w-0 truncate text-muted-foreground">
                                {people?.map((person) => person.name).join(', ')}
                            </span>
                        </Line>
                    )}
                </ul>
            )}
            {notes !== undefined && <div className="text-sm leading-5 text-pretty wrap-break-word">{notes}</div>}
            {actions !== undefined && (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">{actions}</div>
            )}
        </div>
    )
}
