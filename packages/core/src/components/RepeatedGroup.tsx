import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { IconButton } from './IconButton'
import { IssueMark, worst, type Issue } from './IssueMark'
import { Button } from './ui/button'

/** The words a repeated group says. */
export interface RepeatedGroupWords {
    add: string
    remove: string
    moveUp: string
    moveDown: string
    /** A row's name: its place, counted from 1. */
    item: (index: number) => string
    /** Said after the name of a required group, for a screen reader; the star is drawn. */
    required: string
}

export const REPEATED_GROUP_WORDS: RepeatedGroupWords = {
    add: 'Add',
    remove: 'Remove',
    moveUp: 'Move up',
    moveDown: 'Move down',
    item: (index) => `Item ${String(index + 1)}`,
    required: 'required',
}

export interface RepeatedGroupProps {
    /** The group's name, over its rows. */
    label: ReactNode
    /** What the group asks for, under its name. */
    description?: ReactNode
    /** The id of the group's name, which takes the focus, for a form's issue count to go to it. */
    id?: string
    /** Marked by a star after the name, as a required field is. */
    required?: boolean
    /** Why the group as a whole is refused (too few rows, one twice), as one critical issue. */
    error?: string | null
    issues?: readonly Issue[]
    /** Whether the mark's message is open, for a form's count to open it. */
    issueOpen?: boolean
    onIssueOpenChange?: (open: boolean) => void
    /** The rows' keys, in order, such as `useRepeated`'s `rows`. */
    rows: readonly { key: string }[]
    /** A row's fields. */
    children: (key: string, index: number) => ReactNode
    /** Adds a row; no Add button without it. */
    onAdd?: () => void
    /** Takes a row out; no Remove buttons without it. */
    onRemove?: (key: string) => void
    /** Moves a row by `by` places; no Move buttons without it. */
    onMove?: (key: string, by: number) => void
    /** The fewest rows the group keeps: Remove goes once it has this many. */
    min?: number
    /** The most rows it takes: Add goes once it has this many. */
    max?: number
    /** Nothing can be added, removed or moved. */
    readOnly?: boolean
    words?: Partial<RepeatedGroupWords>
    className?: string
}

/**
 * A group of fields asked again for each of several things in a hand-composed form, such as a
 * run's steps or a household's people: the group's name with Add, then each row in a box with its
 * number, Move up, Move down and Remove, and its fields. Hold the rows with `useRepeated`, so each
 * keeps its key and its fields' state as rows move. `SchemaForm` draws its lists of records with it.
 *
 * Like a `Field`, a `required` group has a star after its name, and what is wrong with the group as
 * a whole (`error`, `issues`) is the issue mark beside its name, opening the message, while each
 * row's own fields say their own.
 */
export function RepeatedGroup({
    label,
    description,
    id,
    required = false,
    error,
    issues: issuesGiven = [],
    issueOpen,
    onIssueOpenChange,
    rows,
    children,
    onAdd,
    onRemove,
    onMove,
    min = 0,
    max,
    readOnly = false,
    words: given,
    className,
}: RepeatedGroupProps) {
    const words = { ...REPEATED_GROUP_WORDS, ...given }
    const ownId = useId()
    const titleId = id ?? ownId
    const issues: Issue[] = [...(error === undefined || error === null ? [] : [{ tone: 'critical' as const, text: error }]), ...issuesGiven]
    const adding = !readOnly && onAdd !== undefined && (max === undefined || rows.length < max)
    const removing = !readOnly && onRemove !== undefined && rows.length > min
    const moving = !readOnly && onMove !== undefined && rows.length > 1
    return (
        <fieldset aria-labelledby={titleId} className={cn('flex min-w-0 flex-col gap-2', className)}>
            <div className="flex min-h-7 items-center gap-2">
                <span id={titleId} tabIndex={-1} className="flex min-w-0 items-baseline gap-1 text-sm font-medium outline-none">
                    <span className="min-w-0 truncate">{label}</span>
                    {required && (
                        <>
                            <span className="shrink-0 text-critical-ink" aria-hidden>
                                *
                            </span>
                            <span className="sr-only">{words.required}</span>
                        </>
                    )}
                </span>
                {worst(issues) !== null && (
                    <span className="relative flex size-7 shrink-0 items-center">
                        <IssueMark issues={issues} open={issueOpen} onOpenChange={onIssueOpenChange} className="inset-0 right-0" />
                    </span>
                )}
                {adding && (
                    <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onAdd}>
                        <Plus aria-hidden />
                        {words.add}
                    </Button>
                )}
            </div>
            {description !== undefined && <p className="-mt-1 text-xs text-muted-foreground">{description}</p>}
            {rows.map((row, index) => (
                <section key={row.key} className="flex min-w-0 flex-col gap-3 rounded-surface border border-border p-3">
                    <div className="-my-1 flex items-center gap-1">
                        <span className="text-xs font-medium text-muted-foreground">{words.item(index)}</span>
                        <span className="ml-auto flex items-center">
                            {moving && (
                                <>
                                    <IconButton
                                        label={`${words.moveUp}: ${words.item(index)}`}
                                        type="button"
                                        size="icon"
                                        disabled={index === 0}
                                        onClick={() => onMove(row.key, -1)}
                                    >
                                        <ArrowUp aria-hidden />
                                    </IconButton>
                                    <IconButton
                                        label={`${words.moveDown}: ${words.item(index)}`}
                                        type="button"
                                        size="icon"
                                        disabled={index === rows.length - 1}
                                        onClick={() => onMove(row.key, 1)}
                                    >
                                        <ArrowDown aria-hidden />
                                    </IconButton>
                                </>
                            )}
                            {removing && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground"
                                    aria-label={`${words.remove} ${words.item(index)}`}
                                    onClick={() => onRemove(row.key)}
                                >
                                    <X aria-hidden />
                                    {words.remove}
                                </Button>
                            )}
                        </span>
                    </div>
                    {children(row.key, index)}
                </section>
            ))}
        </fieldset>
    )
}
