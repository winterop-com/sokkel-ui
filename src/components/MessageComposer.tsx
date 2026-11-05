import {
    AtSign,
    Bold,
    ChevronDown,
    Code,
    Ellipsis,
    Italic,
    Link,
    List,
    ListOrdered,
    Plus,
    SendHorizontal,
    Smile,
    SquareCode,
    Strikethrough,
    Type,
    Underline,
    type LucideIcon,
} from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Checkbox } from './ui/checkbox'

/** A formatting a composer offers in its toolbar. */
export type MessageFormat = 'bold' | 'italic' | 'underline' | 'strike' | 'link' | 'ordered' | 'bullets' | 'code' | 'codeBlock'

export interface MessageComposerWords {
    placeholder: string
    send: string
    sendLater: string
    alsoSend: string
    attach: string
    formatting: string
    emoji: string
    mention: string
    more: string
    format: Record<MessageFormat, string>
}

const WORDS: MessageComposerWords = {
    placeholder: 'Message',
    send: 'Send',
    sendLater: 'Schedule for later',
    alsoSend: 'Also send to',
    attach: 'Attach',
    formatting: 'Show or hide formatting',
    emoji: 'Emoji',
    mention: 'Mention someone',
    more: 'More',
    format: {
        bold: 'Bold',
        italic: 'Italic',
        underline: 'Underline',
        strike: 'Strikethrough',
        link: 'Link',
        ordered: 'Numbered list',
        bullets: 'Bulleted list',
        code: 'Code',
        codeBlock: 'Code block',
    },
}

const GROUPS: { id: string; formats: [MessageFormat, LucideIcon][] }[] = [
    {
        id: 'text',
        formats: [
            ['bold', Bold],
            ['italic', Italic],
            ['underline', Underline],
            ['strike', Strikethrough],
        ],
    },
    {
        id: 'lists',
        formats: [
            ['link', Link],
            ['ordered', ListOrdered],
            ['bullets', List],
        ],
    },
    {
        id: 'code',
        formats: [
            ['code', Code],
            ['codeBlock', SquareCode],
        ],
    },
]

const MARK: Record<MessageFormat, [string, string]> = {
    bold: ['**', '**'],
    italic: ['_', '_'],
    underline: ['__', '__'],
    strike: ['~~', '~~'],
    link: ['[', '](https://)'],
    ordered: ['1. ', ''],
    bullets: ['- ', ''],
    code: ['`', '`'],
    codeBlock: ['```\n', '\n```'],
}

function IconButton({
    label,
    onClick,
    children,
    pressed,
}: {
    label: string
    onClick?: () => void
    children: ReactNode
    pressed?: boolean
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={pressed}
            onClick={onClick}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:text-foreground [&_svg]:size-4"
        >
            {children}
        </button>
    )
}

/**
 * Where a message to people is written: the formatting toolbar on top, the text that grows with
 * what is typed, and a row under it with attach, the formatting toggle, emoji and mentions at the
 * left and Send at the right. Enter sends and Shift+Enter breaks the line. A toolbar button wraps
 * the selection in markdown. A reply in a thread can also go to its channel, by `alsoSendTo`.
 */
export function MessageComposer({
    value,
    onChange,
    onSend,
    onAttach,
    onEmoji,
    onMention,
    onSendLater,
    alsoSendTo,
    alsoSend = false,
    onAlsoSendChange,
    defaultFormatting = true,
    disabled = false,
    className,
    words: given,
}: {
    value: string
    onChange: (value: string) => void
    onSend: () => void
    onAttach?: () => void
    onEmoji?: () => void
    onMention?: () => void
    /** Offers the menu beside Send. */
    onSendLater?: () => void
    /** Where a thread reply can be sent as well, as the channel's name with its mark. */
    alsoSendTo?: ReactNode
    alsoSend?: boolean
    onAlsoSendChange?: (checked: boolean) => void
    /** Whether the formatting toolbar starts shown. */
    defaultFormatting?: boolean
    disabled?: boolean
    className?: string
    words?: Partial<MessageComposerWords>
}) {
    const words = { ...WORDS, ...given, format: { ...WORDS.format, ...given?.format } }
    const [formatting, setFormatting] = useState(defaultFormatting)
    const text = useRef<HTMLTextAreaElement>(null)
    const id = useId()
    const empty = value.trim() === ''

    const wrap = (format: MessageFormat) => {
        const area = text.current
        if (area === null) return
        const [open, close] = MARK[format]
        const { selectionStart: start, selectionEnd: end } = area
        onChange(`${value.slice(0, start)}${open}${value.slice(start, end)}${close}${value.slice(end)}`)
        requestAnimationFrame(() => {
            area.focus()
            area.setSelectionRange(start + open.length, end + open.length)
        })
    }

    return (
        <div
            className={cn(
                'flex flex-col rounded-lg border border-border-strong bg-field text-sm focus-within:border-ring',
                disabled && 'opacity-60',
                className,
            )}
        >
            {formatting && (
                <div role="toolbar" aria-label={words.formatting} className="flex flex-wrap items-center gap-0.5 px-2 pt-1.5">
                    {GROUPS.map((group, index) => (
                        <div key={group.id} className="flex items-center gap-0.5">
                            {index > 0 && <span className="mx-1 h-4 w-px bg-border" aria-hidden />}
                            {group.formats.map(([format, Icon]) => (
                                <IconButton key={format} label={words.format[format]} onClick={() => wrap(format)}>
                                    <Icon aria-hidden />
                                </IconButton>
                            ))}
                        </div>
                    ))}
                </div>
            )}
            <textarea
                ref={text}
                value={value}
                disabled={disabled}
                rows={1}
                placeholder={words.placeholder}
                aria-label={words.placeholder}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault()
                        if (!empty) onSend()
                    }
                }}
                className="field-sizing-content max-h-60 min-h-10 resize-none bg-transparent px-3 py-2 leading-6 outline-none placeholder:text-muted-foreground"
            />
            {alsoSendTo !== undefined && (
                <label htmlFor={`${id}-also`} className="flex items-center gap-2 px-3 pb-1 text-xs text-muted-foreground">
                    <Checkbox id={`${id}-also`} checked={alsoSend} onCheckedChange={(checked) => onAlsoSendChange?.(checked)} />
                    <span className="flex min-w-0 items-center gap-1">
                        {words.alsoSend} <span className="flex items-center gap-0.5 font-medium text-foreground">{alsoSendTo}</span>
                    </span>
                </label>
            )}
            <div className="flex items-center gap-0.5 px-2 pb-1.5">
                {onAttach !== undefined && (
                    <button
                        type="button"
                        aria-label={words.attach}
                        title={words.attach}
                        onClick={onAttach}
                        className="mr-0.5 flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        <Plus className="size-4" aria-hidden />
                    </button>
                )}
                <IconButton label={words.formatting} pressed={formatting} onClick={() => setFormatting(!formatting)}>
                    <Type aria-hidden />
                </IconButton>
                {onEmoji !== undefined && (
                    <IconButton label={words.emoji} onClick={onEmoji}>
                        <Smile aria-hidden />
                    </IconButton>
                )}
                {onMention !== undefined && (
                    <IconButton label={words.mention} onClick={onMention}>
                        <AtSign aria-hidden />
                    </IconButton>
                )}
                <IconButton label={words.more}>
                    <Ellipsis aria-hidden />
                </IconButton>
                <div className="ml-auto flex items-center">
                    <button
                        type="button"
                        aria-label={words.send}
                        title={words.send}
                        disabled={empty || disabled}
                        onClick={onSend}
                        className={cn(
                            'flex h-7 items-center justify-center rounded-l-md px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                            onSendLater === undefined && 'rounded-r-md',
                            empty ? 'text-faint' : 'bg-primary text-primary-foreground hover:bg-primary/90',
                        )}
                    >
                        <SendHorizontal className="size-4" aria-hidden />
                    </button>
                    {onSendLater !== undefined && (
                        <button
                            type="button"
                            aria-label={words.sendLater}
                            title={words.sendLater}
                            disabled={empty || disabled}
                            onClick={onSendLater}
                            className={cn(
                                'flex h-7 items-center justify-center rounded-r-md border-l px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                                empty
                                    ? 'border-transparent text-faint'
                                    : 'border-primary-foreground/25 bg-primary text-primary-foreground hover:bg-primary/90',
                            )}
                        >
                            <ChevronDown className="size-3.5" aria-hidden />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
