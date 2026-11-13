import { X } from 'lucide-react'
import { useEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode, type RefObject } from 'react'

import { cn } from '../lib/cn'
import { describedBy, Field, type FieldWords, type RequiredMark } from './Field'
import { worst, type Issue } from './IssueMark'
import { Input } from './ui/input'

/** A small button inside a typed field's frame: the picker, a clear, a step. */
export const FRAME_BUTTON =
    'flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-hover'

/** What a typed field holds: the value it stands for, and the text in its input. */
export interface Entry<V> {
    value: V | null
    text: string
    /** Text is typed that does not read as a value. */
    unreadable: boolean
    /** Whether the field's problem, if it has one, is said now. */
    said: boolean
    /** Text typed: the value follows when it reads, and stays as it was when it does not. */
    type: (text: string) => void
    /** The field left: text that reads is written again in the field's format. */
    leave: () => void
    /** A value put in whole, by a picker, a step, a clear or an issue's action. */
    set: (value: V | null) => void
}

/**
 * The state of a field typed as text and held as a value. The text follows the value when it
 * changes from outside; typed text that reads becomes the value at once, and text that does not
 * leaves the value as it was. A problem (text that does not read, or a value `wrong` refuses) is
 * said once the field is left, at once for a value given from outside, and goes the moment it is
 * put right; a new one waits until the field is left again.
 */
export function useEntry<V extends string | number>({
    value,
    defaultValue,
    onValueChange,
    read,
    write,
    wrong,
}: {
    value: V | null | undefined
    defaultValue: V | null | undefined
    onValueChange?: (value: V | null) => void
    /** The value trimmed, non-empty text stands for, or null when it stands for none. */
    read: (text: string) => V | null
    write: (value: V) => string
    /** Whether a value that reads is still wrong, such as one outside the bounds. */
    wrong?: (value: V) => boolean
}): Entry<V> {
    const controlled = value !== undefined
    const [own, setOwn] = useState<V | null>(defaultValue ?? null)
    const current = controlled ? value : own
    const [text, setText] = useState(() => (current === null ? '' : write(current)))
    const [basis, setBasis] = useState<V | null>(current)
    const [told, setTold] = useState(true)
    if (!Object.is(basis, current)) {
        setBasis(current)
        setText(current === null ? '' : write(current))
        setTold(true)
    }
    const typed = text.trim()
    const unreadable = typed !== '' && read(typed) === null
    const problem = unreadable || (current !== null && wrong?.(current) === true)
    if (told && !problem) setTold(false)

    const commit = (next: V | null) => {
        setBasis(next)
        if (!controlled) setOwn(next)
        if (!Object.is(next, current)) onValueChange?.(next)
    }
    return {
        value: current,
        text,
        unreadable,
        said: problem && told,
        type: (next) => {
            setText(next)
            const trimmed = next.trim()
            const read_ = trimmed === '' ? null : read(trimmed)
            if (trimmed === '' || read_ !== null) commit(read_)
        },
        leave: () => {
            setTold(true)
            if (typed === '') return setText('')
            const read_ = read(typed)
            if (read_ !== null) setText(write(read_))
        },
        set: (next) => {
            setText(next === null ? '' : write(next))
            commit(next)
            setTold(true)
        },
    }
}

/** What a field says of a value outside its bounds, each bound written as the field writes it. */
export interface BoundWords {
    /** Said of a value under `min`. */
    under: (min: string) => string
    /** Said of a value over `max`. */
    over: (max: string) => string
    /** The action that puts in the bound the value passed. */
    use: (bound: string) => string
}

/** The props every typed field shares: its label, help and issues, its value, its bounds and its input. */
export interface EntryFieldProps<V> {
    id: string
    label: string
    /** A short note beside the label: a unit, a format, a default. */
    hint?: string
    /** A sentence between the label and the input: what the question asks. */
    description?: string
    /** A sentence under the input. */
    help?: string
    /** A required field has no clear button. */
    required?: boolean
    /** How `required` is marked: a star in the label, or the word after it. */
    requiredMark?: RequiredMark
    /** What applies when the field is left empty, under the input: "Default is 3 retries". */
    fallback?: string
    /** Why the value is refused, as one critical issue, beside what the field finds itself. */
    error?: string | null
    issues?: readonly Issue[]
    issueOpen?: boolean
    onIssueOpenChange?: (open: boolean) => void
    /** The value, held from outside with `onValueChange`; null for none. */
    value?: V | null
    /** The value it starts with when `value` is not given. */
    defaultValue?: V | null
    /** Called with each value typed or picked that reads, and null when the field is emptied. */
    onValueChange?: (value: V | null) => void
    /**
     * Told what the field finds wrong itself (text that does not read, or a value outside the
     * bounds), and null once it is put right, so a form can count it and hold its submit. It is
     * told at once, before the field shows it.
     */
    onIssueChange?: (issue: Issue | null) => void
    /** The lowest value allowed; one under it is kept and said, with an action that puts in the bound. */
    min?: V
    /** The highest value allowed. */
    max?: V
    placeholder?: string
    /** The value set in the code face, as keys and stamps are. */
    mono?: boolean
    disabled?: boolean
    readOnly?: boolean
    autoFocus?: boolean
    onBlur?: () => void
    /** Classes for the field, such as its span in a grid; for the input's frame when `bare`. */
    className?: string
    /**
     * Drawn without its label and issue mark, for a form or a table cell that draws its own around
     * it: `label` names the input, the issues given color its edge, and what it finds wrong itself
     * goes only to `onIssueChange`.
     */
    bare?: boolean
}

export interface TypedFieldProps<V extends string | number> extends EntryFieldProps<V> {
    read: (text: string) => V | null
    write: (value: V) => string
    before: (value: V, other: V) => boolean
    /** What is said of typed text that does not read. */
    unreadable: (text: string) => Issue
    bounds: BoundWords
    /** The field's own words, such as the one said of a required field. */
    fieldWords?: Partial<FieldWords>
    /** The clear button's label, for a field that can be emptied while it is not required. */
    clear?: string
    /** Text before the input, such as a currency. */
    prefix?: string
    /** Text after the input, such as a unit or a zone. */
    suffix?: string
    inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
    /** The buttons at the frame's end, given the field's state and its frame. */
    end?: (entry: Entry<V>, frame: RefObject<HTMLDivElement | null>) => ReactNode
    onKeyDown?: (event: KeyboardEvent<HTMLInputElement>, entry: Entry<V>) => void
    /** The input focused or the frame pointed at, such as to fetch what a picker needs. */
    onReach?: () => void
}

/**
 * A value typed as text into a `Field`: the input in a frame with text before and after it and
 * buttons at its end, the value read from what is typed and written back in one format when the
 * field is left. Text that does not read, and a value outside the bounds, are said with the
 * field's issue mark, beside any issue given from outside.
 */
export function TypedField<V extends string | number>({
    id,
    label,
    hint,
    description,
    help,
    required = false,
    requiredMark,
    fallback,
    error,
    issues: given = [],
    issueOpen,
    onIssueOpenChange,
    value,
    defaultValue,
    onValueChange,
    onIssueChange,
    min,
    max,
    placeholder,
    mono = false,
    disabled,
    readOnly,
    autoFocus,
    onBlur,
    className,
    bare = false,
    read,
    fieldWords,
    write,
    before,
    unreadable,
    bounds,
    clear,
    prefix,
    suffix,
    inputMode,
    end,
    onKeyDown,
    onReach,
}: TypedFieldProps<V>) {
    const frame = useRef<HTMLDivElement>(null)
    const under = (at: V) => min !== undefined && before(at, min)
    const over = (at: V) => max !== undefined && before(max, at)
    const entry = useEntry({ value, defaultValue, onValueChange, read, write, wrong: (at) => under(at) || over(at) })
    const bound = entry.value === null ? undefined : under(entry.value) ? min : over(entry.value) ? max : undefined
    const own: Issue | null = entry.unreadable
        ? unreadable(entry.text.trim())
        : bound === undefined
          ? null
          : {
                tone: 'critical',
                text: (bound === min ? bounds.under : bounds.over)(write(bound)),
                actions: [{ label: bounds.use(write(bound)), onClick: () => entry.set(bound) }],
            }
    useReported(own, onIssueChange)
    const issues: Issue[] = [
        ...(own !== null && entry.said && !bare ? [own] : []),
        ...(error === undefined || error === null ? [] : [{ tone: 'critical' as const, text: error }]),
        ...given,
    ]
    const tone = worst(issues)
    const editable = disabled !== true && readOnly !== true
    const clearable = clear !== undefined && !required && editable && entry.text !== ''
    const ending = editable ? end?.(entry, frame) : undefined
    const buttons = (clearable || (ending !== undefined && ending !== null && ending !== false)) && (
        <>
            {clearable && (
                <button
                    type="button"
                    aria-label={clear}
                    title={clear}
                    className={FRAME_BUTTON}
                    onClick={() => {
                        entry.set(null)
                        frame.current?.querySelector('input')?.focus()
                    }}
                >
                    <X className="size-3.5" aria-hidden />
                </button>
            )}
            {ending}
        </>
    )
    const input = (
        <div
            ref={frame}
            onPointerEnter={onReach}
            onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest('button,input') !== null) return
                event.preventDefault()
                event.currentTarget.querySelector('input')?.focus()
            }}
            className={cn(
                'flex h-8 w-full min-w-0 cursor-text items-center gap-1 rounded-control border border-input bg-field px-2.5 text-base transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring md:text-sm',
                disabled === true && 'cursor-not-allowed bg-input/50 opacity-50',
                tone === 'critical' && 'border-critical/80 focus-within:border-critical focus-within:ring-critical/25',
                tone === 'warning' && 'border-warning/80 focus-within:border-warning focus-within:ring-warning/25',
                buttons !== false && 'pr-1',
                bare && className,
            )}
        >
            {prefix !== undefined && <span className="shrink-0 text-muted-foreground select-none">{prefix}</span>}
            <Input
                bare
                id={id}
                value={entry.text}
                placeholder={placeholder}
                inputMode={inputMode}
                autoComplete="off"
                spellCheck={false}
                autoFocus={autoFocus}
                disabled={disabled}
                readOnly={readOnly}
                aria-label={bare && label !== '' ? label : undefined}
                aria-invalid={tone === 'critical' || undefined}
                aria-required={required || undefined}
                aria-describedby={describedBy(id, { help, description, fallback })}
                onChange={(event) => entry.type(event.target.value)}
                onFocus={onReach}
                onBlur={() => {
                    entry.leave()
                    onBlur?.()
                }}
                onKeyDown={(event) => onKeyDown?.(event, entry)}
                className={cn('h-full min-w-0 flex-1 tabular-nums', mono && 'font-mono')}
            />
            {suffix !== undefined && <span className="shrink-0 text-muted-foreground select-none">{suffix}</span>}
            {buttons}
        </div>
    )
    if (bare) return input
    return (
        <Field
            id={id}
            label={label}
            hint={hint}
            description={description}
            help={help}
            fallback={fallback}
            required={required}
            requiredMark={requiredMark}
            issues={issues}
            words={fieldWords}
            issueOpen={issueOpen}
            onIssueOpenChange={onIssueOpenChange}
            className={className}
        >
            {input}
        </Field>
    )
}

/** Tells `onIssueChange` the field's own issue each time it changes, and null once it is gone. */
function useReported(issue: Issue | null, onIssueChange?: (issue: Issue | null) => void) {
    const latest = useRef({ issue, onIssueChange })
    latest.current = { issue, onIssueChange }
    const key = issue === null ? '' : `${issue.tone}:${issue.text}`
    useEffect(() => {
        latest.current.onIssueChange?.(latest.current.issue)
    }, [key])
}
