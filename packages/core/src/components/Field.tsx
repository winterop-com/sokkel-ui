import { useContext, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { FieldRows } from './field-rows'
import { IssueMark, worst, type Issue } from './IssueMark'
import { Label } from './ui/label'

/** The words a field says. */
export interface FieldWords {
    /** Said by a star's screen reader text, or drawn after the label as the `word` mark. */
    required: string
}

/**
 * How a required field is marked: `star`, a star in the label with the word said to a screen
 * reader; `word`, the word drawn after the label and outside it, so the control's name stays the
 * label alone.
 */
export type RequiredMark = 'star' | 'word'

const WORDS: FieldWords = {
    required: 'required',
}

export interface FieldProps {
    id: string
    label: string
    /** A short note beside the label: a unit, a format, a default. */
    hint?: string
    required?: boolean
    /** How `required` is marked; a star by default. */
    requiredMark?: RequiredMark
    /** A sentence between the label and the control: what the question asks. */
    description?: ReactNode
    /** A sentence under the control. */
    help?: ReactNode
    /** What applies when the field is left empty, as "Default is 3 retries": a line under the control, after the help. */
    fallback?: ReactNode
    /** Why the value is refused, as one critical issue; shown only once it is set. */
    error?: string | null
    issues?: readonly Issue[]
    /** Whether the mark's message is open, for a form's count to open it. */
    issueOpen?: boolean
    onIssueOpenChange?: (open: boolean) => void
    /** A part beside the label, after the hint: a badge, a link to the docs. */
    note?: ReactNode
    /** The label names a key, so it is drawn in the code face. */
    mono?: boolean
    /** The hint is the setting's key, as a document or a command line writes it: drawn in the code face, never translated. */
    keyHint?: boolean
    children: ReactNode
    className?: string
    words?: Partial<FieldWords>
}

/**
 * Focuses a field's control when a press on its label would not: a label focuses an input, a
 * select or a button by itself, but not an editor drawn as editable text, such as a code editor.
 */
function focusUnlabelable(id: string) {
    const control = document.getElementById(id)
    if (control === null || control.matches('input, select, textarea, button, meter, output, progress')) return
    control.focus()
}

/**
 * A form control with its label, an optional hint beside the label, and help under the control. A
 * required field is marked by a star after its label, and says "required" to a screen reader;
 * `requiredMark="word"` draws the word after the label instead, outside it, so the control is named
 * by the label alone. Either way the control says it is required itself, with `aria-required`.
 * `fallback` says under the control what applies when the field is left empty.
 * `description` is a sentence between the label and the control saying what the question asks, as a
 * long form explains its questions; `help` under the control says what a right answer looks like.
 *
 * A problem with the value is the library's issue mark at the control's end, with the control's
 * edge in the issue's color: `error` for one refusal, `issues` for several or for a warning. The
 * message opens from the mark, so nothing is inserted under the field and a form never changes
 * height; a form counts its issues beside its verb with `IssueCount`.
 *
 * The control is passed as children and takes `id` itself; `describedBy(id, …)` gives it the
 * `aria-describedby` that points at the description and the help.
 *
 * A setting a document names by key is labeled in words, with the key beside the label as a
 * `keyHint`: the words can be translated, the key never is.
 *
 * In `Columns` with `fields`, the field shares its four rows with the fields beside it, so a row's
 * controls stand level whichever of them has a description or help.
 */
export function Field({
    id,
    label,
    hint,
    required,
    requiredMark = 'star',
    description,
    help,
    fallback,
    error,
    issues: issuesGiven = [],
    issueOpen,
    onIssueOpenChange,
    note,
    mono = false,
    keyHint = false,
    children,
    className,
    words: given,
}: FieldProps) {
    const words = { ...WORDS, ...given }
    const issues: Issue[] = [...(error === undefined || error === null ? [] : [{ tone: 'critical' as const, text: error }]), ...issuesGiven]
    const tone = worst(issues)
    const rows = useContext(FieldRows)
    const lined = rows !== null
    // The control keeps one place in the tree whether or not it has issues, so an issue coming or
    // going never mounts it afresh and loses what it holds.
    const control = (
        <div
            className={cn(
                'relative min-w-0',
                tone !== null && '[&>:first-child]:pr-9',
                tone === 'critical' &&
                    '[&>:first-child]:border-critical/80 [&>:first-child]:focus-visible:border-critical [&>:first-child]:focus-visible:ring-critical/25',
                tone === 'warning' &&
                    '[&>:first-child]:border-warning/80 [&>:first-child]:focus-visible:border-warning [&>:first-child]:focus-visible:ring-warning/25',
            )}
        >
            {children}
            {tone !== null && <IssueMark issues={issues} open={issueOpen} onOpenChange={onIssueOpenChange} />}
        </div>
    )
    return (
        <div
            className={cn(lined ? 'grid min-w-0' : 'flex min-w-0 flex-col gap-1.5', className)}
            // Four rows shared with the fields beside it, and the room before the next row of fields as its own foot.
            style={lined ? { gridRow: 'span 4', gridTemplateRows: 'subgrid', rowGap: 0, paddingBottom: rows } : undefined}
        >
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <Label htmlFor={id} className={cn(mono && 'font-mono')} onClick={() => focusUnlabelable(id)}>
                    {label}
                    {required === true && requiredMark === 'star' && (
                        <>
                            <span className="-ml-1 text-critical-ink" aria-hidden>
                                *
                            </span>
                            <span className="sr-only">{words.required}</span>
                        </>
                    )}
                </Label>
                {required === true && requiredMark === 'word' && <span className="text-xs text-muted-foreground">{words.required}</span>}
                {hint !== undefined && (
                    <span className={cn('text-xs', keyHint ? 'font-mono text-muted-foreground' : 'text-faint')}>{hint}</span>
                )}
                {note !== undefined && <span className="min-w-0 text-xs text-faint">{note}</span>}
            </div>
            {description !== undefined ? (
                <p id={`${id}-description`} className={cn('text-body text-pretty text-muted-foreground', lined && 'pt-1.5')}>
                    {description}
                </p>
            ) : (
                lined && <span aria-hidden />
            )}
            {lined ? <div className="min-w-0 pt-1.5">{control}</div> : control}
            {help !== undefined || fallback !== undefined ? (
                <div className={cn('flex min-w-0 flex-col gap-0.5 text-help text-muted-foreground', lined && 'pt-1.5')}>
                    {help !== undefined && <p id={`${id}-help`}>{help}</p>}
                    {fallback !== undefined && <p id={`${id}-fallback`}>{fallback}</p>}
                </div>
            ) : (
                lined && <span aria-hidden />
            )}
        </div>
    )
}

/** The `aria-describedby` a control in a `Field` takes, naming its description, its help and its fallback; an issue speaks from its mark. */
export function describedBy(
    id: string,
    { help, description, fallback }: { help?: unknown; description?: unknown; fallback?: unknown; error?: string | null },
): string | undefined {
    const ids = [
        description === undefined ? null : `${id}-description`,
        help === undefined ? null : `${id}-help`,
        fallback === undefined ? null : `${id}-fallback`,
    ].filter((one) => one !== null)
    return ids.length === 0 ? undefined : ids.join(' ')
}
