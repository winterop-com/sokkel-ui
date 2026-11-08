import { Check, MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'

import { useClamped } from '../hooks/use-clamped'
import { cn } from '../lib/cn'
import { TITLE_LINES, type TitleLines } from '../lib/title-lines'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './ui/dropdown-menu'

/** A fact at a card's foot: what it is, and its value. */
export interface CardFact {
    label: ReactNode
    value: ReactNode
}

/** The words an item card says. */
export interface ItemCardWords {
    menu: string
}

const WORDS: ItemCardWords = {
    menu: 'More actions',
}

/**
 * The card for one thing: a project, a job, an album, a plan. Its title is the thing's name, or its
 * code when it has none; the code is drawn once, in the code face. A description, a status and
 * facts at the foot follow, and media, such as artwork, may sit on top.
 *
 * Given `href` or `onSelect` the whole card is one control, washing on hover and drawing the
 * focus outline when reached by keyboard; `selected` marks the chosen card of a set, as a plan
 * picker does. A `menu` sits at the head's right and stays its own control.
 *
 * The title takes up to `titleLines` lines, two by default; one cut short shows its whole text on hover.
 */
export function ItemCard({
    title,
    code,
    description,
    media,
    status,
    facts,
    menu,
    href,
    onSelect,
    selected,
    titleLines = 2,
    className,
    words: given,
}: {
    /** The name; with none, the code is the title. */
    title?: ReactNode
    code?: string
    description?: ReactNode
    /** Drawn edge to edge at the top: artwork, a preview. */
    media?: ReactNode
    status?: ReactNode
    facts?: readonly CardFact[]
    /** Dropdown menu items behind the head's more button. */
    menu?: ReactNode
    href?: string
    onSelect?: () => void
    /** Marks the chosen card when the cards are a set to choose from. */
    selected?: boolean
    /** How many lines the title may take before it is cut short. */
    titleLines?: TitleLines
    className?: string
    words?: Partial<ItemCardWords>
}) {
    const words = { ...WORDS, ...given }
    const heading = title ?? code
    const showCode = title !== undefined && code !== undefined
    const interactive = href !== undefined || onSelect !== undefined
    const Cover = href !== undefined ? 'a' : 'button'
    const [titleRef, clamped] = useClamped<HTMLHeadingElement>()
    return (
        <article
            data-selected={selected || undefined}
            className={cn(
                'group/item relative flex min-w-0 flex-col overflow-hidden rounded-surface border border-border-strong bg-card text-sm text-card-foreground transition-colors',
                interactive && 'hover:border-foreground/25 hover:bg-hover',
                selected === true && 'border-primary ring-1 ring-primary',
                className,
            )}
        >
            {interactive && (
                <Cover
                    {...(href !== undefined ? { href } : { type: 'button' as const, onClick: onSelect, 'aria-pressed': selected })}
                    className="absolute inset-0 z-0 rounded-surface outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                >
                    <span className="sr-only">{typeof heading === 'string' ? heading : code}</span>
                </Cover>
            )}
            {media !== undefined && (
                <div className="pointer-events-none aspect-[16/9] overflow-hidden bg-muted [&>*]:size-full">{media}</div>
            )}
            <div className="pointer-events-none flex flex-1 flex-col gap-2 p-4">
                <header className="flex items-start gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <h3
                            ref={titleRef}
                            title={clamped && typeof heading === 'string' ? heading : undefined}
                            className={cn('text-section-title', TITLE_LINES[titleLines], title === undefined && 'font-mono')}
                        >
                            {heading}
                        </h3>
                        {showCode && <span className="truncate font-mono text-xs text-muted-foreground">{code}</span>}
                    </div>
                    {selected === true && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-3.5" aria-hidden />
                        </span>
                    )}
                    {menu !== undefined && (
                        <div className="pointer-events-auto relative z-10 -mt-1 -mr-1">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    aria-label={words.menu}
                                    title={words.menu}
                                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                                >
                                    <MoreHorizontal className="size-4" aria-hidden />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    {menu}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </header>
                {status !== undefined && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{status}</div>}
                {description !== undefined && <p className="line-clamp-3 text-muted-foreground">{description}</p>}
            </div>
            {facts !== undefined && facts.length > 0 && (
                <dl className="pointer-events-none grid grid-cols-[repeat(auto-fit,minmax(5rem,1fr))] gap-3 border-t border-border px-4 py-2.5">
                    {facts.map((fact, index) => (
                        <div key={index} className="flex min-w-0 flex-col">
                            <dt className="truncate text-xs text-muted-foreground">{fact.label}</dt>
                            <dd className="truncate text-sm tabular-nums">{fact.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </article>
    )
}
