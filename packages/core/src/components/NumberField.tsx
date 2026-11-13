import { Minus, Plus } from 'lucide-react'

import { readNumber, stepNumber, writeNumber } from '../lib/numbers'
import { FRAME_BUTTON, TypedField, type EntryFieldProps } from './entry'
import { FIELD_WORDS, type FieldWords } from './Field'

export type { EntryFieldProps } from './entry'

/** The words a number field says; each bound is written as the field writes a number. */
export interface NumberFieldWords extends FieldWords {
    /** Said when what is typed is not a number. */
    unreadable: string
    /** Said when a field of whole numbers is given a fraction. */
    whole: string
    /** How a number is written, from one written that way. */
    example: (sample: string) => string
    /** Said of a number under `min`. */
    under: (min: string) => string
    /** Said of a number over `max`. */
    over: (max: string) => string
    /** The action that puts in the bound a number passed. */
    use: (bound: string) => string
    /** The button that steps the value up. */
    increase: string
    /** The button that steps the value down. */
    decrease: string
}

const WORDS: NumberFieldWords = {
    ...FIELD_WORDS,
    unreadable: 'Enter a number',
    whole: 'Enter a whole number',
    example: (sample) => `As in ${sample}.`,
    under: (min) => `Enter ${min} or more`,
    over: (max) => `Enter ${max} or less`,
    use: (bound) => `Use ${bound}`,
    increase: 'Increase',
    decrease: 'Decrease',
}

export interface NumberFieldProps extends EntryFieldProps<number> {
    /** How far the arrow keys and the stepper move the value; steps fall on a grid from `min`, or from 0. */
    step?: number
    /** Only whole numbers: a fraction typed is said and not taken. */
    integer?: boolean
    /** Buttons at the input's end that step the value down and up. */
    stepper?: boolean
    /** Text before the number, such as a currency: `$`. */
    prefix?: string
    /** Text after the number, such as its unit: `ms`, `%`, `kr`. */
    suffix?: string
    /** Writes the value in the input; plain digits with a point by default. `localeNumber` gives a locale's. */
    format?: (value: number) => string
    /** Reads what is typed, or gives null for text that is not a number; it reads what `format` writes. */
    parse?: (text: string) => number | null
    words?: Partial<NumberFieldWords>
}

/**
 * A number typed in, written in one format, with its unit before or after it. What is typed is
 * read by `parse` and written again by `format` once the field is left; text that is not a number
 * (or a fraction in an `integer` field) keeps the value as it was and is said. A number outside
 * `min` and `max` is kept and said, with an action that puts in the bound.
 *
 * The up and down arrows step the value by `step`, ten steps with Shift or Page Up and Page Down,
 * kept within the bounds; `stepper` adds buttons that do the same, which keep the focus in the
 * input.
 */
export function NumberField({
    step = 1,
    integer = false,
    stepper = false,
    format = writeNumber,
    parse = readNumber,
    words: said,
    ...field
}: NumberFieldProps) {
    const words = { ...WORDS, ...said }
    const { min, max } = field
    const by = (entry: { value: number | null; set: (value: number) => void }, steps: number) =>
        entry.set(stepNumber(entry.value, steps, { step, min, max }))
    return (
        <TypedField
            inputMode={integer && (min ?? 0) >= 0 ? 'numeric' : 'decimal'}
            {...field}
            read={(text) => {
                const number = parse(text)
                return number === null || (integer && !Number.isInteger(number)) ? null : number
            }}
            write={format}
            before={(value, other) => value < other}
            unreadable={(text) => ({
                tone: 'critical',
                text: integer && parse(text) !== null ? words.whole : words.unreadable,
                detail: words.example(format(integer ? 1250 : 1250.5)),
            })}
            bounds={words}
            fieldWords={words}
            onKeyDown={(event, entry) => {
                const steps = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[event.key]
                if (steps === undefined) return
                event.preventDefault()
                by(entry, event.shiftKey ? steps * 10 : steps)
            }}
            end={(entry) =>
                stepper && (
                    <>
                        {[
                            {
                                steps: -1,
                                label: words.decrease,
                                Icon: Minus,
                                stop: min !== undefined && entry.value !== null && entry.value <= min,
                            },
                            {
                                steps: 1,
                                label: words.increase,
                                Icon: Plus,
                                stop: max !== undefined && entry.value !== null && entry.value >= max,
                            },
                        ].map(({ steps, label, Icon, stop }) => (
                            <button
                                key={label}
                                type="button"
                                tabIndex={-1}
                                aria-label={label}
                                title={label}
                                disabled={stop}
                                className={FRAME_BUTTON}
                                onPointerDown={(event) => event.preventDefault()}
                                onClick={() => by(entry, steps)}
                            >
                                <Icon className="size-3.5" aria-hidden />
                            </button>
                        ))}
                    </>
                )
            }
        />
    )
}
