import { Clock } from 'lucide-react'

import { fitSeconds, formatTime, isBefore, readTime, timesOfDay, type TimeFormat } from '../lib/dates'
import { TypedField, type EntryFieldProps } from './entry'
import { Picker, TimeList, useOpen } from './pickers'

export type { EntryFieldProps } from './entry'

/** The words a time field says; each bound and example is written as the field writes a time. */
export interface TimeFieldWords {
    /** Said when what is typed is not a time. */
    unreadable: string
    /** How a time is written, from one written that way. */
    example: (sample: string) => string
    /** Said of a time before `min`. */
    under: (min: string) => string
    /** Said of a time after `max`. */
    over: (max: string) => string
    /** The action that puts in the bound a time passed. */
    use: (bound: string) => string
    /** The button that opens the list of times. */
    pick: string
    /** The button that empties the field. */
    clear: string
    /** The 12-hour clock's words for before and after noon. */
    periods: readonly [string, string]
}

const WORDS: TimeFieldWords = {
    unreadable: 'Enter a time',
    example: (sample) => `As in ${sample}.`,
    under: (min) => `Enter ${min} or later`,
    over: (max) => `Enter ${max} or earlier`,
    use: (bound) => `Use ${bound}`,
    pick: 'Choose a time',
    clear: 'Clear',
    periods: ['AM', 'PM'],
}

export interface TimeFieldProps extends EntryFieldProps<string> {
    /** Written on a 24-hour clock (`14:30`) or a 12-hour one (`2:30 PM`); the value is the same. */
    clock?: 12 | 24
    /** Whether the time takes seconds: `HH:mm:ss`. */
    seconds?: boolean
    /** The minutes between the times the list offers. */
    step?: number
    /** The zone the time is read in, written after it: `UTC`. Words only; the value carries no zone. */
    zone?: string
    /** Whether the list of times is open, held from outside with `onOpenChange`. */
    open?: boolean
    /** Whether the list starts open when `open` is not given. */
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    words?: Partial<TimeFieldWords>
}

/**
 * A time of day typed on a 24 or a 12-hour clock, with a list of times beside it to pick from. The
 * value is a time on the wall clock with no zone, `HH:mm` (or `HH:mm:ss` with `seconds`), on
 * either clock. `930`, `9.30` and `9:30 pm` all read; text that is not a time keeps the value as it
 * was and is said. A time outside `min` and `max` is kept and said, with an action that puts in the
 * bound, and the list offers only the times between them, every `step` minutes. `zone` names the
 * zone the time is read in after the input. An optional field empties with a clear button.
 */
export function TimeField({
    clock = 24,
    seconds = false,
    step = 30,
    zone,
    open,
    defaultOpen,
    onOpenChange,
    words: said,
    placeholder,
    ...field
}: TimeFieldProps) {
    const words = { ...WORDS, ...said }
    const format: TimeFormat = { clock, seconds, periods: words.periods }
    const [opened, setOpened] = useOpen(open, defaultOpen, onOpenChange)
    const [min, max] = [fitSeconds(field.min, seconds), fitSeconds(field.max, seconds)]
    const times = timesOfDay(step).filter(
        (time) => (min === undefined || !isBefore(time, min)) && (max === undefined || !isBefore(max, time)),
    )
    return (
        <TypedField
            {...field}
            min={min}
            max={max}
            placeholder={placeholder ?? (clock === 24 ? (seconds ? 'hh:mm:ss' : 'hh:mm') : `h:mm ${words.periods[0]}`)}
            suffix={zone}
            read={(text) => readTime(text, format)}
            write={(value) => formatTime(value, format)}
            before={isBefore}
            unreadable={() => ({
                tone: 'critical',
                text: words.unreadable,
                detail: words.example(formatTime(seconds ? '14:30:00' : '14:30', format)),
            })}
            bounds={words}
            clear={words.clear}
            onKeyDown={(event) => {
                if (!event.altKey || event.key !== 'ArrowDown') return
                event.preventDefault()
                setOpened(true)
            }}
            end={(entry, frame) => (
                <Picker
                    label={words.pick}
                    icon={<Clock className="size-3.5" aria-hidden />}
                    anchor={frame}
                    open={opened}
                    onOpenChange={setOpened}
                >
                    <TimeList
                        value={entry.value}
                        times={times}
                        format={format}
                        label={words.pick}
                        autoFocus
                        className="max-h-64 w-32"
                        onPick={(time) => {
                            entry.set(seconds ? `${time}:00` : time)
                            setOpened(false)
                        }}
                    />
                </Picker>
            )}
        />
    )
}
