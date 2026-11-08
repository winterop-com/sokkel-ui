import { Eraser } from 'lucide-react'
import type { ReactNode } from 'react'

import { Field } from './Field'
import type { Issue } from './IssueMark'
import { Segmented } from './Segmented'
import { Button } from './ui/button'

/** The words a yes or no field says. */
export interface YesNoFieldWords {
    yes: string
    no: string
    /** The button that takes the answer back. */
    clear: string
    /** Said beside the choice while it is unanswered. */
    unanswered: string
}

const WORDS: YesNoFieldWords = { yes: 'Yes', no: 'No', clear: 'Clear', unanswered: 'Not answered' }

export interface YesNoFieldProps {
    id: string
    label: string
    /** The answer: yes, no, or null while unanswered. */
    value: boolean | null
    onValueChange: (value: boolean | null) => void
    required?: boolean
    /** A sentence between the label and the choice: what the question asks. */
    description?: ReactNode
    /** A sentence under the choice. */
    help?: ReactNode
    error?: string | null
    issues?: readonly Issue[]
    /** Offers only Yes, for a question whose No is never kept: unanswered stands for it. */
    yesOnly?: boolean
    disabled?: boolean
    className?: string
    words?: Partial<YesNoFieldWords>
}

/**
 * A question answered yes or no that may also be left unanswered: Yes and No side by side, neither
 * chosen until one is, and Clear beside them once answered, which takes the answer back, so an
 * optional question never has to keep a No it was not given. While unanswered it says so. A
 * required question has no Clear. `yesOnly` offers Yes alone, for a question that keeps no No.
 */
export function YesNoField({
    id,
    label,
    value,
    onValueChange,
    required = false,
    description,
    help,
    error,
    issues,
    yesOnly = false,
    disabled,
    className,
    words: given,
}: YesNoFieldProps) {
    const words = { ...WORDS, ...given }
    const chosen = value === null ? '' : value ? 'yes' : 'no'
    const options = [{ value: 'yes', label: words.yes }, ...(yesOnly ? [] : [{ value: 'no', label: words.no }])]
    return (
        <Field
            id={id}
            label={label}
            required={required}
            description={description}
            help={help}
            error={error}
            issues={issues}
            className={className}
        >
            <span className="flex min-w-0 flex-wrap items-center gap-2">
                <Segmented
                    id={id}
                    size="md"
                    label={label}
                    value={chosen}
                    options={options}
                    disabled={disabled}
                    onValueChange={(next) => onValueChange(next === 'yes')}
                />
                {value === null ? (
                    <span className="text-help text-muted-foreground">{words.unanswered}</span>
                ) : (
                    !required && (
                        <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onValueChange(null)}>
                            <Eraser aria-hidden />
                            {words.clear}
                        </Button>
                    )
                )}
            </span>
        </Field>
    )
}
