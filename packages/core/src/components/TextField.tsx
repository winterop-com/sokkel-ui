import type { CSSProperties, HTMLAttributes } from 'react'

import { cn } from '../lib/cn'
import { Field, describedBy, type FieldWords, type RequiredMark } from './Field'
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
    /** How `required` is marked: a star in the label, or the word after it. */
    requiredMark?: RequiredMark
    /** What applies when the field is left empty, under the input: "Default is 30 minutes". */
    fallback?: string
    /** Why the value is refused, as one critical issue. */
    error?: string | null
    issues?: readonly Issue[]
    issueOpen?: boolean
    onIssueOpenChange?: (open: boolean) => void
    /** The value set in the code face, for keys and addresses. */
    mono?: boolean
    /** The label names a key, so it is drawn in the code face too. */
    monoLabel?: boolean
    numeric?: boolean
    multiline?: boolean
    /** A text area's height in lines. */
    rows?: number
    /** The most lines a text area grows to with its text; past them it scrolls. */
    maxRows?: number
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
    words?: Partial<FieldWords>
}

/**
 * A labeled text input: a `Field` with its input inside, wired together. The label names the
 * input, the help line describes it, and an issue marks it invalid and draws its edge, so a form
 * states each of these once. `multiline` makes it a text area that grows with its text, up to
 * `maxRows` lines and then scrolling; `mono` sets the value in the code face for keys and
 * addresses, `monoLabel` the label too, and `numeric` sets it in figures that line up.
 */
export function TextField({
    id,
    label,
    hint,
    keyHint,
    description,
    help,
    required,
    requiredMark,
    fallback,
    error,
    issues = [],
    issueOpen,
    onIssueOpenChange,
    mono = false,
    monoLabel = false,
    numeric = false,
    multiline = false,
    rows,
    maxRows,
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
    words,
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
        'aria-required': required === true || undefined,
        'aria-describedby': describedBy(id, { help, description, fallback }),
    }
    return (
        <Field
            id={id}
            label={label}
            hint={hint}
            keyHint={keyHint}
            description={description}
            help={help}
            fallback={fallback}
            required={required}
            requiredMark={requiredMark}
            issues={all}
            issueOpen={issueOpen}
            onIssueOpenChange={onIssueOpenChange}
            className={className}
            words={words}
            mono={monoLabel}
        >
            {multiline ? (
                <Textarea
                    {...shared}
                    rows={rows}
                    className={cn(face, maxRows !== undefined && 'overflow-y-auto')}
                    style={maxRows === undefined ? undefined : linesTall(rows, maxRows)}
                    onChange={(event) => onChange?.(event.target.value)}
                />
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

/** A text area's room past its padding and border, as the framed text area draws them. */
const FRAME = '1rem + 2px'

/** Holds a growing text area between `rows` lines (fewer than `maxRows`) and `maxRows`, after which it scrolls. */
function linesTall(rows: number | undefined, maxRows: number): CSSProperties {
    const most = Math.max(1, Math.floor(maxRows))
    const least = Math.min(most, Math.max(1, Math.floor(rows ?? 4)))
    return { minHeight: `calc(${String(least)}lh + ${FRAME})`, maxHeight: `calc(${String(most)}lh + ${FRAME})` }
}
