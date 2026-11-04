import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/cn'

/**
 * A form control with its label, an optional hint beside the label, help under the control, and
 * the error that replaces nothing else when there is one.
 *
 * The control is passed as children and takes `id` itself; `describedBy(id, …)` gives it the
 * `aria-describedby` that points at the help and the error.
 */
export function Field({
    id,
    label,
    hint,
    required,
    help,
    error,
    mono = false,
    children,
    className,
    words = { required: 'required' },
}: {
    id: string
    label: string
    /** A short note beside the label: a unit, a format, a default. */
    hint?: string
    required?: boolean
    /** A sentence under the control. */
    help?: ReactNode
    /** Why the value is refused; shown only once it is set. */
    error?: string | null
    /** The label names a key, so it is drawn in the code face. */
    mono?: boolean
    children: ReactNode
    className?: string
    words?: { required: string }
}) {
    return (
        <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <Label htmlFor={id} className={cn('leading-5', mono && 'font-mono')}>
                    {label}
                </Label>
                {required === true && <span className="text-xs text-foreground">{words.required}</span>}
                {hint !== undefined && <span className="text-xs text-faint">{hint}</span>}
            </div>
            {children}
            {help !== undefined && (
                <p id={`${id}-help`} className="text-xs text-muted-foreground">
                    {help}
                </p>
            )}
            {error !== undefined && error !== null && (
                <p id={`${id}-error`} className="text-xs text-critical-ink">
                    {error}
                </p>
            )}
        </div>
    )
}

/** The `aria-describedby` a control in a `Field` takes, naming its help and its error. */
export function describedBy(id: string, { help, error }: { help?: unknown; error?: string | null }): string | undefined {
    const ids = [help !== undefined ? `${id}-help` : null, error !== undefined && error !== null ? `${id}-error` : null]
    const said = ids.filter((one) => one !== null).join(' ')
    return said === '' ? undefined : said
}
