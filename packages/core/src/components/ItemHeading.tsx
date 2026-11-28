import type { ReactNode } from 'react'

import { useClamped } from '../hooks/use-clamped'
import { cn } from '../lib/cn'
import { TITLE_LINES, type TitleLines } from '../lib/title-lines'

/** What a thing's heading says: its name, else its code, and the code beside or under it only when the name is not it. */
export interface Identity {
    heading: ReactNode
    /** The code to show apart from the heading; undefined when the code is the heading or there is none. */
    code?: string
    /** The heading is the code, so it is drawn in the code face. */
    codeIsHeading: boolean
}

/** A code with a place to wrap after each of its own breaks (`-`, `.`, `_`, `/`, `:`), so a long one wraps there rather than mid-word. */
export function codeBreaks(code: string): ReactNode[] {
    return code.split(/(?<=[-._/:])/).flatMap((part, index) => (index === 0 ? [part] : [<wbr key={index} />, part]))
}

/** A thing's heading and the code shown apart from it: the name where there is one, else the code, the code shown once. */
export function identityOf(name: ReactNode, code: string | undefined): Identity {
    const codeIsHeading = code !== undefined && (name === undefined || name === null || name === code)
    return codeIsHeading ? { heading: code, codeIsHeading } : { heading: name, code, codeIsHeading }
}

export interface ItemHeadingProps {
    /** The thing's name; with none, the code is the heading. */
    name?: ReactNode
    /** The thing's addressable code, drawn in the code face. */
    code?: string
    /** `stacked` sets the code under the name; `inline` beside it, on one line. */
    variant?: 'stacked' | 'inline'
    /** `panel` for a card, a list's detail or a side panel; `dialog` for a dialog's or a sheet's head. */
    size?: 'panel' | 'dialog'
    /**
     * The heading element, by where the heading sits in the page's outline; `span` where a heading
     * already holds it, as a dialog's or a sheet's title does. `h2` for a panel, `span` for a dialog.
     */
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span'
    /** A word before the name in the heading's own face, never the code's: the "Edit" of a dialog's "Edit nightly-export". */
    lead?: ReactNode
    /** A glyph before the name, saying what kind of thing it is. */
    glyph?: ReactNode
    /** Chips after the name (after the code when `inline`), such as a status and tags. */
    chips?: ReactNode
    /** One line under the heading, cut short with the whole of it on hover. */
    description?: ReactNode
    /** How many lines the name may take before it is cut short; one by default. */
    lines?: TitleLines
    className?: string
}

const NAME = { panel: 'text-section-title', dialog: 'font-heading text-detail-title' } as const
const GLYPH = { panel: "[&_svg:not([class*='size-'])]:size-4", dialog: "[&_svg:not([class*='size-'])]:size-5" } as const
const SMALL = { panel: 'text-xs', dialog: 'text-sm' } as const

/**
 * The heading of one thing, as `ItemCard` draws it: its name, or its code when it has none, with
 * the code drawn once in the code face, under the name (`stacked`) or beside it on one line
 * (`inline`). A `glyph` may lead it, `chips` follow the name, and a one-line `description` sits
 * under it. `size` fits it to a panel or to a dialog's head.
 *
 * A name, a code or a description cut short says the whole of it on hover. Inline, the name gives
 * way before the code, which keeps at least half the row. With `as="span"`, the default at
 * `size="dialog"`, every part is a `span`, so the heading is valid inside another heading, such as
 * `DialogShell`'s title.
 */
export function ItemHeading({
    name,
    code: given,
    variant = 'stacked',
    size = 'panel',
    as,
    lead,
    glyph,
    chips,
    description,
    lines = 1,
    className,
}: ItemHeadingProps) {
    const { heading, code, codeIsHeading } = identityOf(name, given)
    const [nameRef, nameClamped] = useClamped<HTMLElement>()
    const [descriptionRef, descriptionClamped] = useClamped<HTMLSpanElement>()
    const Heading = as ?? (size === 'dialog' ? 'span' : 'h2')
    // A span heading may sit inside another heading, so everything around it is a span too.
    const Box = Heading === 'span' ? 'span' : 'div'
    const hasLead = lead !== undefined && lead !== null && lead !== false
    const inline = variant === 'inline'
    // Beside a glyph every line after the first starts where the name starts.
    const after = glyph !== undefined && 'col-start-2'
    const hasChips = chips !== undefined && chips !== null && chips !== false
    // Inline the code keeps to one line, cut short with its whole on hover; stacked it is never cut, wrapping at its own breaks.
    const codeLine = code !== undefined && (
        <span
            title={inline ? code : undefined}
            className={cn(
                'min-w-0 font-mono font-normal text-muted-foreground',
                SMALL[size],
                inline ? 'max-w-[max(50%,100%_-_--spacing(32))] shrink-0 truncate' : 'break-words',
            )}
        >
            {inline ? code : codeBreaks(code)}
        </span>
    )
    const whole = hasLead && typeof lead === 'string' && typeof heading === 'string' ? `${lead} ${heading}` : heading
    return (
        <Box
            className={cn(
                'grid min-w-0 items-center gap-x-2 gap-y-0.5',
                glyph !== undefined && 'grid-cols-[auto_minmax(0,1fr)]',
                className,
            )}
        >
            {glyph !== undefined && (
                <span aria-hidden className={cn('row-start-1 flex shrink-0 items-center text-muted-foreground', GLYPH[size])}>
                    {glyph}
                </span>
            )}
            <Box className={cn('row-start-1 flex min-w-0 gap-2', after, inline ? 'items-baseline' : 'items-center')}>
                <Heading
                    ref={nameRef}
                    title={nameClamped && typeof whole === 'string' ? whole : undefined}
                    className={cn('min-w-0', NAME[size], TITLE_LINES[lines], codeIsHeading && !hasLead && 'font-mono')}
                >
                    {hasLead ? (
                        <>
                            {lead} <span className={cn(codeIsHeading && 'font-mono')}>{heading}</span>
                        </>
                    ) : (
                        heading
                    )}
                </Heading>
                {inline && codeLine}
                {hasChips && <span className="flex shrink-0 items-center gap-1.5 self-center">{chips}</span>}
            </Box>
            {!inline && codeLine !== undefined && codeLine !== false && <Box className={cn('flex min-w-0', after)}>{codeLine}</Box>}
            {description !== undefined && description !== null && (
                <span
                    ref={descriptionRef}
                    title={descriptionClamped && typeof description === 'string' ? description : undefined}
                    className={cn('block truncate font-normal text-muted-foreground', SMALL[size], after)}
                >
                    {description}
                </span>
            )}
        </Box>
    )
}
