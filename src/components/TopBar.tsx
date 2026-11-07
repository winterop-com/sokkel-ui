import { ChevronRight, Search } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Kbd } from './ui/kbd'

/** One step of the trail to the current screen. */
export interface Crumb {
    label: string
    href?: string
    /** Drawn in the code face, as an addressable code is. */
    code?: boolean
}

export interface TopBarProps {
    trail?: readonly Crumb[]
    /** The app's mark before the trail, for a screen without the rail that carries it. */
    mark?: ReactNode
    /** Opens the command palette; no search is drawn without it. */
    onSearch?: () => void
    /** The keys that open the palette, shown in the search. */
    shortcut?: string
    actions?: ReactNode
    renderLink?: (crumb: Crumb, className: string) => ReactNode
    words?: { search: string; trail: string }
}

/**
 * What the shell's top bar holds: the trail to the current screen at the left, the search that
 * opens the command palette, and the screen's actions at the right. On a phone the trail keeps
 * only its last step and the search becomes an icon. `mark` puts the app's mark before the trail
 * where no rail shows it; `AppBar` is the bar itself for a screen drawn without `Shell`.
 */
export function TopBar({
    trail = [],
    mark,
    onSearch,
    shortcut = '⌘K',
    actions,
    renderLink = (crumb, className) => (
        <a href={crumb.href} className={className}>
            {crumb.label}
        </a>
    ),
    words = { search: 'Search', trail: 'Where you are' },
}: TopBarProps) {
    return (
        <div className="flex h-full min-w-0 flex-1 items-center gap-3">
            {mark !== undefined && (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    {mark}
                </span>
            )}
            {trail.length > 0 && (
                <nav aria-label={words.trail} className="min-w-0 flex-1">
                    <ol className="flex min-w-0 items-center gap-1 text-sm">
                        {trail.map((crumb, index) => {
                            const last = index === trail.length - 1
                            const face = cn('truncate', crumb.code === true && 'font-mono')
                            return (
                                <Fragment key={`${crumb.label}-${index}`}>
                                    <li className={cn('flex min-w-0', !last && 'max-md:hidden')}>
                                        {last || crumb.href === undefined ? (
                                            <span
                                                aria-current={last ? 'page' : undefined}
                                                className={cn(face, last ? 'font-medium' : 'text-muted-foreground')}
                                            >
                                                {crumb.label}
                                            </span>
                                        ) : (
                                            renderLink(crumb, cn(face, 'text-muted-foreground hover:text-foreground'))
                                        )}
                                    </li>
                                    {!last && (
                                        <li aria-hidden className="hidden text-faint md:flex">
                                            <ChevronRight className="size-3.5" />
                                        </li>
                                    )}
                                </Fragment>
                            )
                        })}
                    </ol>
                </nav>
            )}
            {trail.length === 0 && <div className="flex-1" />}
            {onSearch !== undefined && (
                <button
                    type="button"
                    onClick={onSearch}
                    aria-label={words.search}
                    className="flex h-8 shrink-0 items-center gap-2 rounded-control border border-border bg-field px-2.5 text-sm text-muted-foreground outline-none hover:border-border-strong hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring max-md:size-8 max-md:justify-center max-md:border-transparent max-md:bg-transparent max-md:px-0 md:w-56"
                >
                    <Search className="size-4 shrink-0" aria-hidden />
                    <span className="flex-1 text-left max-md:hidden">{words.search}</span>
                    <Kbd className="max-md:hidden">{shortcut}</Kbd>
                </button>
            )}
            {actions !== undefined && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
    )
}
