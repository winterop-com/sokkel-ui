import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { IconButton } from './IconButton'
import { Link } from './Link'
import { Toolbar, type ToolbarItem } from './Toolbar'
import type { Crumb } from './TopBar'

/** The words the header says, each with an English default. */
export interface PageHeaderWords {
    back: string
    /** The name of the trail, for assistive technology. */
    trail: string
    /** The button that holds the `items` the header has no room for. */
    more: string
}

const WORDS: PageHeaderWords = { back: 'Back', trail: 'Where you are', more: 'More' }

export interface PageHeaderProps {
    /** The page's title: its text, or a part drawn in its place, such as an `InlineEdit` with `variant="title"`. */
    title: ReactNode
    /** The addressable code, shown under the title unless it is the title. */
    code?: string
    /** A short count beside the title, such as how many rows are loaded. */
    count?: ReactNode
    /** A sentence under the title: what the page holds. */
    description?: ReactNode
    /** Small facts under the title, such as a byline. */
    meta?: ReactNode
    /**
     * A picture set before the title block and centered on it, such as an avatar, a project's mark
     * or an album's artwork; after the back button where there is one.
     */
    aside?: ReactNode
    /** Buttons, the primary one last. */
    actions?: ReactNode
    /**
     * Actions before `actions` that move, from the last, into a More menu when the header has no
     * room for them, drawn as outline buttons; the actions then take the room the title leaves.
     */
    items?: readonly ToolbarItem[]
    /**
     * The actions take the room the title leaves rather than their own width, for one part in
     * `actions` that spans it, measures itself and folds what does not fit, such as a `Toolbar`
     * with `items`. Set by `items`.
     */
    actionsFill?: boolean
    /** The places above this page, the furthest first. */
    trail?: readonly Crumb[]
    /** Draws a back button before the title. */
    onBack?: () => void
    /** Keeps the title to one line, cut short with an ellipsis, rather than wrapping. */
    singleLine?: boolean
    words?: Partial<PageHeaderWords>
}

const COLUMN = ['col-start-1', 'col-start-2', 'col-start-3'] as const
const ROWS = ['row-span-1', 'row-span-2', 'row-span-3', 'row-span-4', 'row-span-5'] as const

/**
 * A page's title, its code under it in the code face, and its actions at the right with the
 * primary one last. The actions stay on the title's row while the header has room for both, so one
 * compact action keeps its place beside a short title on a phone; a group too wide for that wraps
 * under the title rather than squeezing it.
 *
 * `items` are actions that give way instead: they stand before `actions` and move, from the last,
 * into a More menu as the header narrows, measured on the header itself, so the title keeps its
 * whole width and the row stays one line. `actionsFill` gives the same room to an app's own
 * measuring part in `actions`: the title takes the width it needs and the actions the rest.
 *
 * The title is the thing's name where it has one and its code otherwise; a code shown as the
 * title is not repeated under it. `description` is a sentence under the title saying what the
 * page holds; `meta` is a line of small facts under that, such as who wrote it and when. `aside`
 * is a picture before all of them, such as an avatar or artwork.
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
    aside,
    actions,
    items,
    actionsFill,
    trail,
    onBack,
    singleLine = false,
    words,
}: PageHeaderProps) {
    const said = { ...WORDS, ...words }
    const showCode = code !== undefined && code !== title
    const back = onBack !== undefined
    const beside = aside !== undefined && aside !== null
    const trailed = trail !== undefined && trail.length > 0
    const folding = items !== undefined && items.length > 0
    const fill = actionsFill ?? folding
    // Beside a back button or an aside the header is a grid: the button level with the title, the
    // aside down the side of every line, and every other line in the last column so it starts where
    // the title starts.
    const grid = back || beside
    const column = grid && COLUMN[Number(back) + Number(beside)]
    const rows = Number(trailed) + 1 + Number(showCode) + Number(description !== undefined) + Number(meta !== undefined)
    return (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div
                className={cn(
                    'min-w-0',
                    fill ? 'flex-[0_1_auto]' : 'flex-[1_1_16rem]',
                    grid && 'grid items-center gap-x-2',
                    grid && (back && beside ? 'grid-cols-[auto_auto_minmax(0,1fr)]' : 'grid-cols-[auto_minmax(0,1fr)]'),
                    beside && 'gap-x-3',
                )}
            >
                {back && (
                    <IconButton label={said.back} onClick={onBack} className={cn('col-start-1', trailed ? 'row-start-2' : 'row-start-1')}>
                        <ChevronLeft aria-hidden />
                    </IconButton>
                )}
                {beside && (
                    <div className={cn('row-start-1 flex shrink-0 items-center', COLUMN[Number(back)], ROWS[rows - 1])}>{aside}</div>
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
                                            <Link href={crumb.href} className={cn(face, 'transition-colors hover:text-foreground')}>
                                                {crumb.label}
                                            </Link>
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
                        title={singleLine && typeof title === 'string' ? title : undefined}
                        className={cn(
                            'min-w-0 font-heading text-page-title text-page-title-ink',
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
            {/* At least room for More and the primary action beside the title before the actions wrap under it. */}
            {folding ? (
                <div data-slot="page-header-actions" className="flex min-w-0 flex-[1_1_8rem] items-center justify-end gap-2">
                    <Toolbar items={items} itemVariant="outline" itemsAlign="end" className="flex-1" words={{ more: said.more }} />
                    {actions !== undefined && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
                </div>
            ) : fill ? (
                actions !== undefined && (
                    <div data-slot="page-header-actions" className="min-w-0 flex-[1_1_8rem]">
                        {actions}
                    </div>
                )
            ) : (
                actions !== undefined && (
                    // No wider than the header, so a group wrapped under the title wraps its own buttons too.
                    <div data-slot="page-header-actions" className="flex max-w-full shrink-0 flex-wrap items-center gap-2">
                        {actions}
                    </div>
                )
            )}
        </div>
    )
}
