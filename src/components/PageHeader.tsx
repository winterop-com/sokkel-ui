import type { ReactNode } from 'react'

/**
 * A page's title, its code under it in the code face, and its actions at the right with the
 * primary one last. On a narrow screen the actions move under the title rather than squeezing
 * beside it.
 *
 * The title is the thing's name where it has one and its code otherwise; a code shown as the
 * title is not repeated under it. `description` is a sentence under the title saying what the
 * page holds; `meta` is a line of small facts under that, such as who wrote it and when.
 */
export function PageHeader({
    title,
    code,
    count,
    description,
    meta,
    actions,
}: {
    title: string
    /** The addressable code, shown under the title unless it is the title. */
    code?: string
    /** A short count beside the title, such as how many rows are loaded. */
    count?: ReactNode
    /** A sentence under the title: what the page holds. */
    description?: ReactNode
    /** Small facts under the title, such as a byline. */
    meta?: ReactNode
    /** Buttons, the primary one last. */
    actions?: ReactNode
}) {
    const showCode = code !== undefined && code !== title
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                    <h1
                        className={
                            showCode || code === undefined
                                ? 'truncate text-page font-medium tracking-tight'
                                : 'truncate font-mono text-page font-medium tracking-tight'
                        }
                    >
                        {title}
                    </h1>
                    {count !== undefined && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{count}</span>}
                </div>
                {showCode && <p className="truncate font-mono text-xs text-muted-foreground">{code}</p>}
                {description !== undefined && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>}
                {meta !== undefined && (
                    <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{meta}</div>
                )}
            </div>
            {actions !== undefined && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}
