import { useId, type ReactNode } from 'react'

import { cn } from '../lib/cn'

export interface FieldGroupProps {
    /** The group's name, over its fields. */
    label: ReactNode
    /** A short note beside the name: a unit, a format, a default. */
    hint?: string
    /** The hint names a key or a zone, so it is drawn in the code face. */
    keyHint?: boolean
    /** A sentence under the name: what the fields together ask for. */
    description?: ReactNode
    /** Controls at the end of the name's row, such as a Segmented that switches how the fields are edited. */
    actions?: ReactNode
    /** The id of the group's name, which labels the group. */
    id?: string
    /** The fields, such as a `Columns` of them. */
    children: ReactNode
    className?: string
}

/**
 * A named set of fields that belong together, such as a window's start and end: a fieldset whose
 * name is drawn as a field's label is, with a hint beside it, a sentence under it and controls at
 * the end of its row, and the fields under them. The group is labelled by its name, so a screen
 * reader says it before each field in it. Its row is as tall as a `RepeatedGroup`'s head, so the
 * two sit together in one form.
 */
export function FieldGroup({ label, hint, keyHint = false, description, actions, id, children, className }: FieldGroupProps) {
    const ownId = useId()
    const labelId = id ?? ownId
    return (
        <fieldset aria-labelledby={labelId} className={cn('flex min-w-0 flex-col gap-3', className)}>
            <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex min-h-(--density-control-sm) min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span id={labelId} className="min-w-0 text-sm font-medium">
                        {label}
                    </span>
                    {hint !== undefined && (
                        <span className={cn('text-xs', keyHint ? 'font-mono text-muted-foreground' : 'text-faint')}>{hint}</span>
                    )}
                    {actions !== undefined && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
                </div>
                {description !== undefined && <p className="text-xs text-pretty text-muted-foreground">{description}</p>}
            </div>
            {children}
        </fieldset>
    )
}
