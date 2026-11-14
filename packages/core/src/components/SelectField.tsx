import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Field, describedBy, type FieldWords, type RequiredMark } from './Field'
import { worst, type Issue } from './IssueMark'
import { ThemeSwatch } from './theme-swatch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

/** One choice in a select field. */
export interface SelectFieldOption {
    value: string
    label: string
    /** Drawn before the label, in the list and in the select once chosen, such as a status dot or a kind's icon. */
    icon?: ReactNode
    /**
     * The theme whose sample leads the option in place of an icon, drawn in that theme as the theme
     * picker draws it. Among options that have one, an option without one leads with an empty
     * dashed box, so the labels line up.
     */
    swatch?: string
    /**
     * A quiet fact about the option in the list, such as the value it would inherit or what a role
     * may do: at the row's end, or under the label with `detailPlacement="below"`. The select shows
     * it only with `chosenDetail`.
     */
    detail?: ReactNode
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
    /** Where each option's `detail` goes in the list: at the row's end, or on a second line under its label. */
    detailPlacement?: 'end' | 'below'
    /** The select shows the chosen option's `detail` after its label, quiet, on its one line. */
    chosenDetail?: boolean
    autoFocus?: boolean
    readOnly?: boolean
    disabled?: boolean
    onChange?: (value: string) => void
    /** Classes for the field, such as its span in a grid. */
    className?: string
    words?: Partial<FieldWords>
}

/**
 * A labeled choice from a list: a `Field` with the library's select inside, wired together, laid
 * out as `TextField` and `NumberField` are. The label names the select, the help line describes
 * it, and an issue marks it invalid and draws its edge. `placeholder` shows while nothing is
 * chosen; `readOnly` shows the value with its list closed. An option's `icon`, or a theme's
 * `swatch`, goes before its label in the list and in the select once chosen, 8 before it. Its
 * `detail` is a quiet fact at the end of its row in the list, or on a second line under its label
 * with `detailPlacement="below"`; `chosenDetail` shows the chosen option's detail in the select
 * too, after its label.
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
    detailPlacement = 'end',
    chosenDetail = false,
    autoFocus,
    readOnly,
    disabled,
    onChange,
    className,
    words,
}: SelectFieldProps) {
    const all: Issue[] = [...(error === undefined || error === null ? [] : [{ tone: 'critical' as const, text: error }]), ...issues]
    const invalid = worst(all) === 'critical' || undefined
    const known = (given: string | undefined) =>
        given === undefined ? undefined : options.some((option) => option.value === given) ? given : null
    const swatches = options.some((option) => option.swatch !== undefined)
    // An option's lead: its theme's swatch where the options have them, else its icon.
    const leadOf = (option: SelectFieldOption) => (swatches ? <ThemeSwatch theme={option.swatch ?? null} /> : option.icon)
    // With leads or a chosen detail, the select draws the chosen option's lead and detail with its label; without, its label alone.
    const drawn = chosenDetail || swatches || options.some((option) => option.icon !== undefined)
    const shown = (chosen: string | null) => {
        const option = options.find((one) => one.value === chosen)
        return option === undefined ? (
            placeholder
        ) : (
            <OptionRow lead={leadOf(option)} swatch={swatches} label={option.label} detail={chosenDetail ? option.detail : undefined} />
        )
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
                    {drawn ? <SelectValue placeholder={placeholder}>{shown}</SelectValue> : <SelectValue placeholder={placeholder} />}
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                            detail={option.detail}
                            detailPlacement={detailPlacement}
                            className={cn(mono && 'font-mono')}
                        >
                            {!swatches && option.icon === undefined ? (
                                option.label
                            ) : (
                                <OptionRow lead={leadOf(option)} swatch={swatches} label={option.label} />
                            )}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Field>
    )
}

/**
 * An option's lead before its label, and its detail after it in the select: an icon sized and toned
 * as the rest of the field's, or a theme's swatch as it is drawn.
 */
function OptionRow({ lead, swatch, label, detail }: { lead: ReactNode; swatch: boolean; label: string; detail?: ReactNode }) {
    return (
        <>
            {lead !== undefined &&
                (swatch ? (
                    lead
                ) : (
                    <span aria-hidden className="flex shrink-0 items-center text-muted-foreground [&_svg]:size-4">
                        {lead}
                    </span>
                ))}
            <span className="min-w-0 truncate">{label}</span>
            {detail !== undefined && <span className="min-w-0 shrink-[2] truncate text-xs text-muted-foreground">{detail}</span>}
        </>
    )
}
