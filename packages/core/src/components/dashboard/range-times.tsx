import { TimeField } from '../TimeField'

export interface RangeTimesProps {
    id: string
    start: string
    end: string
    clock: 12 | 24
    words: { start: string; end: string }
    onChange: (times: [string, string]) => void
}

/** The start and end times of a custom range, under the range picker's calendar; loaded with the calendar by a picker that takes times. */
export function RangeTimes({ id, start, end, clock, words, onChange }: RangeTimesProps) {
    return (
        <div className="grid grid-cols-2 gap-3 border-t border-border px-3 py-2.5">
            <TimeField
                id={`${id}-start`}
                label={words.start}
                clock={clock}
                required
                value={start}
                onValueChange={(next) => onChange([next ?? start, end])}
            />
            <TimeField
                id={`${id}-end`}
                label={words.end}
                clock={clock}
                required
                value={end}
                onValueChange={(next) => onChange([start, next ?? end])}
            />
        </div>
    )
}
