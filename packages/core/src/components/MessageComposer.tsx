import {
    AtSign,
    Bold,
    CaseSensitive,
    ChevronDown,
    Code,
    Ellipsis,
    Eye,
    Italic,
    Link,
    List,
    ListOrdered,
    Plus,
    SendHorizontal,
    Smile,
    SquareCode,
    Strikethrough,
    Underline,
    type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { returnFocusOnKeyboard } from '../lib/focus'
import { Markdown, type MarkdownWords } from './Markdown'
import { Segmented } from './Segmented'
import { fitCount } from './TagChips'
import { Checkbox } from './ui/checkbox'
import { Textarea } from './ui/textarea'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from './ui/dropdown-menu'

/** A formatting a composer offers in its toolbar. */
export type MessageFormat = 'bold' | 'italic' | 'underline' | 'strike' | 'link' | 'ordered' | 'bullets' | 'code' | 'codeBlock'

/** Whether a composer shows the text being written or the message it makes. */
export type MessageComposerMode = 'write' | 'preview'

/** A language the code block menu offers: the name its fence carries and what the menu calls it. */
export interface CodeLanguage {
    id: string
    label: string
}

/** A time the send menu offers to send the message at, such as "Tomorrow" with "09:00" as its detail. */
export interface MessageSchedule {
    id: string
    label: string
    detail?: string
}

/**
 * The languages the shared highlighter colors, in the order the code block menu lists them, with
 * mermaid, which a sent message draws as a diagram.
 */
export const CODE_LANGUAGES: readonly CodeLanguage[] = [
    { id: 'json', label: 'JSON' },
    { id: 'yaml', label: 'YAML' },
    { id: 'sql', label: 'SQL' },
    { id: 'jq', label: 'jq' },
    { id: 'bash', label: 'Shell' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'python', label: 'Python' },
    { id: 'mermaid', label: 'Mermaid' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'tsx', label: 'TSX' },
    { id: 'jsx', label: 'JSX' },
    { id: 'html', label: 'HTML' },
    { id: 'css', label: 'CSS' },
    { id: 'markdown', label: 'Markdown' },
    { id: 'diff', label: 'Diff' },
]

export interface MessageComposerWords {
    placeholder: string
    send: string
    sendLater: string
    /** The last entry of the send menu, which hands the choice of time to `onSendLater`. */
    customTime: string
    alsoSend: string
    attach: string
    formatting: string
    emoji: string
    mention: string
    more: string
    /** The button that holds the formatting groups a narrow toolbar has no room for. */
    moreFormatting: string
    /** What the Write and Preview toggle is called, for a screen reader. */
    mode: string
    write: string
    preview: string
    /** What Preview shows for a draft with no text. */
    nothingToPreview: string
    /** What the code block menu is called. */
    codeLanguage: string
    /** The code block menu's entry for a fence with no language. */
    plainText: string
    format: Record<MessageFormat, string>
    /** The words the preview's markdown says, such as the titles of its callouts. */
    markdown?: Partial<MarkdownWords>
}

const WORDS: MessageComposerWords = {
    placeholder: 'Message',
    send: 'Send',
    sendLater: 'Schedule for later',
    customTime: 'Custom time',
    alsoSend: 'Also send to',
    attach: 'Attach',
    formatting: 'Show or hide formatting',
    emoji: 'Emoji',
    mention: 'Mention someone',
    more: 'More',
    moreFormatting: 'More formatting',
    mode: 'Write or preview',
    write: 'Write',
    preview: 'Preview',
    nothingToPreview: 'Nothing to preview',
    codeLanguage: 'Language',
    plainText: 'Plain text',
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

const MARK: Record<Exclude<MessageFormat, 'codeBlock'>, [string, string]> = {
    bold: ['**', '**'],
    italic: ['_', '_'],
    underline: ['__', '__'],
    strike: ['~~', '~~'],
    link: ['[', '](https://)'],
    ordered: ['1. ', ''],
    bullets: ['- ', ''],
    code: ['`', '`'],
}

/** The gap between formatting groups, in pixels; `gap-0.5` on the toolbar. */
const GROUP_GAP = 2

const ACTION =
    'flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-pressed:text-foreground data-popup-open:bg-hover data-popup-open:text-foreground [&_svg]:size-4'

/**
 * A button in a message composer's rows, drawn as the composer draws its own: an icon with its
 * label as the tooltip. Pass it to `actions` for more actions after the mention button.
 */
export function MessageComposerAction({
    label,
    onClick,
    children,
    pressed,
    disabled = false,
}: {
    label: string
    onClick?: () => void
    children: ReactNode
    pressed?: boolean
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={pressed}
            disabled={disabled}
            onClick={onClick}
            className={ACTION}
        >
            {children}
        </button>
    )
}

/**
 * Where a message to people is written: the formatting toolbar on top, the text that grows with
 * what is typed, and a row under it with add, the text style toggle, emoji and mentions at the left,
 * then any `actions`, and Send at the right. Enter sends and Shift+Enter breaks the line. A toolbar
 * button wraps the selection in markdown; the code block button opens a menu of languages and
 * puts the selection, or the cursor, inside a fence named for the one chosen.
 *
 * The toolbar shows the formatting groups its width has room for, in order, and puts the rest
 * behind a More button at its end, the code block's languages in a submenu there.
 *
 * Write and Preview at the end of the toolbar flip between the text and the message it makes,
 * drawn by `Markdown` as a sent message is, at least as tall as the text was and scrolling past
 * its cap; Write returns to the text with its selection where it was. In a narrow composer they
 * are one Preview button that stays pressed while previewing.
 *
 * The chevron beside Send opens the times in `schedule`, with a last entry for `onSendLater`; with
 * no `schedule`, it calls `onSendLater` at once. A reply in a thread can also go to its channel,
 * by `alsoSendTo`.
 */
export function MessageComposer({
    value,
    onChange,
    onSend,
    onAttach,
    onEmoji,
    onMention,
    onMore,
    actions,
    onSendLater,
    schedule,
    onSchedule,
    alsoSendTo,
    alsoSend = false,
    onAlsoSendChange,
    defaultFormatting = true,
    preview = true,
    math = true,
    mode: givenMode,
    defaultMode = 'write',
    onModeChange,
    codeLanguages = CODE_LANGUAGES,
    defaultCodeMenuOpen = false,
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
    /** Shows the More button after `actions`. */
    onMore?: () => void
    /** More buttons after the mention button, such as `MessageComposerAction`s. */
    actions?: ReactNode
    /** Offers the chevron beside Send; with `schedule` it is the send menu's last entry. */
    onSendLater?: () => void
    /** The times the send menu offers. */
    schedule?: readonly MessageSchedule[]
    /** Called with the id of the time chosen from `schedule`. */
    onSchedule?: (id: string) => void
    /** Where a thread reply can be sent as well, as the channel's name with its mark. */
    alsoSendTo?: ReactNode
    alsoSend?: boolean
    onAlsoSendChange?: (checked: boolean) => void
    /** Whether the formatting toolbar starts shown. */
    defaultFormatting?: boolean
    /** Offers Write and Preview at the end of the toolbar. */
    preview?: boolean
    /** Draws LaTeX math in the preview, as `Markdown` does: on by default; off where every `$` is a dollar. */
    math?: boolean
    /** The mode shown, when the app holds it; otherwise the composer does, from `defaultMode`. */
    mode?: MessageComposerMode
    defaultMode?: MessageComposerMode
    onModeChange?: (mode: MessageComposerMode) => void
    /** The languages the code block menu lists after Plain text. */
    codeLanguages?: readonly CodeLanguage[]
    /** Opens the code block menu on the first render, inside the More menu when the toolbar has put it there. */
    defaultCodeMenuOpen?: boolean
    disabled?: boolean
    className?: string
    words?: Partial<MessageComposerWords>
}) {
    const words = { ...WORDS, ...given, format: { ...WORDS.format, ...given?.format } }
    const [formatting, setFormatting] = useState(defaultFormatting)
    const [ownMode, setOwnMode] = useState<MessageComposerMode>(defaultMode)
    const mode = preview ? (givenMode ?? ownMode) : 'write'
    const previewing = mode === 'preview'
    const text = useRef<HTMLTextAreaElement>(null)
    const selection = useRef<[number, number] | null>(null)
    const wasPreviewing = useRef(previewing)
    const picked = useRef(false)
    const id = useId()
    const empty = value.trim() === ''

    const setMode = (next: MessageComposerMode) => {
        if (next === mode) return
        const area = text.current
        if (next === 'preview' && area !== null) selection.current = [area.selectionStart, area.selectionEnd]
        setOwnMode(next)
        onModeChange?.(next)
    }

    useEffect(() => {
        const area = text.current
        if (!previewing && wasPreviewing.current && area !== null) {
            const [start, end] = selection.current ?? [area.value.length, area.value.length]
            area.focus()
            area.setSelectionRange(start, end)
        }
        wasPreviewing.current = previewing
    }, [previewing])

    // The groups the toolbar has room for, measured on a ruler of empty buttons of the same sizes.
    const toolbar = useRef<HTMLDivElement>(null)
    const ruler = useRef<HTMLDivElement>(null)
    const [fit, setFit] = useState(GROUPS.length)
    useLayoutEffect(() => {
        const room = toolbar.current
        const measure = ruler.current
        if (!formatting || room === null || measure === null) return
        const update = () => {
            const boxes = [...measure.children] as HTMLElement[]
            const more = boxes.pop()?.offsetWidth ?? 0
            const style = getComputedStyle(room)
            const inner = room.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
            setFit(
                fitCount(
                    boxes.map((box) => box.offsetWidth),
                    inner,
                    GROUP_GAP,
                    more,
                ),
            )
        }
        update()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(update)
        observer.observe(room)
        return () => observer.disconnect()
    }, [formatting])
    const inline = GROUPS.slice(0, fit)
    const overflow = GROUPS.slice(fit)

    const replace = (open: string, close: string) => {
        const area = text.current
        if (area === null) return
        const { selectionStart: start, selectionEnd: end } = area
        onChange(`${value.slice(0, start)}${open}${value.slice(start, end)}${close}${value.slice(end)}`)
        requestAnimationFrame(() => {
            area.focus()
            area.setSelectionRange(start + open.length, end + open.length)
        })
    }

    const wrap = (format: Exclude<MessageFormat, 'codeBlock'>) => replace(...MARK[format])

    /** Puts the selection in a fence named for `language`, on lines of its own. */
    const fence = (language: string) => {
        const area = text.current
        if (area === null) return
        const before = value.slice(0, area.selectionStart)
        const after = value.slice(area.selectionEnd)
        const lead = before === '' || before.endsWith('\n') ? '' : '\n'
        const trail = after === '' || after.startsWith('\n') ? '' : '\n'
        picked.current = true
        replace(`${lead}\`\`\`${language}\n`, `\n\`\`\`${trail}`)
    }

    const send = () => {
        onSend()
        if (previewing) setMode('write')
    }

    /** The code block menu's entries: plain text, then each language. */
    const languages = (
        <>
            <DropdownMenuGroup>
                <DropdownMenuLabel>{words.codeLanguage}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => fence('')}>{words.plainText}</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                {codeLanguages.map((language) => (
                    <DropdownMenuItem key={language.id} onClick={() => fence(language.id)}>
                        {language.label}
                        <span className="ml-auto font-mono text-xs text-muted-foreground">{language.id}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
        </>
    )

    const later = schedule !== undefined || onSendLater !== undefined
    const chevron = cn(
        'flex h-7 items-center justify-center rounded-r-md border-l px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        empty ? 'border-transparent text-faint' : 'border-primary-foreground/25 bg-primary text-primary-foreground hover:bg-primary/90',
    )

    return (
        <div
            className={cn(
                '@container/composer flex min-w-0 flex-col rounded-lg border border-border-strong bg-field text-sm focus-within:border-ring',
                disabled && 'opacity-60',
                className,
            )}
        >
            {formatting && (
                <div className="relative flex items-center gap-2 px-1.5 pt-1">
                    <div ref={ruler} aria-hidden className="pointer-events-none invisible absolute flex h-0 overflow-hidden">
                        {GROUPS.map((group, index) => (
                            <div key={group.id} className="flex shrink-0 items-center gap-0.5">
                                {index > 0 && <span className="mx-1 w-px" />}
                                {group.formats.map(([format]) => (
                                    <span key={format} className="size-7 shrink-0" />
                                ))}
                            </div>
                        ))}
                        <div className="flex shrink-0 items-center gap-0.5">
                            <span className="mx-1 w-px" />
                            <span className="size-7 shrink-0" />
                        </div>
                    </div>
                    <div
                        ref={toolbar}
                        role="toolbar"
                        aria-label={words.formatting}
                        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden p-0.5"
                    >
                        {inline.map((group, index) => (
                            <div key={group.id} className="flex shrink-0 items-center gap-0.5">
                                {index > 0 && <span className="mx-1 h-4 w-px bg-border" aria-hidden />}
                                {group.formats.map(([format, Icon]) =>
                                    format === 'codeBlock' ? (
                                        <DropdownMenu
                                            key={format}
                                            defaultOpen={defaultCodeMenuOpen}
                                            onOpenChange={(open) => {
                                                if (open) picked.current = false
                                            }}
                                        >
                                            <DropdownMenuTrigger
                                                aria-label={words.format.codeBlock}
                                                title={words.format.codeBlock}
                                                disabled={disabled || previewing}
                                                className={ACTION}
                                            >
                                                <Icon aria-hidden />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                side="top"
                                                align="start"
                                                className="w-52"
                                                finalFocus={(closeType) =>
                                                    picked.current ? text.current : returnFocusOnKeyboard(closeType)
                                                }
                                            >
                                                {languages}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    ) : (
                                        <MessageComposerAction
                                            key={format}
                                            label={words.format[format]}
                                            disabled={disabled || previewing}
                                            onClick={() => wrap(format)}
                                        >
                                            <Icon aria-hidden />
                                        </MessageComposerAction>
                                    ),
                                )}
                            </div>
                        ))}
                        {overflow.length > 0 && (
                            <div className="flex shrink-0 items-center gap-0.5">
                                {inline.length > 0 && <span className="mx-1 h-4 w-px bg-border" aria-hidden />}
                                <DropdownMenu
                                    defaultOpen={defaultCodeMenuOpen && overflow.some((group) => group.id === 'code')}
                                    onOpenChange={(open) => {
                                        if (open) picked.current = false
                                    }}
                                >
                                    <DropdownMenuTrigger
                                        aria-label={words.moreFormatting}
                                        title={words.moreFormatting}
                                        disabled={disabled || previewing}
                                        className={ACTION}
                                    >
                                        <Ellipsis aria-hidden />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        side="top"
                                        align="end"
                                        className="w-52"
                                        finalFocus={(closeType) => (picked.current ? text.current : returnFocusOnKeyboard(closeType))}
                                    >
                                        {overflow.map((group, index) => (
                                            <DropdownMenuGroup key={group.id}>
                                                {index > 0 && <DropdownMenuSeparator />}
                                                {group.formats.map(([format, Icon]) =>
                                                    format === 'codeBlock' ? (
                                                        <DropdownMenuSub key={format} defaultOpen={defaultCodeMenuOpen}>
                                                            <DropdownMenuSubTrigger>
                                                                <Icon aria-hidden />
                                                                {words.format.codeBlock}
                                                            </DropdownMenuSubTrigger>
                                                            <DropdownMenuSubContent className="w-52">{languages}</DropdownMenuSubContent>
                                                        </DropdownMenuSub>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            key={format}
                                                            onClick={() => {
                                                                picked.current = true
                                                                wrap(format)
                                                            }}
                                                        >
                                                            <Icon aria-hidden />
                                                            {words.format[format]}
                                                        </DropdownMenuItem>
                                                    ),
                                                )}
                                            </DropdownMenuGroup>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </div>
                    {preview && (
                        <>
                            <Segmented
                                label={words.mode}
                                value={mode}
                                options={[
                                    { value: 'write', label: words.write },
                                    { value: 'preview', label: words.preview },
                                ]}
                                disabled={disabled}
                                onValueChange={setMode}
                                className="mr-0.5 hidden @md/composer:inline-flex"
                            />
                            <span className="mr-0.5 @md/composer:hidden">
                                <MessageComposerAction
                                    label={words.preview}
                                    pressed={previewing}
                                    disabled={disabled}
                                    onClick={() => setMode(previewing ? 'write' : 'preview')}
                                >
                                    <Eye aria-hidden />
                                </MessageComposerAction>
                            </span>
                        </>
                    )}
                </div>
            )}
            <div className="grid min-w-0 grid-cols-1">
                <Textarea
                    bare
                    ref={text}
                    value={value}
                    disabled={disabled}
                    rows={1}
                    placeholder={words.placeholder}
                    aria-label={words.placeholder}
                    aria-hidden={previewing || undefined}
                    onChange={(event) => onChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                            event.preventDefault()
                            if (!empty) send()
                        }
                    }}
                    className={cn('col-start-1 row-start-1 max-h-60 min-h-10 px-3 py-2 leading-6', previewing && 'invisible')}
                />
                {previewing && (
                    <div className="col-start-1 row-start-1 max-h-96 min-w-0 overflow-y-auto px-3 py-2 text-sm leading-6 wrap-break-word">
                        {empty ? (
                            <p className="text-muted-foreground">{words.nothingToPreview}</p>
                        ) : (
                            <Markdown content={value} words={words.markdown} math={math} />
                        )}
                    </div>
                )}
            </div>
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
                        className="mr-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        <Plus className="size-4" aria-hidden />
                    </button>
                )}
                <MessageComposerAction
                    label={words.formatting}
                    pressed={formatting}
                    onClick={() => {
                        if (formatting) setMode('write')
                        setFormatting(!formatting)
                    }}
                >
                    <CaseSensitive aria-hidden />
                </MessageComposerAction>
                {onEmoji !== undefined && (
                    <MessageComposerAction label={words.emoji} onClick={onEmoji}>
                        <Smile aria-hidden />
                    </MessageComposerAction>
                )}
                {onMention !== undefined && (
                    <MessageComposerAction label={words.mention} onClick={onMention}>
                        <AtSign aria-hidden />
                    </MessageComposerAction>
                )}
                {actions}
                {onMore !== undefined && (
                    <MessageComposerAction label={words.more} onClick={onMore}>
                        <Ellipsis aria-hidden />
                    </MessageComposerAction>
                )}
                <div className="ml-auto flex shrink-0 items-center">
                    <button
                        type="button"
                        aria-label={words.send}
                        title={words.send}
                        disabled={empty || disabled}
                        onClick={send}
                        className={cn(
                            'flex h-7 items-center justify-center rounded-l-md px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                            !later && 'rounded-r-md',
                            empty ? 'text-faint' : 'bg-primary text-primary-foreground hover:bg-primary/90',
                        )}
                    >
                        <SendHorizontal className="size-4" aria-hidden />
                    </button>
                    {schedule !== undefined ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                aria-label={words.sendLater}
                                title={words.sendLater}
                                disabled={empty || disabled}
                                className={chevron}
                            >
                                <ChevronDown className="size-3.5" aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" align="end" className="w-60">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>{words.sendLater}</DropdownMenuLabel>
                                    {schedule.map((option) => (
                                        <DropdownMenuItem key={option.id} onClick={() => onSchedule?.(option.id)}>
                                            {option.label}
                                            {option.detail !== undefined && (
                                                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{option.detail}</span>
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                                {onSendLater !== undefined && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={onSendLater}>{words.customTime}</DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        onSendLater !== undefined && (
                            <button
                                type="button"
                                aria-label={words.sendLater}
                                title={words.sendLater}
                                disabled={empty || disabled}
                                onClick={onSendLater}
                                className={chevron}
                            >
                                <ChevronDown className="size-3.5" aria-hidden />
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}
