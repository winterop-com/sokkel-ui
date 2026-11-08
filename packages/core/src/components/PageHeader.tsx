import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { IconButton } from './IconButton'
import type { Crumb } from './TopBar'

/** The words the header says, each with an English default. */
export interface PageHeaderWords {
    back: string
    /** The name of the trail, for assistive technology. */
    trail: string
}

const WORDS: PageHeaderWords = { back: 'Back', trail: 'Where you are' }

export interface PageHeaderProps {
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
    /** The places above this page, the furthest first. */
    trail?: readonly Crumb[]
    /** Draws a back button before the title. */
    onBack?: () => void
    /** Keeps the title to one line, cut short with an ellipsis, rather than wrapping. */
    singleLine?: boolean
    /** Draws a step of the trail that has an `href`, for an app's own router link. */
    renderLink?: (crumb: Crumb, className: string) => ReactNode
    words?: Partial<PageHeaderWords>
}

/**
 * A page's title, its code under it in the code face, and its actions at the right with the
 * primary one last. The actions stay on the title's row while the header has room for both, so one
 * compact action keeps its place beside a short title on a phone; a group too wide for that wraps
 * under the title rather than squeezing it.
 *
 * The title is the thing's name where it has one and its code otherwise; a code shown as the
 * title is not repeated under it. `description` is a sentence under the title saying what the
 * page holds; `meta` is a line of small facts under that, such as who wrote it and when.
 *
 * A page reached from another can say where it sits: `trail` draws the places above it small over
 * the title, nearest last, each a link back up, and `onBack` draws a back button level with the
 * title, the rest of the header lined up after it.
 *
 * A long title wraps; `singleLine` keeps it to one line, cut short with the whole of it on hover.
 */
export function PageHeader({
    title,
    code,
    count,
    description,
    meta,
    actions,
    trail,
    onBack,
    singleLine = false,
    renderLink = (crumb, className) => (
        <a href={crumb.href} className={className}>
            {crumb.label}
        </a>
    ),
    words,
}: PageHeaderProps) {
    const said = { ...WORDS, ...words }
    const showCode = code !== undefined && code !== title
    const back = onBack !== undefined
    const trailed = trail !== undefined && trail.length > 0
    // Beside a back button the header is two columns: the button level with the title, and every
    // other line in the second column so it starts where the title starts.
    const column = back && 'col-start-2'
    return (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className={cn('min-w-0 flex-[1_1_16rem]', back && 'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2')}>
                {back && (
                    <IconButton label={said.back} onClick={onBack} className={cn('col-start-1', trailed ? 'row-start-2' : 'row-start-1')}>
                        <ChevronLeft aria-hidden />
                    </IconButton>
                )}
                {trailed && (
                    <nav aria-label={said.trail} className={cn('min-w-0', column)}>
                        <ol className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                            {trail.map((crumb, index) => {
                                const face = cn('truncate', crumb.code === true && 'font-mono')
                                return (
                                    <li key={`${crumb.label}-${String(index)}`} className="flex min-w-0 items-center gap-1">
                                        {crumb.href === undefined ? (
                                            <span className={face}>{crumb.label}</span>
                                        ) : (
                                            renderLink(crumb, cn(face, 'transition-colors hover:text-foreground'))
                                        )}
                                        <ChevronRight className="size-3 shrink-0 text-faint" aria-hidden />
                                    </li>
                                )
                            })}
                        </ol>
                    </nav>
                )}
                <div className={cn('flex min-w-0 items-baseline gap-2', column)}>
                    <h1
                        title={singleLine ? title : undefined}
                        className={cn(
                            'min-w-0 text-page-title',
                            singleLine ? 'truncate' : 'text-pretty break-words',
                            !showCode && code !== undefined && 'font-mono',
                        )}
                    >
                        {title}
                    </h1>
                    {count !== undefined && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{count}</span>}
                </div>
                {showCode && <p className={cn('truncate font-mono text-xs text-muted-foreground', column)}>{code}</p>}
                {description !== undefined && <p className={cn('mt-1 max-w-prose text-sm text-muted-foreground', column)}>{description}</p>}
                {meta !== undefined && (
                    <div className={cn('mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground', column)}>
                        {meta}
                    </div>
                )}
            </div>
            {actions !== undefined && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}
