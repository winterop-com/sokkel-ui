import { ChevronDown, Hash, Lock, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'

/** Whether a person is around: here, away, or not signed in. */
export type Presence = 'active' | 'away' | 'offline'

/** One place to talk: a channel, or a conversation with people. */
export interface ChannelEntry {
    id: string
    /** A channel's name without the `#`, or the people a conversation is with. */
    label: string
    kind: 'channel' | 'private' | 'direct'
    /** For `direct`: the other person's initials or picture, and whether they are around. */
    avatar?: ReactNode
    presence?: Presence
    /** Has messages not read yet. */
    unread?: boolean
    /** Messages that name you or are sent to you only. */
    mentions?: number
    /** Muted: never bold, and drawn quieter. */
    muted?: boolean
    href?: string
}

export interface ChannelSection {
    id: string
    title: string
    entries: readonly ChannelEntry[]
    /** Offers an add button at the end of the section, as for a new channel or message. */
    onAdd?: () => void
}

export interface ChannelListWords {
    add: (section: string) => string
    collapse: (section: string) => string
    mentions: (count: number) => string
    presence: Record<Presence, string>
}

const WORDS: ChannelListWords = {
    add: (section) => `Add to ${section}`,
    collapse: (section) => `Show or hide ${section}`,
    mentions: (count) => `${String(count)} mention${count === 1 ? '' : 's'}`,
    presence: { active: 'Active', away: 'Away', offline: 'Offline' },
}

const DOT: Record<Presence, string> = {
    active: 'bg-good',
    away: 'border-2 border-muted-foreground bg-transparent',
    offline: 'border-2 border-faint bg-transparent',
}

/**
 * The places to talk, in sections that fold: channels with `#` (a lock for a private one), and
 * conversations with a person's picture and whether they are around. An entry with unread messages
 * is bold, one that names you carries a count, a muted one is quieter. The chosen entry is filled.
 */
export function ChannelList({
    sections,
    active,
    onSelect,
    header,
    className,
    words: given,
}: {
    sections: readonly ChannelSection[]
    active?: string
    onSelect?: (id: string) => void
    /** What sits above the sections: the workspace name, a new-message button. */
    header?: ReactNode
    className?: string
    words?: Partial<ChannelListWords>
}) {
    const words = { ...WORDS, ...given }
    const [folded, setFolded] = useState<ReadonlySet<string>>(new Set())
    return (
        <nav className={cn('flex min-h-0 flex-col bg-sidebar text-sidebar-foreground', className)}>
            {header}
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                {sections.map((section) => {
                    const open = !folded.has(section.id)
                    const shown = open
                        ? section.entries
                        : section.entries.filter((entry) => entry.id === active || (entry.mentions ?? 0) > 0)
                    return (
                        <section key={section.id} className="mb-3">
                            <div className="group/section flex h-7 items-center gap-1 px-1">
                                <button
                                    type="button"
                                    aria-expanded={open}
                                    aria-label={words.collapse(section.title)}
                                    onClick={() => {
                                        const next = new Set(folded)
                                        if (open) next.add(section.id)
                                        else next.delete(section.id)
                                        setFolded(next)
                                    }}
                                    className="flex min-w-0 flex-1 items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                                >
                                    <ChevronDown
                                        className={cn('size-3.5 shrink-0 transition-transform', !open && '-rotate-90')}
                                        aria-hidden
                                    />
                                    <span className="truncate">{section.title}</span>
                                </button>
                                {section.onAdd !== undefined && (
                                    <button
                                        type="button"
                                        aria-label={words.add(section.title)}
                                        title={words.add(section.title)}
                                        onClick={section.onAdd}
                                        className="flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none group-hover/section:opacity-100 hover:bg-secondary hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
                                    >
                                        <Plus className="size-3.5" aria-hidden />
                                    </button>
                                )}
                            </div>
                            <ul className="flex flex-col gap-px">
                                {shown.map((entry) => (
                                    <li key={entry.id}>
                                        <Entry entry={entry} active={entry.id === active} onSelect={onSelect} words={words} />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )
                })}
            </div>
        </nav>
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
    const loud = entry.unread === true && entry.muted !== true
    const mark =
        entry.kind === 'direct' ? (
            <span className="relative flex size-5 shrink-0 items-center justify-center">
                <span className="flex size-5 items-center justify-center overflow-hidden rounded-md bg-muted text-[10px] font-medium">
                    {entry.avatar}
                </span>
                {entry.presence !== undefined && (
                    <span
                        role="img"
                        aria-label={words.presence[entry.presence]}
                        className={cn('absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-sidebar', DOT[entry.presence])}
                    />
                )}
            </span>
        ) : entry.kind === 'private' ? (
            <Lock className="size-3.5 shrink-0" aria-hidden />
        ) : (
            <Hash className="size-3.5 shrink-0" aria-hidden />
        )
    const body = (
        <>
            <span className={cn('flex size-5 shrink-0 items-center justify-center', !active && 'text-muted-foreground')}>{mark}</span>
            <span className={cn('min-w-0 flex-1 truncate', loud && 'font-semibold text-foreground')}>{entry.label}</span>
            {(entry.mentions ?? 0) > 0 && (
                <span
                    aria-label={words.mentions(entry.mentions ?? 0)}
                    className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-critical px-1 text-[11px] leading-none font-semibold text-white tabular-nums"
                >
                    {entry.mentions}
                </span>
            )}
        </>
    )
    const className = cn(
        'flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        active ? 'bg-primary text-primary-foreground [&_*]:text-primary-foreground' : 'hover:bg-secondary',
        !active && entry.muted === true && 'opacity-60',
        !active && !loud && 'text-muted-foreground',
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
