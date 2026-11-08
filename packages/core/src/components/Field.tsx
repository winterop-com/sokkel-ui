import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { IssueMark, worst, type Issue } from './IssueMark'
import { Label } from './ui/label'

/** The words a field says. */
export interface FieldWords {
    required: string
}

const WORDS: FieldWords = {
    required: 'required',
}

/**
 * A form control with its label, an optional hint beside the label, and help under the control. A
 * required field is marked by a star after its label, and says "required" to a screen reader.
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
 */
export function Field({
    id,
    label,
    hint,
    required,
    description,
    help,
    error,
    issues: issuesGiven = [],
    issueOpen,
    onIssueOpenChange,
    mono = false,
    keyHint = false,
    children,
    className,
    words: given,
}: {
    id: string
    label: string
    /** A short note beside the label: a unit, a format, a default. */
    hint?: string
    required?: boolean
    /** A sentence between the label and the control: what the question asks. */
    description?: ReactNode
    /** A sentence under the control. */
    help?: ReactNode
    /** Why the value is refused, as one critical issue; shown only once it is set. */
    error?: string | null
    issues?: readonly Issue[]
    /** Whether the mark's message is open, for a form's count to open it. */
    issueOpen?: boolean
    onIssueOpenChange?: (open: boolean) => void
    /** The label names a key, so it is drawn in the code face. */
    mono?: boolean
    /** The hint is the setting's key, as a document or a command line writes it: drawn in the code face, never translated. */
    keyHint?: boolean
    children: ReactNode
    className?: string
    words?: Partial<FieldWords>
}) {
    const words = { ...WORDS, ...given }
    const issues: Issue[] = [...(error === undefined || error === null ? [] : [{ tone: 'critical' as const, text: error }]), ...issuesGiven]
    const tone = worst(issues)
    return (
        <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <Label htmlFor={id} className={cn(mono && 'font-mono')}>
                    {label}
                    {required === true && (
                        <>
                            <span className="-ml-1 text-critical-ink" aria-hidden>
                                *
                            </span>
                            <span className="sr-only">{words.required}</span>
                        </>
                    )}
                </Label>
                {hint !== undefined && (
                    <span className={cn('text-xs', keyHint ? 'font-mono text-muted-foreground' : 'text-faint')}>{hint}</span>
                )}
            </div>
            {description !== undefined && (
                <p id={`${id}-description`} className="text-body text-pretty text-muted-foreground">
                    {description}
                </p>
            )}
            {tone === null ? (
                children
            ) : (
                <div
                    className={cn(
                        'relative min-w-0 [&>:first-child]:pr-9',
                        tone === 'critical'
                            ? '[&>:first-child]:border-critical/80 [&>:first-child]:focus-visible:border-critical [&>:first-child]:focus-visible:ring-critical/25'
                            : '[&>:first-child]:border-warning/80 [&>:first-child]:focus-visible:border-warning [&>:first-child]:focus-visible:ring-warning/25',
                    )}
                >
                    {children}
                    <IssueMark issues={issues} open={issueOpen} onOpenChange={onIssueOpenChange} />
                </div>
            )}
            {help !== undefined && (
                <p id={`${id}-help`} className="text-help text-muted-foreground">
                    {help}
                </p>
            )}
        </div>
    )
}

/** The `aria-describedby` a control in a `Field` takes, naming its description and its help; an issue speaks from its mark. */
export function describedBy(
    id: string,
    { help, description }: { help?: unknown; description?: unknown; error?: string | null },
): string | undefined {
    const ids = [description === undefined ? null : `${id}-description`, help === undefined ? null : `${id}-help`].filter(
        (one) => one !== null,
    )
    return ids.length === 0 ? undefined : ids.join(' ')
}
