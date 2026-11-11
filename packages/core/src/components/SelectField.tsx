import { cn } from '../lib/cn'
import { Field, describedBy, type RequiredMark } from './Field'
import { worst, type Issue } from './IssueMark'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

/** One choice in a select field. */
export interface SelectFieldOption {
    value: string
    label: string
    /** Shown in the list but not chosen. */
    disabled?: boolean
}

export interface SelectFieldProps {
    id: string
    label: string
    /** A short note beside the label: a unit, a format, a default. */
    hint?: string
    /** The hint names a key, so it is drawn in the code face. */
    keyHint?: boolean
    /** A sentence between the label and the select: what the question asks. */
    description?: string
    /** A sentence under the select. */
    help?: string
    required?: boolean
    /** How `required` is marked: a star in the label, or the word after it. */
    requiredMark?: RequiredMark
    /** What applies when nothing is chosen, under the select: "Default is api". */
    fallback?: string
    /** Why the value is refused, as one critical issue. */
    error?: string | null
    issues?: readonly Issue[]
    issueOpen?: boolean
    onIssueOpenChange?: (open: boolean) => void
    options: readonly SelectFieldOption[]
    /** The chosen option's value; an empty string, or a value no option has, chooses none. */
    value?: string
    defaultValue?: string
    /** Shown while nothing is chosen. */
    placeholder?: string
    /** The options' labels set in the code face, for keys and names. */
    mono?: boolean
    autoFocus?: boolean
    readOnly?: boolean
    disabled?: boolean
    onChange?: (value: string) => void
    /** Classes for the field, such as its span in a grid. */
    className?: string
}

/**
 * A labeled choice from a list: a `Field` with the library's select inside, wired together, laid
 * out as `TextField` and `NumberField` are. The label names the select, the help line describes
 * it, and an issue marks it invalid and draws its edge. `placeholder` shows while nothing is
 * chosen; `readOnly` shows the value with its list closed.
 */
export function SelectField({
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
    options,
    value,
    defaultValue,
    placeholder,
    mono = false,
    autoFocus,
    readOnly,
    disabled,
    onChange,
    className,
}: SelectFieldProps) {
    const all: Issue[] = [...(error === undefined || error === null ? [] : [{ tone: 'critical' as const, text: error }]), ...issues]
    const invalid = worst(all) === 'critical' || undefined
    const known = (given: string | undefined) =>
        given === undefined ? undefined : options.some((option) => option.value === given) ? given : null
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
        >
            <Select
                items={options}
                value={known(value)}
                defaultValue={known(defaultValue)}
                onValueChange={(next) => onChange?.(next ?? '')}
                readOnly={readOnly}
                disabled={disabled}
                required={required}
            >
                <SelectTrigger
                    id={id}
                    autoFocus={autoFocus}
                    aria-invalid={invalid}
                    aria-required={required === true || undefined}
                    aria-describedby={describedBy(id, { help, description, fallback })}
                    className={cn('w-full', mono && 'font-mono')}
                >
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value} disabled={option.disabled} className={cn(mono && 'font-mono')}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Field>
    )
}
