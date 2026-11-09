import { Calculator } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { describedBy, Field } from './Field'
import { Input } from './ui/input'

/** The words a computed field says. */
export interface ComputedFieldWords {
    /** The value's place before the answers it is worked out from are given. */
    pending: string
    /** The note beside the label saying the answer is worked out, not typed. */
    computed: string
}

const WORDS: ComputedFieldWords = { pending: 'Worked out once the answers it reads are given', computed: 'worked out' }

export interface ComputedFieldProps {
    id: string
    label: string
    /** The answer as worked out, written as it is shown; null until it can be. */
    value: string | null
    /** The unit after the value, such as `m` or `°C`. */
    unit?: string
    /** Why the answer is what it is: the rule that works it out, in a sentence. */
    why: ReactNode
    /** The rule as it is written, such as `level - zero`, drawn in the code face under the why. */
    formula?: string
    /** A sentence between the label and the value: what the question asks. */
    description?: ReactNode
    /** Draws the value in figures that line up, as a number is. */
    numeric?: boolean
    className?: string
    words?: Partial<ComputedFieldWords>
}

/**
 * An answer a form works out itself rather than asks: its label with a note that it is worked out,
 * the value read only in the place an input would take, and under it why it is what it is, with the
 * rule in the code face. Until the answers it reads are given it says so in the value's place. It
 * takes no focus for typing and is never counted as unanswered.
 */
export function ComputedField({
    id,
    label,
    value,
    unit,
    why,
    formula,
    description,
    numeric = false,
    className,
    words: given,
}: ComputedFieldProps) {
    const words = { ...WORDS, ...given }
    const help = (
        <span className="flex items-start gap-1.5">
            <Calculator aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0">
                {why}
                {formula !== undefined && <span className="block font-mono text-xs">{formula}</span>}
            </span>
        </span>
    )
    return (
        <Field id={id} label={label} hint={words.computed} description={description} help={help} className={className}>
            <Input
                id={id}
                readOnly
                tabIndex={-1}
                value={value === null ? '' : unit === undefined ? value : `${value} ${unit}`}
                placeholder={words.pending}
                aria-describedby={describedBy(id, { help, description })}
                className={cn('cursor-default bg-muted', numeric && 'tabular-nums')}
            />
        </Field>
    )
}
