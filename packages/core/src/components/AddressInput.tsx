import { X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ISSUE_WITHIN_EDGE } from '../lib/issue-edge'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import { ISSUE_PART, ISSUE_WORDS, IssueMark, worst, type Issue, type IssueWords } from './IssueMark'
import { Input } from './ui/input'

/** One recipient: the address, and the name to show in its place when there is one. */
export interface Address {
    address: string
    name?: string
}

export interface AddressInputWords extends IssueWords {
    placeholder: string
    remove: (who: string) => string
    invalid: string
    /** The field's issue when addresses are not shaped like addresses. */
    issue: (count: number) => string
    removeInvalid: string
}

export const ADDRESS_INPUT_WORDS: AddressInputWords = {
    placeholder: 'Add people',
    remove: (who) => `Remove ${who}`,
    invalid: 'Not an email address',
    issue: (count) => (count === 1 ? '1 address is not an email address' : `${String(count)} addresses are not email addresses`),
    removeInvalid: 'Remove them',
    ...ISSUE_WORDS,
}

/** Where a catalog holds an address input's words, and the arguments its phrases name. */
export const ADDRESS_INPUT_PART: WordsPart<AddressInputWords> = {
    id: 'addressInput',
    words: ADDRESS_INPUT_WORDS,
    args: { remove: 'who', issue: 'count' },
    from: [ISSUE_PART],
}

/** An address input's phrases as ICU messages in English, for the catalog. */
export const ADDRESS_INPUT_MESSAGES: WordMessages<AddressInputWords> = {
    remove: 'Remove {who}',
    issue: '{count, plural, =1 {1 address is not an email address} other {# addresses are not email addresses}}',
}

/** What an address may hold on either side of its `@`: no spaces and none of `@<>,;`. */
const ADDRESS_PART = /^[^\s@<>,;]+$/

/** Whether the text is shaped like an email address. */
export function isAddress(text: string): boolean {
    const at = text.indexOf('@')
    const domain = text.slice(at + 1)
    return at > 0 && ADDRESS_PART.test(text.slice(0, at)) && ADDRESS_PART.test(domain) && domain.slice(1, -1).includes('.')
}

/**
 * A recipient written `Name <address>` or `"Name" <address>`: its name, untrimmed, and its address;
 * null for text of another shape.
 */
function namedAddress(part: string): { name: string; address: string } | null {
    const open = part.indexOf('<')
    const address = part.slice(open + 1, -1)
    if (open < 0 || !part.endsWith('>') || address === '' || address.includes('>')) return null
    let name = part.slice(0, open)
    if (name.startsWith('"')) name = name.slice(1)
    name = name.trimEnd()
    if (name.endsWith('"')) name = name.slice(0, -1)
    return name.includes('"') ? null : { name, address }
}

/** The recipients in pasted or typed text, separated by commas, semicolons or line breaks; `Name <address>` keeps the name. */
export function parseAddresses(text: string): Address[] {
    return text
        .split(/[,;\n]+/)
        .map((part) => part.trim())
        .filter((part) => part !== '')
        .map((part) => {
            const named = namedAddress(part)
            if (named === null) return { address: part }
            const name = named.name.trim()
            return name === '' ? { address: named.address.trim() } : { address: named.address.trim(), name }
        })
}

export interface AddressInputProps {
    value: readonly Address[]
    onChange: (value: Address[]) => void
    /** The typing input's id, for a `Field`'s label to name it. */
    id?: string
    /** A short label inside the field before the chips: `To`, `Cc`. */
    label?: ReactNode
    bare?: boolean
    /** Whether an address is acceptable; a chip that is not is marked. */
    valid?: (address: string) => boolean
    autoFocus?: boolean
    /** Issues beyond the field's own, such as a server's refusal of an address. */
    issues?: readonly Issue[]
    /** Whether the issue mark's message is open, for a form's count to open it. */
    issueOpen?: boolean
    onIssueOpenChange?: (open: boolean) => void
    className?: string
    words?: Partial<AddressInputWords>
}

/**
 * A field of recipients: each one a chip, and the text after them where the next is typed. Enter,
 * a comma, a semicolon or leaving the field turns the text into chips; a paste of several
 * addresses turns into several; Backspace in the empty text takes the last chip back, so a chip's remove button is
 * left out of the tab order.
 *
 * A chip shows the name when there is one, the address on hover, and is marked when the address is
 * not shaped like one. Then the field takes the library's issue mark at its end, saying which
 * addresses are wrong and offering to remove them, with any `issues` the app adds, such as a
 * server's refusal; the form shows the count beside its verb with `IssueCount`, and the field never
 * grows a message under it. `bare` drops the field's own frame, for a form whose rows are divided
 * by rules, such as a message being written.
 */
export function AddressInput({
    value,
    onChange,
    id,
    label,
    bare = false,
    valid = isAddress,
    autoFocus = false,
    issues: extra = [],
    issueOpen,
    onIssueOpenChange,
    className,
    words: given,
}: AddressInputProps) {
    const words = useWords(ADDRESS_INPUT_PART, given)
    const [draft, setDraft] = useState('')
    const input = useRef<HTMLInputElement>(null)
    const wrong = value.filter((entry) => !valid(entry.address))
    const issues: Issue[] = [
        ...(wrong.length === 0
            ? []
            : [
                  {
                      tone: 'critical' as const,
                      text: words.issue(wrong.length),
                      detail: wrong.map((entry) => entry.address).join(', '),
                      actions: [{ label: words.removeInvalid, onClick: () => onChange(value.filter((entry) => valid(entry.address))) }],
                  },
              ]),
        ...extra,
    ]
    const tone = worst(issues)
    const commit = (text: string) => {
        const added = parseAddresses(text)
        setDraft('')
        if (added.length > 0) onChange([...value, ...added])
    }
    return (
        <div className={cn('relative min-w-0', className)}>
            <div
                data-slot="address-input"
                className={cn(
                    'flex min-h-(--density-control) min-w-0 cursor-text flex-wrap items-center gap-1 text-sm max-md:min-h-finger',
                    bare
                        ? 'py-1'
                        : 'rounded-control border border-input bg-field px-1.5 py-1 transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
                    tone !== null && cn('pr-9', !bare && ISSUE_WITHIN_EDGE[tone]),
                )}
                onClick={() => input.current?.focus()}
            >
                {label !== undefined && <span className="shrink-0 pr-1.5 pl-1 text-muted-foreground">{label}</span>}
                {value.map((entry, index) => {
                    const bad = !valid(entry.address)
                    const shown = entry.name ?? entry.address
                    return (
                        <span
                            key={`${entry.address}-${index}`}
                            title={bad ? `${entry.address}: ${words.invalid}` : entry.address}
                            className={cn(
                                'inline-flex h-(--density-control-xs) max-w-full min-w-0 items-center gap-1 rounded-control pr-0.5 pl-2 text-xs',
                                bad
                                    ? 'bg-destructive/10 text-destructive ring-1 ring-destructive/40'
                                    : 'bg-secondary text-secondary-foreground',
                            )}
                        >
                            <span className="truncate">{shown}</span>
                            <button
                                type="button"
                                tabIndex={-1}
                                aria-label={words.remove(shown)}
                                className="flex size-5 shrink-0 items-center justify-center rounded-mini text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onChange(value.filter((_, at) => at !== index))
                                    input.current?.focus()
                                }}
                            >
                                <X className="size-3" aria-hidden />
                            </button>
                        </span>
                    )
                })}
                <Input
                    bare
                    ref={input}
                    id={id}
                    type="text"
                    inputMode="email"
                    autoComplete="off"
                    autoFocus={autoFocus}
                    value={draft}
                    placeholder={value.length === 0 ? words.placeholder : undefined}
                    aria-label={id !== undefined ? undefined : typeof label === 'string' ? label : words.placeholder}
                    aria-invalid={tone === 'critical' || undefined}
                    className="h-(--density-control-xs) min-w-24 flex-1 px-1 placeholder:text-faint"
                    onChange={(event) => {
                        const text = event.target.value
                        if (/[,;]/.test(text)) commit(text)
                        else setDraft(text)
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && draft.trim() !== '') {
                            event.preventDefault()
                            commit(draft)
                        } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
                            event.preventDefault()
                            const last = value[value.length - 1]
                            onChange(value.slice(0, -1))
                            setDraft(last.address)
                        }
                    }}
                    onPaste={(event) => {
                        const text = event.clipboardData.getData('text/plain')
                        if (!/[,;\n]/.test(text)) return
                        event.preventDefault()
                        commit(draft + text)
                    }}
                    onBlur={() => commit(draft)}
                />
            </div>
            <IssueMark issues={issues} open={issueOpen} onOpenChange={onIssueOpenChange} words={words} className="top-1 bottom-auto my-0" />
        </div>
    )
}
