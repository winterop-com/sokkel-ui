import { useId, type ComponentProps, type ReactNode } from 'react'

import { cn } from '../lib/cn'

/** One kind of thing an action takes with it: 12 runs, 3 schedules. */
export interface Consequence {
    label: ReactNode
    /** How many go; drawn at the row's right end. */
    count?: number
    /** One line on what that means, under the label. */
    detail?: ReactNode
    icon?: ReactNode
}

export interface ConsequenceListWords {
    /** The heading over things that are lost, with `tone` `critical`. */
    heading: string
    /** The heading over what an action changes, moves or keeps, or the facts of it (room freed, files removed), with `tone` `neutral`. */
    changed: string
}

const WORDS: ConsequenceListWords = { heading: 'Also deleted', changed: 'What this changes' }

/** Other props, `data-*`, `aria-*` and `className` among them, go to the root. */
export interface ConsequenceListProps extends Omit<ComponentProps<'div'>, 'children'> {
    items: readonly Consequence[]
    /** `critical` when they are lost, `neutral` when they are only moved or kept, or are facts. */
    tone?: 'critical' | 'neutral'
    /** The heading for this list alone, such as "Moves to grace"; the words' heading for the `tone` when absent. */
    heading?: ReactNode
    words?: Partial<ConsequenceListWords>
}

/**
 * What goes with the thing an action removes or changes, a row per kind with its count, under a
 * heading that says what happens to them. A `critical` list is headed Also deleted and a
 * `neutral` one What this changes, which also reads right over facts, unless the list has its own
 * `heading`, which labels the list. It sits in a confirm's body, before the verb.
 */
export function ConsequenceList({ items, tone = 'critical', heading, className, words: given, ...props }: ConsequenceListProps) {
    const words = { ...WORDS, ...given }
    const headingId = useId()
    if (items.length === 0) return null
    return (
        <div className={cn('flex flex-col gap-1.5', className)} {...props}>
            <p id={headingId} className={cn('text-xs font-medium', tone === 'critical' ? 'text-critical-ink' : 'text-muted-foreground')}>
                {heading ?? (tone === 'critical' ? words.heading : words.changed)}
            </p>
            <ul
                aria-labelledby={headingId}
                className={cn(
                    'divide-y divide-border overflow-hidden rounded-control border',
                    tone === 'critical' ? 'border-critical/30 bg-critical/4' : 'border-border',
                )}
            >
                {items.map((item, index) => (
                    <li key={index} className="flex items-start gap-2.5 px-3 py-2">
                        {item.icon !== undefined && (
                            <span
                                className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4"
                                aria-hidden
                            >
                                {item.icon}
                            </span>
                        )}
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="text-sm leading-5">{item.label}</span>
                            {item.detail !== undefined && <span className="text-xs text-muted-foreground">{item.detail}</span>}
                        </div>
                        {item.count !== undefined && (
                            <span className="shrink-0 font-mono text-sm leading-5 tabular-nums">{item.count.toLocaleString('en')}</span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}
