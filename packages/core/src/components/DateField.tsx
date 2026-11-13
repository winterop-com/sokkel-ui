import { CalendarDays } from 'lucide-react'

import { formatDate, isBefore, isoDate, ISO_DATE, readDate, type DateFormat } from '../lib/dates'
import { TypedField, type EntryFieldProps } from './entry'
import { FIELD_WORDS, type FieldWords } from './Field'
import { DayPick, prefetchCalendar } from './day-pick'
import { Picker, useOpen } from './pickers'

export type { EntryFieldProps } from './entry'

/** The words a date field says; each bound and example is written in the field's format. */
export interface DateFieldWords extends FieldWords {
    /** Said when what is typed is not a date. */
    unreadable: string
    /** How a date is written, from one written that way. */
    example: (sample: string) => string
    /** Said of a date before `min`. */
    under: (min: string) => string
    /** Said of a date after `max`. */
    over: (max: string) => string
    /** The action that puts in the bound a date passed. */
    use: (bound: string) => string
    /** The button that opens the calendar. */
    pick: string
    /** The button that empties the field. */
    clear: string
}

const WORDS: DateFieldWords = {
    ...FIELD_WORDS,
    unreadable: 'Enter a date',
    example: (sample) => `As in ${sample}.`,
    under: (min) => `Enter ${min} or later`,
    over: (max) => `Enter ${max} or earlier`,
    use: (bound) => `Use ${bound}`,
    pick: 'Choose a date',
    clear: 'Clear',
}

export interface DateFieldProps extends EntryFieldProps<string> {
    /** How the date is written and read: `YYYY-MM-DD` by default, or such as `DD.MM.YYYY`. */
    format?: DateFormat
    /** The day the calendar marks as today, as `YYYY-MM-DD`; the clock's day when omitted. */
    today?: string
    /** The weekday the calendar's weeks start on: 1 for Monday, 0 for Sunday. */
    weekStartsOn?: 0 | 1
    /** Whether the calendar is open, held from outside with `onOpenChange`. */
    open?: boolean
    /** Whether the calendar starts open when `open` is not given. */
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    words?: Partial<DateFieldWords>
}

/**
 * A date typed in one format, with a calendar beside it to pick from. The value is a day with no
 * time and no zone, `YYYY-MM-DD`, whatever `format` the field is written in. What is typed is read
 * by that format alone (a pasted ISO date always reads), and written in it again once the field is
 * left; text that is not a date keeps the value as it was and is said. A date outside `min` and
 * `max` is kept and said, with an action that puts in the bound, and the calendar offers none.
 * An optional field empties with a clear button.
 *
 * The calendar, and the date library under it, load the first time the field is pointed at or
 * focused, so a page without a date field carries neither. Alt and the down arrow open it from the
 * input.
 */
export function DateField({
    format = ISO_DATE,
    today,
    weekStartsOn,
    open,
    defaultOpen,
    onOpenChange,
    words: said,
    placeholder,
    ...field
}: DateFieldProps) {
    const words = { ...WORDS, ...said }
    const [opened, setOpened] = useOpen(open, defaultOpen, onOpenChange)
    return (
        <TypedField
            {...field}
            placeholder={placeholder ?? format.toLowerCase()}
            read={(text) => readDate(text, format)}
            write={(value) => formatDate(value, format)}
            before={isBefore}
            unreadable={() => ({
                tone: 'critical',
                text: words.unreadable,
                detail: words.example(formatDate(field.min ?? today ?? isoDate(new Date()), format)),
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
            end={(entry, frame) => (
                <Picker
                    label={words.pick}
                    icon={<CalendarDays className="size-3.5" aria-hidden />}
                    anchor={frame}
                    open={opened}
                    onOpenChange={setOpened}
                >
                    <DayPick
                        value={entry.value}
                        min={field.min}
                        max={field.max}
                        today={today}
                        weekStartsOn={weekStartsOn}
                        onPick={(day) => {
                            entry.set(day)
                            setOpened(false)
                        }}
                    />
                </Picker>
            )}
        />
    )
}
