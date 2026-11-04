import { Field } from './Field'
import { Input } from './ui/input'

/** The words a code field says when a value cannot be made into a code. */
export interface CodeWords {
    startWithLetter: string
    onlyAllowed: string
    required: string
}

const WORDS: CodeWords = {
    startWithLetter: 'Start with a letter.',
    onlyAllowed: 'Use only letters, digits and hyphens.',
    required: 'required',
}

/**
 * What typing makes of a code before it is checked: lower case, and spaces and underscores as
 * hyphens. "DHIS2 Play" becomes "dhis2-play"; nothing a person typed on purpose is removed.
 */
export function normalizeCode(text: string): string {
    return text.toLowerCase().replace(/[\s_]+/g, '-')
}

/** Why a code is refused, said as the one thing to change, or null when it is a code. */
export function codeProblem(code: string, words: CodeWords = WORDS): string | null {
    if (code === '') return null
    if (!/^[a-z]/.test(code)) return words.startWithLetter
    if (!/^[a-z][a-z0-9-]*$/.test(code)) return words.onlyAllowed
    return null
}

/**
 * The field a thing's code is typed in. It shapes what is typed into a code as it goes, says
 * nothing while the value is fine, and names the single thing to change when it is not. The code
 * face shows the value as it will be written in documents and addresses.
 */
export function CodeField({
    id,
    label = 'Code',
    value,
    onChange,
    required = true,
    words = WORDS,
}: {
    id: string
    label?: string
    value: string
    onChange: (code: string) => void
    required?: boolean
    words?: CodeWords
}) {
    const problem = codeProblem(value, words)
    return (
        <Field id={id} label={label} required={required} error={problem} words={{ required: words.required }}>
            <Input
                id={id}
                className="font-mono"
                value={value}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                aria-invalid={problem !== null || undefined}
                aria-describedby={problem !== null ? `${id}-error` : undefined}
                onChange={(event) => onChange(normalizeCode(event.target.value))}
            />
        </Field>
    )
}
