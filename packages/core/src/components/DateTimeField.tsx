import { CalendarClock } from 'lucide-react'

import {
    fitSeconds,
    formatDateTime,
    isBefore,
    isoDate,
    ISO_DATE,
    readDateTime,
    timesOfDay,
    type DateFormat,
    type TimeFormat,
} from '../lib/dates'
import { TypedField, type EntryFieldProps } from './entry'
import { FIELD_WORDS, type FieldWords } from './Field'
import { DayPick, prefetchCalendar } from './day-pick'
import { Picker, TimeList, useOpen } from './pickers'

export type { EntryFieldProps } from './entry'

/** The words a date and time field says; each bound and example is written as the field writes them. */
export interface DateTimeFieldWords extends FieldWords {
    /** Said when what is typed is not a date and a time. */
    unreadable: string
    /** How a date and time is written, from one written that way. */
    example: (sample: string) => string
    /** Said of a moment before `min`. */
    under: (min: string) => string
    /** Said of a moment after `max`. */
    over: (max: string) => string
    /** The action that puts in the bound a moment passed. */
    use: (bound: string) => string
    /** The button that opens the calendar and the times. */
    pick: string
    /** The list of times beside the calendar. */
    times: string
    /** The button that empties the field. */
    clear: string
    /** The 12-hour clock's words for before and after noon. */
    periods: readonly [string, string]
}

const WORDS: DateTimeFieldWords = {
    ...FIELD_WORDS,
    unreadable: 'Enter a date and time',
    example: (sample) => `As in ${sample}.`,
    under: (min) => `Enter ${min} or later`,
    over: (max) => `Enter ${max} or earlier`,
    use: (bound) => `Use ${bound}`,
    pick: 'Choose a date and time',
    times: 'Times',
    clear: 'Clear',
    periods: ['AM', 'PM'],
}

export interface DateTimeFieldProps extends EntryFieldProps<string> {
    /** How the date is written and read: `YYYY-MM-DD` by default, or such as `DD.MM.YYYY`. */
    format?: DateFormat
    /** Written on a 24-hour clock (`14:30`) or a 12-hour one (`2:30 PM`); the value is the same. */
    clock?: 12 | 24
    /** Whether the time takes seconds: `YYYY-MM-DDTHH:mm:ss`. */
    seconds?: boolean
    /** The minutes between the times the list offers. */
    step?: number
    /** The zone the moment is read in, written after it: `UTC`. Words only; the value carries no zone. */
    zone?: string
    /** The day the calendar marks as today, as `YYYY-MM-DD`; the clock's day when omitted. A time picked first lands on it. */
    today?: string
    /** The weekday the calendar's weeks start on: 1 for Monday, 0 for Sunday. */
    weekStartsOn?: 0 | 1
    /** Whether the picker is open, held from outside with `onOpenChange`. */
    open?: boolean
    /** Whether the picker starts open when `open` is not given. */
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    words?: Partial<DateTimeFieldWords>
}

/**
 * A date and a time typed as one, with a calendar and a list of times beside it to pick from. The
 * value is a moment on the wall clock with no zone, `YYYY-MM-DDTHH:mm` (with `:ss` when `seconds`),
 * as an HTML `datetime-local` input holds it: the zone it is read in is the app's to know and to
 * name with `zone`. The date is written in `format` and the time on the field's clock, a space
 * between them; text that is not both keeps the value as it was and is said. A moment outside `min`
 * and `max` is kept and said, with an action that puts in the bound, and the picker offers none.
 *
 * Picking a day keeps the time (midnight when there is none, moved within the bounds) and leaves
 * the picker open for the time; picking a time closes it. The calendar loads the first time the
 * field is pointed at or focused.
 */
export function DateTimeField({
    format = ISO_DATE,
    clock = 24,
    seconds = false,
    step = 30,
    zone,
    today,
    weekStartsOn,
    open,
    defaultOpen,
    onOpenChange,
    words: said,
    placeholder,
    ...field
}: DateTimeFieldProps) {
    const words = { ...WORDS, ...said }
    const time: TimeFormat = { clock, seconds, periods: words.periods }
    const [opened, setOpened] = useOpen(open, defaultOpen, onOpenChange)
    const [min, max] = [fitSeconds(field.min, seconds), fitSeconds(field.max, seconds)]
    const within = (moment: string) =>
        min !== undefined && isBefore(moment, min) ? min : max !== undefined && isBefore(max, moment) ? max : moment
    const write = (value: string) => formatDateTime(value, format, time)
    return (
        <TypedField
            {...field}
            min={min}
            max={max}
            placeholder={placeholder ?? `${format.toLowerCase()} ${clock === 24 ? 'hh:mm' : `h:mm ${words.periods[0]}`}`}
            suffix={zone}
            read={(text) => readDateTime(text, format, time)}
            write={write}
            before={isBefore}
            unreadable={() => ({
                tone: 'critical',
                text: words.unreadable,
                detail: words.example(write(`${(min ?? today ?? isoDate(new Date())).slice(0, 10)}T${seconds ? '14:30:00' : '14:30'}`)),
            })}
            bounds={words}
            fieldWords={words}
            clear={words.clear}
            onReach={prefetchCalendar}
            onKeyDown={(event) => {
                if (!event.altKey || event.key !== 'ArrowDown') return
                event.preventDefault()
                setOpened(true)
            }}
            end={(entry, frame) => {
                const day = entry.value?.slice(0, 10) ?? null
                return (
                    <Picker
                        label={words.pick}
                        icon={<CalendarClock className="size-3.5" aria-hidden />}
                        anchor={frame}
                        open={opened}
                        onOpenChange={setOpened}
                        className="flex-row"
                    >
                        <DayPick
                            value={day}
                            min={min?.slice(0, 10)}
                            max={max?.slice(0, 10)}
                            today={today}
                            weekStartsOn={weekStartsOn}
                            onPick={(picked) =>
                                entry.set(within(`${picked}T${entry.value?.slice(11) ?? (seconds ? '00:00:00' : '00:00')}`))
                            }
                        />
                        <div className="relative w-28 border-l border-border">
                            <TimeList
                                value={entry.value?.slice(11) ?? null}
                                times={timesOfDay(step)}
                                format={time}
                                label={words.times}
                                disabled={(at) => day !== null && within(`${day}T${at}`) !== `${day}T${at}`}
                                className="absolute inset-0"
                                onPick={(at) => {
                                    entry.set(within(`${day ?? today ?? isoDate(new Date())}T${fitSeconds(at, seconds)}`))
                                    setOpened(false)
                                }}
                            />
                        </div>
                    </Picker>
                )
            }}
        />
    )
}
