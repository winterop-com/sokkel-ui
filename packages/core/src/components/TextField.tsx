import type { HTMLAttributes } from 'react'

import { cn } from '../lib/cn'
import { Field, describedBy } from './Field'
import { worst, type Issue } from './IssueMark'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'

export interface TextFieldProps {
    id: string
    label: string
    /** A short note beside the label: a unit, a format, a default. */
    hint?: string
    /** The hint names a key, so it is drawn in the code face. */
    keyHint?: boolean
    /** A sentence between the label and the input: what the question asks. */
    description?: string
    /** A sentence under the input. */
    help?: string
    required?: boolean
    /** Why the value is refused, as one critical issue. */
    error?: string | null
    issues?: readonly Issue[]
    issueOpen?: boolean
    onIssueOpenChange?: (open: boolean) => void
    mono?: boolean
    numeric?: boolean
    multiline?: boolean
    /** A text area's height in lines. */
    rows?: number
    type?: string
    value?: string
    defaultValue?: string | number
    placeholder?: string
    inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
    autoFocus?: boolean
    autoComplete?: string
    readOnly?: boolean
    disabled?: boolean
    onChange?: (value: string) => void
    /** Enter pressed in a one-line input. */
    onEnter?: () => void
    /** Escape pressed in a one-line input, such as to drop an edit. */
    onEscape?: () => void
    onBlur?: () => void
    /** Classes for the field, such as its span in a grid. */
    className?: string
}

/**
 * A labeled text input: a `Field` with its input inside, wired together. The label names the
 * input, the help line describes it, and an issue marks it invalid and draws its edge, so a form
 * states each of these once. `multiline` makes it a text area; `mono` sets it in the code face for
 * keys and addresses, `numeric` in figures that line up.
 */
export function TextField({
    id,
    label,
    hint,
    keyHint,
    description,
    help,
    required,
    error,
    issues = [],
    issueOpen,
    onIssueOpenChange,
    mono = false,
    numeric = false,
    multiline = false,
    rows,
    type,
    value,
    defaultValue,
    placeholder,
    inputMode,
    autoFocus,
    autoComplete,
    readOnly,
    disabled,
    onChange,
    onEnter,
    onEscape,
    onBlur,
    className,
}: TextFieldProps) {
    const all: Issue[] = [...(error === undefined || error === null ? [] : [{ tone: 'critical' as const, text: error }]), ...issues]
    const invalid = worst(all) === 'critical' || undefined
    const face = cn(mono && 'font-mono', numeric && 'tabular-nums')
    const shared = {
        id,
        value,
        defaultValue,
        placeholder,
        autoFocus,
        readOnly,
        disabled,
        onBlur,
        spellCheck: mono ? false : undefined,
        'aria-invalid': invalid,
        'aria-describedby': describedBy(id, { help, description }),
    }
    return (
        <Field
            id={id}
            label={label}
            hint={hint}
            keyHint={keyHint}
            description={description}
            help={help}
            required={required}
            issues={all}
            issueOpen={issueOpen}
            onIssueOpenChange={onIssueOpenChange}
            className={className}
        >
            {multiline ? (
                <Textarea {...shared} rows={rows} className={face} onChange={(event) => onChange?.(event.target.value)} />
            ) : (
                <Input
                    {...shared}
                    type={type}
                    inputMode={inputMode}
                    autoComplete={autoComplete}
                    className={face}
                    onChange={(event) => onChange?.(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && onEnter !== undefined) onEnter()
                        if (event.key === 'Escape' && onEscape !== undefined) onEscape()
                    }}
                />
            )}
        </Field>
    )
}
