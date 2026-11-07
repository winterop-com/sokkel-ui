import { IconButton } from './IconButton'
import { ChevronDown, Hash, Lock, Users } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ChatFace, type ChatPerson } from './ChatMessage'
import { PersonAvatar, PresenceDot, type Presence } from './PersonAvatar'
import { Button } from './ui/button'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'

/** An icon button at the end of the header: pinned messages, search, more. */
export interface ChannelHeaderAction {
    id: string
    label: string
    icon: ReactNode
    onClick?: () => void
    /** Drawn pressed, as while the panel it opens is showing. */
    pressed?: boolean
}

/** A view of the conversation, as a tab under the header: messages, files, pins. */
export interface ChannelHeaderTab {
    id: string
    label: string
    icon?: ReactNode
}

export interface ChannelHeaderWords {
    channel: string
    private: string
    /** Said for the member button: `12 members`. */
    members: (count: number) => string
    /** Said for the name when it opens the details. */
    details: (name: string) => string
    presence: Record<Presence, string>
    tabs: string
}

const WORDS: ChannelHeaderWords = {
    channel: 'Channel',
    private: 'Private channel',
    members: (count) => `${String(count)} ${count === 1 ? 'member' : 'members'}`,
    details: (name) => `Details for ${name}`,
    presence: { active: 'Active', away: 'Away', offline: 'Offline' },
    tabs: 'Views',
}

/**
 * The head of a conversation, as a team chat draws it: `#` (a lock when `private`) and the
 * channel's name, its topic muted after it, then the members as a stack of faces with their count
 * and the header's icon actions. A direct conversation (`kind="direct"`) shows the person's
 * picture and whether they are around instead of the `#`. The name keeps its width; the topic
 * gives way first and hides when the header is narrow. `tabs` adds a row of views under it.
 */
export function ChannelHeader({
    name,
    topic,
    kind = 'channel',
    private: locked = false,
    avatar,
    presence,
    onDetails,
    members,
    memberCount,
    onMembers,
    actions,
    tabs,
    tab,
    onTabChange,
    children,
    className,
    words: given,
}: {
    /** The channel's name without the `#`, or the person's name. */
    name: string
    topic?: ReactNode
    kind?: 'channel' | 'direct'
    /** A channel only its members see, marked with a lock. */
    private?: boolean
    /** For `direct`: the person's picture; their initials on their color when none is given. */
    avatar?: ReactNode
    /** For `direct`: whether the person is around. */
    presence?: Presence
    /** Makes the name a button that opens the channel's or person's details. */
    onDetails?: () => void
    /** Some of the members, as pictures or as people; the first three are shown. */
    members?: readonly (ReactNode | ChatPerson)[]
    /** How many members there are, beside their faces. */
    memberCount?: number
    onMembers?: () => void
    actions?: readonly ChannelHeaderAction[]
    tabs?: readonly ChannelHeaderTab[]
    /** The tab showing; the first one when not given. */
    tab?: string
    onTabChange?: (id: string) => void
    /** More actions at the end, after `actions`: a menu, a call button. */
    children?: ReactNode
    className?: string
    words?: Partial<ChannelHeaderWords>
}) {
    const words = { ...WORDS, ...given }
    const mark =
        kind === 'direct' ? (
            avatar === undefined ? (
                <PersonAvatar name={name} size="sm" shape="square" presence={presence} words={{ presence: words.presence }} />
            ) : (
                <span className="relative flex size-6 shrink-0">
                    <span className="flex size-6 items-center justify-center overflow-hidden rounded-md bg-muted text-2xs font-semibold">
                        {avatar}
                    </span>
                    {presence !== undefined && (
                        <PresenceDot presence={presence} label={words.presence[presence]} className="absolute -right-0.5 -bottom-0.5" />
                    )}
                </span>
            )
        ) : locked ? (
            <Lock className="size-4 shrink-0 text-muted-foreground" aria-label={words.private} role="img" />
        ) : (
            <Hash className="size-4 shrink-0 text-muted-foreground" aria-label={words.channel} role="img" />
        )
    const title = (
        <>
            {mark}
            <span className="min-w-0 truncate">{name}</span>
            {onDetails !== undefined && <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
        </>
    )
    const shown = members?.slice(0, 3) ?? []
    return (
        <header className={cn('@container shrink-0 border-b border-border bg-background', className)}>
            <div className="flex h-shell-top min-w-0 items-center gap-3 px-(--density-chat-inset)">
                <h1 className="flex min-w-0 shrink items-center text-title font-semibold">
                    {onDetails !== undefined ? (
                        <button
                            type="button"
                            aria-label={words.details(name)}
                            onClick={onDetails}
                            className="-ml-1.5 flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 outline-none hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
                        >
                            {title}
                        </button>
                    ) : (
                        <span className="flex min-w-0 items-center gap-1.5">{title}</span>
                    )}
                </h1>
                {topic !== undefined && (
                    <p className="hidden min-w-0 flex-1 basis-0 truncate text-sm text-muted-foreground @xl:block">{topic}</p>
                )}
                <div className="ml-auto flex shrink-0 items-center gap-1">
                    {(shown.length > 0 || memberCount !== undefined) && (
                        <Button
                            variant="outline"
                            size="sm"
                            aria-label={memberCount === undefined ? undefined : words.members(memberCount)}
                            onClick={onMembers}
                            className="mr-1 gap-1.5 px-1.5"
                        >
                            <Users className={cn('size-3.5', shown.length > 0 && '@md:hidden')} aria-hidden />
                            {shown.length > 0 && (
                                <span className="hidden -space-x-1 @md:flex">
                                    {shown.map((who, index) => (
                                        <span
                                            key={index}
                                            className="flex size-5 items-center justify-center overflow-hidden rounded-md bg-muted text-2xs font-semibold ring-2 ring-background"
                                        >
                                            <ChatFace who={who} className="text-2xs font-semibold" />
                                        </span>
                                    ))}
                                </span>
                            )}
                            {memberCount !== undefined && <span className="tabular-nums">{memberCount}</span>}
                        </Button>
                    )}
                    {actions?.map((action) => (
                        <IconButton key={action.id} label={action.label} pressed={action.pressed} onClick={action.onClick}>
                            {action.icon}
                        </IconButton>
                    ))}
                    {children}
                </div>
            </div>
            {tabs !== undefined && tabs.length > 0 && (
                <Tabs
                    {...(tab === undefined ? { defaultValue: tabs[0].id } : { value: tab })}
                    onValueChange={(value: string) => onTabChange?.(value)}
                >
                    <TabsList
                        variant="line"
                        aria-label={words.tabs}
                        className="h-9 max-w-full overflow-x-auto overflow-y-hidden px-(--density-chat-inset)"
                    >
                        {tabs.map((entry) => (
                            <TabsTrigger
                                key={entry.id}
                                value={entry.id}
                                className="flex-none px-2 text-sm group-data-horizontal/tabs:after:-bottom-1"
                            >
                                {entry.icon}
                                {entry.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            )}
        </header>
    )
}
