import { Paperclip } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import { cn } from '../lib/cn'
import { PersonAvatar } from './PersonAvatar'

/** Who sent a letter: a name, the address it came from and a picture. */
export interface LetterSender {
    name: string
    address?: string
    image?: string
}

/** The words a letter says; `to` reads the recipients' names out as one line. */
export interface LetterWords {
    attached: string
    to: (names: readonly string[]) => string
}

export const LETTER_WORDS: LetterWords = { attached: 'Has attachments', to: (names) => `to ${names.join(', ')}` }

/** Where a catalog holds a letter's words. */
export const LETTER_PART: WordsPart<LetterWords> = { id: 'letter', words: LETTER_WORDS }

/** A letter's phrases as ICU messages in English, for the catalog. */
export const LETTER_MESSAGES: WordMessages<LetterWords> = { to: null }

export interface LetterProps {
    from: LetterSender
    /** The recipients' names, read out under the sender while the letter is open. */
    to?: readonly string[]
    /** When it was sent, at the head's end. */
    time: ReactNode
    /** Whether files came with it, marked by a paperclip before the time. */
    attached?: boolean
    /** The line under the sender while the letter is folded: its first words. */
    snippet?: ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    defaultOpen?: boolean
    /** Whether a press on the head folds the letter; `false` keeps it open with a head that is no button. */
    foldable?: boolean
    /** The letter's body, its files and its replies, shown while it is open. */
    children?: ReactNode
    className?: string
    words?: Partial<LetterWords>
}

/**
 * One letter in a thread of mail: a head with the sender's picture, their name, their address
 * while open, the time at the end with a paperclip before it when files came along, and under the
 * name the recipients while open or the letter's first words while folded. The body follows under
 * the head, lined up with the name, from a phone's width up.
 *
 * The head is a button that folds and unfolds the letter, as a thread folds the letters already
 * read. Left to itself the letter holds whether it is open, starting at `defaultOpen`; `open` with
 * `onOpenChange` holds it from outside. `foldable={false}` keeps it open, such as the thread's
 * latest letter, and its head is no button.
 */
export function Letter({
    from,
    to,
    time,
    attached = false,
    snippet,
    open: held,
    onOpenChange,
    defaultOpen = false,
    foldable = true,
    children,
    className,
    words: given,
}: LetterProps) {
    const words = useWords(LETTER_PART, given)
    const [own, setOwn] = useState(defaultOpen)
    const open = !foldable || (held ?? own)
    const head = (
        <span className="flex min-w-0 items-start gap-3">
            <PersonAvatar name={from.name} image={from.image} size="md" />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-sm font-medium">{from.name}</span>
                    {open && from.address !== undefined && (
                        <span className="truncate text-xs text-muted-foreground max-sm:hidden">{from.address}</span>
                    )}
                    <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                        {attached && <Paperclip className="size-3.5" role="img" aria-label={words.attached} />}
                        {time}
                    </span>
                </span>
                {open
                    ? to !== undefined && to.length > 0 && <span className="truncate text-sm text-muted-foreground">{words.to(to)}</span>
                    : snippet !== undefined && <span className="truncate text-sm text-muted-foreground">{snippet}</span>}
            </span>
        </span>
    )
    return (
        <article className={cn('border-b border-border px-4 py-3 md:px-6', open && 'pb-5', className)}>
            {foldable ? (
                <button
                    type="button"
                    aria-expanded={open}
                    className="block w-full min-w-0 rounded-control text-left outline-none focus-visible:ring-focus focus-visible:ring-ring"
                    onClick={() => {
                        setOwn(!open)
                        onOpenChange?.(!open)
                    }}
                >
                    {head}
                </button>
            ) : (
                head
            )}
            {open && children !== undefined && <div className="mt-3 flex min-w-0 flex-col gap-4 sm:pl-11">{children}</div>}
        </article>
    )
}
