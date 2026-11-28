import { SmilePlus } from 'lucide-react'
import { useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { POPUP } from '../lib/popup'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import {
    EmojiPickerPopover,
    loadEmojiData,
    type EmojiPickerPopoverProps,
    type EmojiPickerProps,
    type EmojiPickerWords,
} from './EmojiPicker'
import { Popover, PopoverContent, PopoverTrigger, type PopoverContentProps } from './ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { writeCount } from '../lib/numbers'

/** A reaction to a message: what it is, how many gave it, and whether you are one of them. */
export interface ChatReaction {
    id: string
    /** An emoji, or an icon. */
    icon: ReactNode
    /** What the reaction means, said on hover and to a screen reader. */
    label: string
    count: number
    mine?: boolean
}

/** A quick reaction: the emoji and its name, said on hover and to a screen reader. */
export interface QuickReaction {
    emoji: string
    name: string
}

/** The quick reactions a bar offers unless the app gives its own. */
export const QUICK_REACTIONS: readonly QuickReaction[] = [
    { emoji: '❤️', name: 'red heart' },
    { emoji: '\u{1F44D}', name: 'thumbs up' },
    { emoji: '\u{1F389}', name: 'party popper' },
    { emoji: '\u{1F44F}', name: 'clapping hands' },
    { emoji: '\u{1F602}', name: 'face with tears of joy' },
    { emoji: '\u{1F62E}', name: 'face with open mouth' },
    { emoji: '\u{1F622}', name: 'crying face' },
    { emoji: '\u{1F914}', name: 'thinking face' },
    { emoji: '\u{1F44E}', name: 'thumbs down' },
]

/**
 * Adds your reaction `emoji` to a message's reactions, or takes it back when it is already yours:
 * the count moves by one, a reaction no one gives any more is dropped, and a new one is added at
 * the end under the emoji as its id.
 */
export function toggleReaction<R extends ChatReaction>(reactions: readonly R[], emoji: string, name: string = emoji): (R | ChatReaction)[] {
    const at = reactions.findIndex((reaction) => reaction.id === emoji || reaction.icon === emoji)
    if (at < 0) return [...reactions, { id: emoji, icon: emoji, label: name, count: 1, mine: true }]
    const reaction = reactions[at]
    const mine = reaction.mine !== true
    const count = reaction.count + (mine ? 1 : -1)
    if (count <= 0) return reactions.filter((_, index) => index !== at)
    return reactions.map((item, index) => (index === at ? { ...item, count, mine } : item))
}

/** The words a reaction bar says. */
export interface ReactionBarWords {
    /** The bar's name. */
    label: string
    /** The more button's name, which opens the full list. */
    more: string
    /** The full list's words. */
    picker: Partial<EmojiPickerWords>
}

export const REACTION_BAR_WORDS: ReactionBarWords = {
    label: 'Reactions',
    more: 'More reactions',
    picker: {},
}

/** Where a catalog holds a reaction bar's words; its full list's are the emoji picker's own. */
export const REACTION_BAR_PART: WordsPart<ReactionBarWords> = { id: 'reactionBar', words: REACTION_BAR_WORDS }

/** The options the bar hands its full emoji list. */
export type ReactionPickerOptions = Omit<EmojiPickerProps, 'onPick' | 'onClose' | 'className' | 'autoFocus' | 'words'>

const QUICK_NAMES = new Map(QUICK_REACTIONS.map((reaction) => [reaction.emoji, reaction.name]))

const quick = (reaction: string | QuickReaction): QuickReaction =>
    typeof reaction === 'string' ? { emoji: reaction, name: QUICK_NAMES.get(reaction) ?? reaction } : reaction

export interface ReactionBarProps {
    /** Called with the emoji given, from the row or from the full list, and its English name. */
    onReact: (emoji: string, name: string) => void
    /** The quick reactions, as emoji or with their names; `QUICK_REACTIONS` by default. */
    reactions?: readonly (string | QuickReaction)[]
    /** The emoji the person has already given, drawn pressed. */
    selected?: readonly string[]
    /** Offers the more button at the end, which opens the full list of emoji. */
    more?: boolean
    /** Whether the full list is open, when the app holds it. */
    moreOpen?: boolean
    defaultMoreOpen?: boolean
    onMoreOpenChange?: (open: boolean) => void
    /** The full list's options: its recent emoji, skin tone and where it keeps them. */
    picker?: ReactionPickerOptions
    /** The full list's popover: how far it stands from the bar and its corners, for a bar inside a surface of its own. */
    pickerPopup?: Pick<EmojiPickerPopoverProps, 'sideOffset' | 'className'>
    /** `sm` for a bar in a message's hover bar or a tight toolbar. */
    size?: 'sm' | 'md'
    /** Draws the bar on a popup's ground, edge and shadow, to float over a video or a message; off inside a popover or a toolbar of its own. */
    framed?: boolean
    className?: string
    words?: Partial<ReactionBarWords>
}

/**
 * A row of quick reactions as round buttons with the emoji large, and a more button at its end
 * that opens the full `EmojiPicker` in a popover; either way the emoji goes to `onReact`. The ones
 * the person already gave (`selected`) are drawn pressed. It floats over a video or a message on a
 * popup's ground (`framed`), or sits in a toolbar or popover without it; in a narrow room the
 * reactions scroll sideways inside the bar while the more button stays at its end. The arrow keys
 * move between its buttons.
 */
export function ReactionBar({
    onReact,
    reactions = QUICK_REACTIONS,
    selected = [],
    more = true,
    moreOpen,
    defaultMoreOpen,
    onMoreOpenChange,
    picker,
    pickerPopup,
    size = 'md',
    framed = true,
    className,
    words: given,
}: ReactionBarProps) {
    const words = useWords(REACTION_BAR_PART, given)
    const button = cn(
        'flex shrink-0 items-center justify-center rounded-full font-emoji outline-none hover:bg-hover focus-visible:outline-focus focus-visible:outline-offset-focus-inset focus-visible:outline-ring focus-visible:outline-solid aria-pressed:bg-primary/12 aria-pressed:ring-1 aria-pressed:ring-primary/60',
        size === 'md' ? 'size-9 text-emoji' : 'size-7 text-base',
    )
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
        if (step === 0) return
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-reaction]')]
        const at = buttons.indexOf(event.target as HTMLButtonElement)
        if (at < 0) return
        event.preventDefault()
        // Like every list of choices, the row stops at its first and last button.
        buttons[Math.min(Math.max(at + step, 0), buttons.length - 1)]?.focus()
    }
    return (
        <div
            role="toolbar"
            aria-label={words.label}
            data-slot="reaction-bar"
            onKeyDown={onKeyDown}
            className={cn('flex max-w-full min-w-0 items-center gap-0.5', framed && cn(POPUP, 'p-1'), className)}
        >
            <div className="flex min-w-0 [scrollbar-width:none] items-center gap-0.5 overflow-x-auto">
                {reactions.map((reaction) => {
                    const { emoji, name } = quick(reaction)
                    return (
                        <button
                            key={emoji}
                            type="button"
                            data-reaction
                            aria-label={name}
                            title={name}
                            aria-pressed={selected.includes(emoji)}
                            onClick={() => onReact(emoji, name)}
                            className={button}
                        >
                            {emoji}
                        </button>
                    )
                })}
            </div>
            {more && (
                <EmojiPickerPopover
                    {...picker}
                    open={moreOpen}
                    defaultOpen={defaultMoreOpen}
                    onOpenChange={onMoreOpenChange}
                    side="top"
                    align="end"
                    {...pickerPopup}
                    words={words.picker}
                    onPick={onReact}
                    trigger={
                        <button
                            type="button"
                            data-reaction
                            aria-label={words.more}
                            title={words.more}
                            className={cn(button, 'text-muted-foreground hover:text-foreground data-popup-open:bg-hover [&_svg]:size-5')}
                        >
                            <SmilePlus aria-hidden />
                        </button>
                    }
                />
            )}
        </div>
    )
}

export interface ReactionPopoverProps extends Omit<ReactionBarProps, 'framed' | 'className'> {
    /** The button that opens the bar; leave it out to open the bar at `anchor` from outside. */
    trigger?: ReactElement
    /** What the bar opens beside, when it is not the trigger. */
    anchor?: PopoverContentProps['anchor']
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    side?: PopoverContentProps['side']
    align?: PopoverContentProps['align']
}

/**
 * The reaction bar in a popover, as a message's react button opens it: a quick reaction or one
 * picked from the full list goes to `onReact` and closes it.
 */
export function ReactionPopover({
    trigger,
    anchor,
    open,
    defaultOpen = false,
    onOpenChange,
    side = 'top',
    align = 'end',
    onReact,
    words,
    ...bar
}: ReactionPopoverProps) {
    const [own, setOwn] = useState(defaultOpen)
    const shown = open ?? own
    const setOpen = (next: boolean) => {
        if (open === undefined) setOwn(next)
        onOpenChange?.(next)
    }
    const preload = () => void loadEmojiData().catch(() => undefined)
    const label = useWords(REACTION_BAR_PART).label
    return (
        <Popover open={shown} onOpenChange={setOpen}>
            {trigger !== undefined && <PopoverTrigger render={trigger} onPointerEnter={preload} onFocus={preload} />}
            <PopoverContent
                anchor={anchor}
                side={side}
                align={align}
                collisionPadding={8}
                aria-label={words?.label ?? label}
                className="w-auto max-w-[calc(100vw-1rem)] gap-0 p-1"
            >
                <ReactionBar
                    {...bar}
                    words={words}
                    framed={false}
                    onReact={(emoji, name) => {
                        onReact(emoji, name)
                        setOpen(false)
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}

/** The words a row of reactions says. */
export interface ReactionChipsWords {
    /** The add-reaction button's name. */
    react: string
    /** A reaction's name with its count. */
    count: (label: string, count: number) => string
}

export const REACTION_CHIPS_WORDS: ReactionChipsWords = {
    react: 'Add a reaction',
    count: (label, count) => `${label}, ${writeCount(count)}`,
}

/** Where a catalog holds the words of a row of reactions, and the arguments its phrases name. */
export const REACTION_CHIPS_PART: WordsPart<ReactionChipsWords> = {
    id: 'reactionChips',
    words: REACTION_CHIPS_WORDS,
    args: { count: 'label count' },
}

/** A row of reactions' phrases as ICU messages in English, for the catalog. */
export const REACTION_CHIPS_MESSAGES: WordMessages<ReactionChipsWords> = { count: '{label}, {count}' }

export interface ReactionChipsProps {
    reactions: readonly ChatReaction[]
    /** Called with a reaction's id when it is pressed, to add or take back yours. */
    onReact?: (id: string) => void
    /** Offers the add-reaction button, which opens the reaction bar and its full list; called with the emoji given. */
    onReaction?: (emoji: string, name: string) => void
    /** Offers the add-reaction button, which the app answers itself; `onReaction` opens the bar instead. */
    onAddReaction?: () => void
    /** The reaction bar's options: its quick reactions, words and full list. */
    bar?: Omit<ReactionBarProps, 'onReact' | 'selected' | 'framed' | 'className'>
    className?: string
    words?: Partial<ReactionChipsWords>
}

/** The emoji a person gave, from reactions whose id or icon is one. */
export function mineOf(reactions: readonly ChatReaction[]): string[] {
    return reactions
        .filter((reaction) => reaction.mine === true)
        .map((reaction) => (typeof reaction.icon === 'string' ? reaction.icon : reaction.id))
}

/**
 * The reactions under a message or a comment: each emoji with how many gave it, yours marked, a
 * press adding or taking back yours; and a button at the end that opens the reaction bar
 * (`onReaction`) or asks the app (`onAddReaction`). Nothing is drawn while there are no reactions
 * and no way to add one.
 */
export function ReactionChips({ reactions, onReact, onReaction, onAddReaction, bar, className, words: given }: ReactionChipsProps) {
    const words = useWords(REACTION_CHIPS_PART, given)
    const canAdd = onReaction !== undefined || onAddReaction !== undefined
    if (reactions.length === 0 && !canAdd) return null
    const add = (
        <button
            type="button"
            aria-label={words.react}
            onClick={onReaction === undefined ? onAddReaction : undefined}
            className="flex h-6 items-center rounded-control border border-transparent bg-muted px-1.5 text-muted-foreground outline-none hover:border-border-strong hover:text-foreground focus-visible:ring-focus focus-visible:ring-ring/50 data-popup-open:border-border-strong"
        />
    )
    return (
        <div data-slot="reaction-chips" className={cn('flex flex-wrap items-center gap-1', className)}>
            {reactions.map((reaction) => (
                <button
                    key={reaction.id}
                    type="button"
                    aria-pressed={reaction.mine === true}
                    title={reaction.label}
                    aria-label={words.count(reaction.label, reaction.count)}
                    onClick={() => onReact?.(reaction.id)}
                    className={cn(
                        'flex h-6 items-center gap-1 rounded-control border px-1.5 font-emoji text-sm leading-none outline-none focus-visible:ring-focus focus-visible:ring-ring/50 [&_svg]:size-3.5',
                        reaction.mine === true
                            ? 'border-primary/60 bg-primary/12 text-primary-ink'
                            : 'border-transparent bg-muted text-muted-foreground hover:border-border-strong',
                    )}
                >
                    {reaction.icon}
                    <span className="font-sans text-xs font-medium tabular-nums">{reaction.count}</span>
                </button>
            ))}
            {canAdd && (
                <Tooltip>
                    {onReaction !== undefined ? (
                        <ReactionPopover
                            {...bar}
                            selected={mineOf(reactions)}
                            onReact={onReaction}
                            side="top"
                            align="start"
                            trigger={
                                <TooltipTrigger render={add}>
                                    <SmilePlus className="size-3.5" aria-hidden />
                                </TooltipTrigger>
                            }
                        />
                    ) : (
                        <TooltipTrigger render={add}>
                            <SmilePlus className="size-3.5" aria-hidden />
                        </TooltipTrigger>
                    )}
                    <TooltipContent>{words.react}</TooltipContent>
                </Tooltip>
            )}
        </div>
    )
}
