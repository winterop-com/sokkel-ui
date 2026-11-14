import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Fragment, useContext, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { shortcutLabel } from '../lib/keys'
import { Link } from './Link'
import { ShellPalette, ShellTrail } from './shell-context'
import { Kbd } from './ui/kbd'

/** One step of the trail to the current screen. */
export interface Crumb {
    label: string
    href?: string
    /** Drawn in the code face, as an addressable code is. */
    code?: boolean
}

/** What the trail's last crumb is: the current screen, or the last screen above it. */
export type TrailEnd = 'current' | 'ancestor'

export interface TopBarProps {
    /**
     * The trail to the current screen. In `Shell`'s `top`, a trail a screen states with
     * `useShellTrail` is drawn in its place while that screen is mounted.
     */
    trail?: readonly Crumb[]
    /**
     * `current` (the default): the last crumb is the current screen, plain words marked as the page,
     * and on a phone it is the only crumb shown. `ancestor`: the trail holds only the screens above
     * the current one, whose own heading names it, so every crumb with an `href` is a link, a chevron
     * follows the last, and on a phone the last crumb alone is shown as the way back, after a chevron
     * pointing back.
     */
    trailEnds?: TrailEnd
    /** The app's mark before the trail, for a screen without the rail that carries it. */
    mark?: ReactNode
    /**
     * Opens the command palette from the button at the bar's end; in a `Shell` with a `palette` the
     * button opens the shell's. No button is drawn without either.
     */
    onSearch?: () => void
    /**
     * Whether the palette's button is drawn (the default). `false` leaves it out even in a `Shell`
     * with a `palette`, as for a top bar drawn as a specimen inside a page that has its own.
     */
    palette?: boolean
    /**
     * A search field drawn at the bar's start, before the trail, such as `SearchField` or `Search`
     * with its results under it, which `/` focuses. The palette's button stays at the bar's end;
     * on a phone, where that button is an icon, the field gives way to it.
     */
    search?: ReactNode
    /**
     * The keys that open the palette, shown in its button. Shown only when bound: given here by an
     * app that binds them itself, or as `shortcutLabel('k')` (⌘K on a Mac, Ctrl K elsewhere) in a
     * `Shell` that holds the palette.
     */
    shortcut?: string
    actions?: ReactNode
    words?: Partial<TopBarWords>
}

/** The words a top bar says. */
export interface TopBarWords {
    /** The palette's button, where no search field stands beside it. */
    search: string
    /** The palette's button beside a search field. */
    palette: string
    trail: string
}

/** A crumb that leads back up: quiet until the pointer is over it, and the button's own focus look on keyboard focus. */
const CRUMB_LINK =
    'rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid'

/** The top bar's own words in English; a bar with words of its own starts from these. */
export const TOP_BAR_WORDS: TopBarWords = { search: 'Search', palette: 'Open the command palette', trail: 'Where you are' }

/**
 * What the shell's top bar holds: a search field and the trail to the current screen at the left,
 * the button that opens the command palette and the screen's actions at the right. The field
 * stands first, so it stays in one place from screen to screen. On a phone the trail keeps only
 * its last step and the palette's button becomes an icon, a finger's size. With `trailEnds="ancestor"` the trail
 * holds only the screens above the current one, every crumb a link, and on a phone its last crumb
 * is the way back. `mark` puts the app's mark before the
 * rest where no rail shows it; `AppBar` is the bar itself for a screen drawn without `Shell`. As
 * `Shell`'s `top`, it draws the trail a mounted screen states with `useShellTrail` in place of its own,
 * keeping its search, palette button and actions.
 */
export function TopBar({
    trail: ownTrail = [],
    trailEnds: ownEnds = 'current',
    mark,
    onSearch,
    palette = true,
    search: field,
    shortcut: shortcutGiven,
    actions,
    words: given,
}: TopBarProps) {
    const words = { ...TOP_BAR_WORDS, ...given }
    const stated = useContext(ShellTrail)
    const trail = stated?.trail ?? ownTrail
    const trailEnds = stated === undefined ? ownEnds : (stated.ends ?? 'current')
    const shellPalette = useContext(ShellPalette)
    const search = palette ? (onSearch ?? shellPalette) : undefined
    const shortcut = shortcutGiven ?? (shellPalette === undefined ? undefined : shortcutLabel('k'))
    return (
        <div className="flex h-full min-w-0 flex-1 items-center gap-3">
            {mark !== undefined && (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    {mark}
                </span>
            )}
            {field !== undefined && (
                <div className={cn('w-56 max-w-80 min-w-0 shrink lg:w-64', search !== undefined && 'max-md:hidden')}>{field}</div>
            )}
            {trail.length > 0 && (
                <nav aria-label={words.trail} className="min-w-0 flex-1">
                    <ol className="flex min-w-0 items-center gap-1 text-sm">
                        {trail.map((crumb, index) => {
                            const last = index === trail.length - 1
                            const current = last && trailEnds === 'current'
                            const face = cn('truncate', crumb.code === true && 'font-mono')
                            return (
                                <Fragment key={`${crumb.label}-${index}`}>
                                    <li className={cn('flex min-w-0 items-center', !last && 'max-md:hidden')}>
                                        {last && trailEnds === 'ancestor' && crumb.href !== undefined && (
                                            <ChevronLeft aria-hidden className="mr-0.5 size-4 shrink-0 text-faint md:hidden" />
                                        )}
                                        {current || crumb.href === undefined ? (
                                            <span
                                                aria-current={current ? 'page' : undefined}
                                                className={cn(face, current ? 'font-medium' : 'text-muted-foreground')}
                                            >
                                                {crumb.label}
                                            </span>
                                        ) : (
                                            <Link href={crumb.href} className={cn(face, CRUMB_LINK)}>
                                                {crumb.label}
                                            </Link>
                                        )}
                                    </li>
                                    {!current && (
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
            {search !== undefined && (
                <button
                    type="button"
                    onClick={search}
                    aria-label={field === undefined ? words.search : words.palette}
                    title={field === undefined ? undefined : words.palette}
                    className={cn(
                        'flex h-(--density-control) shrink-0 items-center gap-2 rounded-control border border-border bg-field px-2.5 text-sm text-muted-foreground outline-none hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid max-md:size-finger max-md:justify-center max-md:border-transparent max-md:bg-transparent max-md:px-0',
                        field === undefined ? 'md:w-56' : 'md:px-2',
                    )}
                >
                    <Search className={cn('size-4 shrink-0', field !== undefined && shortcut !== undefined && 'md:hidden')} aria-hidden />
                    {field === undefined && <span className="flex-1 text-left max-md:hidden">{words.search}</span>}
                    {shortcut !== undefined &&
                        (field === undefined ? (
                            <Kbd className="max-md:hidden">{shortcut}</Kbd>
                        ) : (
                            <kbd className="font-mono text-xs max-md:hidden">{shortcut}</kbd>
                        ))}
                </button>
            )}
            {actions !== undefined && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
    )
}
