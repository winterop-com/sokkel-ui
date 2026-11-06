import { ChevronDown, Hash, Lock, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import type { KindColor } from '../lib/kind'
import { Count } from './Count'
import { PersonAvatar, PresenceDot, type Presence } from './PersonAvatar'
import { SearchField } from './SearchField'

export type { Presence } from './PersonAvatar'

/** One place to talk: a channel, or a conversation with people. */
export interface ChannelEntry {
    id: string
    /** A channel's name without the `#`, or the people a conversation is with. */
    label: string
    kind: 'channel' | 'private' | 'direct'
    /** For `direct`: the person, drawn as a small round avatar of their initials; their name is the label unless given. */
    person?: { name?: string; initials?: string; color?: KindColor; image?: string }
    /** For `direct`: a picture or initials of the app's own, drawn in a small square in place of the avatar from `person`. */
    avatar?: ReactNode
    /** For `direct`: whether the other person is around, a dot at the avatar's corner. */
    presence?: Presence
    /** Has messages not read yet: drawn in the foreground weight. */
    unread?: boolean
    /** Messages that name you or are sent to you only. */
    mentions?: number
    /** Muted: never bold, and drawn faint. */
    muted?: boolean
    href?: string
}

/** A place above the sections, such as threads or saved messages, with a count of what is new there. */
export interface ChannelPlace {
    id: string
    label: string
    icon: ReactNode
    count?: number
}

export interface ChannelSection {
    id: string
    title: string
    /** Drawn before the title, such as a star for the starred; the fold's chevron takes its place while the head is pointed at or the section is folded. */
    icon?: ReactNode
    entries: readonly ChannelEntry[]
    /** Offers an add button at the end of the section, as for a new channel or message. */
    onAdd?: () => void
}

export interface ChannelListWords {
    add: (section: string) => string
    collapse: (section: string) => string
    mentions: (count: number) => string
    presence: Record<Presence, string>
    /** The find field's placeholder and name. */
    find: string
    clear: string
    /** Said when nothing matches what is typed in the find field. */
    nothing: string
}

const WORDS: ChannelListWords = {
    add: (section) => `Add to ${section}`,
    collapse: (section) => `Show or hide ${section}`,
    mentions: (count) => `${String(count)} mention${count === 1 ? '' : 's'}`,
    presence: { active: 'Active', away: 'Away', offline: 'Offline' },
    find: 'Find a conversation',
    clear: 'Clear the search',
    nothing: 'No conversation matches.',
}

const ROW =
    'flex h-(--density-channel-row) w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

/** The open row's wash, with the avatar ring following the ground under it. */
const OPEN = 'bg-accent font-medium text-accent-foreground [--avatar-ring:var(--color-accent)]'
const HOVER = 'hover:bg-secondary hover:[--avatar-ring:var(--color-secondary)]'

/**
 * The places to talk, in sections that fold, each section with an icon of its own: channels with
 * `#` (a lock for a private one), and conversations with a small round picture of the person and a
 * dot for whether they are around. An entry with unread messages is in the foreground weight, one
 * that names you carries a count, a muted one is faint. The open entry is on a subtle wash.
 * `places` come first, above the sections: threads, activity, saved messages.
 *
 * With `find`, a field at the top narrows every section to the entries whose name holds what is
 * typed, folded sections included. A folded section still shows its open entry and those that name
 * you.
 */
export function ChannelList({
    sections,
    places,
    active,
    onSelect,
    title,
    actions,
    header,
    find = false,
    query: heldQuery,
    onQueryChange,
    folded: heldFolded,
    defaultFolded = [],
    onFoldedChange,
    className,
    words: given,
}: {
    sections: readonly ChannelSection[]
    places?: readonly ChannelPlace[]
    active?: string
    onSelect?: (id: string) => void
    /** The workspace's name, or a menu that switches it, in a head the shell's top bar lines up with. */
    title?: ReactNode
    /** Buttons at the end of the head, such as a new message. */
    actions?: ReactNode
    /** What sits above the sections, under the head: anything an app draws of its own. */
    header?: ReactNode
    /** Shows the find field under the header. */
    find?: boolean
    /** What the find field holds, when held from outside with `onQueryChange`. */
    query?: string
    onQueryChange?: (query: string) => void
    /** The ids of the folded sections, when held from outside with `onFoldedChange`. */
    folded?: readonly string[]
    /** The sections folded at first, when the list holds the folds itself. */
    defaultFolded?: readonly string[]
    onFoldedChange?: (folded: string[]) => void
    className?: string
    words?: Partial<ChannelListWords>
}) {
    const words = { ...WORDS, ...given }
    const [ownFolded, setOwnFolded] = useState<readonly string[]>(defaultFolded)
    const [ownQuery, setOwnQuery] = useState('')
    const folds = heldFolded ?? ownFolded
    const query = heldQuery ?? ownQuery
    const needle = query.trim().toLowerCase()
    const setQuery = (next: string) => {
        if (heldQuery === undefined) setOwnQuery(next)
        onQueryChange?.(next)
    }
    const toggle = (id: string) => {
        const next = folds.includes(id) ? folds.filter((other) => other !== id) : [...folds, id]
        if (heldFolded === undefined) setOwnFolded(next)
        onFoldedChange?.(next)
    }
    const shownSections = sections
        .map((section) => {
            const open = !folds.includes(section.id)
            const entries =
                needle !== ''
                    ? section.entries.filter((entry) => entry.label.toLowerCase().includes(needle))
                    : open
                      ? section.entries
                      : section.entries.filter((entry) => entry.id === active || (entry.mentions ?? 0) > 0)
            return { section, open: open || needle !== '', entries }
        })
        .filter(({ entries }) => needle === '' || entries.length > 0)
    return (
        <nav className={cn('flex min-h-0 flex-col bg-sidebar text-sidebar-foreground [--avatar-ring:var(--color-sidebar)]', className)}>
            {(title !== undefined || actions !== undefined) && (
                <div className="flex h-shell-top shrink-0 items-center gap-2 border-b border-border-strong pr-2 pl-3">
                    <div className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</div>
                    {actions !== undefined && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
                </div>
            )}
            {header}
            {find && (
                <div className="shrink-0 px-2 pt-2">
                    <SearchField
                        value={query}
                        onChange={setQuery}
                        placeholder={words.find}
                        shortcut={false}
                        words={{ clear: words.clear }}
                    />
                </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                {needle === '' && places !== undefined && places.length > 0 && (
                    <ul className="mb-2 flex flex-col gap-px border-b border-border pb-2">
                        {places.map((place) => (
                            <li key={place.id}>
                                <button
                                    type="button"
                                    aria-current={place.id === active ? 'page' : undefined}
                                    onClick={() => onSelect?.(place.id)}
                                    className={cn(
                                        ROW,
                                        '[&_svg]:size-4',
                                        place.id === active ? OPEN : cn(HOVER, 'text-muted-foreground hover:text-foreground'),
                                    )}
                                >
                                    <span className="flex size-5 shrink-0 items-center justify-center">{place.icon}</span>
                                    <span className="min-w-0 flex-1 truncate">{place.label}</span>
                                    {(place.count ?? 0) > 0 && <span className="text-xs font-medium tabular-nums">{place.count}</span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {needle !== '' && shownSections.length === 0 && (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">{words.nothing}</p>
                )}
                {shownSections.map(({ section, open, entries }) => (
                    <section key={section.id} className="mb-2">
                        <div className="group/section flex items-center gap-1">
                            <button
                                type="button"
                                aria-expanded={open}
                                aria-label={words.collapse(section.title)}
                                onClick={() => toggle(section.id)}
                                className={cn(ROW, 'min-w-0 flex-1 font-medium text-muted-foreground hover:text-foreground')}
                            >
                                <span className="flex size-5 shrink-0 items-center justify-center [&_svg]:size-4">
                                    {section.icon !== undefined && open && (
                                        <span className="flex group-focus-within/section:hidden group-hover/section:hidden" aria-hidden>
                                            {section.icon}
                                        </span>
                                    )}
                                    <ChevronDown
                                        className={cn(
                                            'shrink-0 transition-transform',
                                            !open && '-rotate-90',
                                            section.icon !== undefined &&
                                                open &&
                                                'hidden group-focus-within/section:block group-hover/section:block',
                                        )}
                                        aria-hidden
                                    />
                                </span>
                                <span className="truncate">{section.title}</span>
                            </button>
                            {section.onAdd !== undefined && (
                                <button
                                    type="button"
                                    aria-label={words.add(section.title)}
                                    title={words.add(section.title)}
                                    onClick={section.onAdd}
                                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none group-hover/section:opacity-100 hover:bg-secondary hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
                                >
                                    <Plus className="size-3.5" aria-hidden />
                                </button>
                            )}
                        </div>
                        <ul className="flex flex-col gap-px">
                            {entries.map((entry) => (
                                <li key={entry.id}>
                                    <Entry entry={entry} active={entry.id === active} onSelect={onSelect} words={words} />
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </nav>
    )
}

function Mark({ entry, words }: { entry: ChannelEntry; words: ChannelListWords }) {
    if (entry.kind === 'private') return <Lock className="size-3.5 shrink-0" aria-hidden />
    if (entry.kind === 'channel') return <Hash className="size-3.5 shrink-0" aria-hidden />
    if (entry.avatar === undefined)
        return (
            <PersonAvatar
                name={entry.person?.name ?? entry.label}
                initials={entry.person?.initials}
                color={entry.person?.color}
                image={entry.person?.image}
                size="xs"
                presence={entry.presence}
                words={{ presence: words.presence }}
            />
        )
    return (
        <span className="relative flex size-5 shrink-0 items-center justify-center">
            <span className="flex size-5 items-center justify-center overflow-hidden rounded-md bg-muted text-2xs font-medium">
                {entry.avatar}
            </span>
            {entry.presence !== undefined && (
                <PresenceDot presence={entry.presence} label={words.presence[entry.presence]} className="absolute -right-0.5 -bottom-0.5" />
            )}
        </span>
    )
}

function Entry({
    entry,
    active,
    onSelect,
    words,
}: {
    entry: ChannelEntry
    active: boolean
    onSelect?: (id: string) => void
    words: ChannelListWords
}) {
    const muted = entry.muted === true
    const loud = entry.unread === true && !muted
    const body = (
        <>
            <span className="flex size-5 shrink-0 items-center justify-center">
                <Mark entry={entry} words={words} />
            </span>
            <span className="min-w-0 flex-1 truncate">{entry.label}</span>
            {(entry.mentions ?? 0) > 0 && <Count value={entry.mentions ?? 0} label={words.mentions(entry.mentions ?? 0)} />}
        </>
    )
    const className = cn(
        ROW,
        active ? OPEN : HOVER,
        !active && (muted ? 'text-faint/70' : loud ? 'font-semibold text-foreground' : 'text-muted-foreground'),
    )
    if (entry.href !== undefined)
        return (
            <a href={entry.href} aria-current={active ? 'page' : undefined} className={className} onClick={() => onSelect?.(entry.id)}>
                {body}
            </a>
        )
    return (
        <button type="button" aria-current={active ? 'page' : undefined} className={className} onClick={() => onSelect?.(entry.id)}>
            {body}
        </button>
    )
}
