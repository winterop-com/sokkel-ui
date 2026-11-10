import { TriangleAlert } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { CopyButton } from './CopyButton'

export interface SecretRevealWords {
    /** The value's name when the label is not plain text. */
    secret: string
    warning: string
    copy: string
    copied: string
}

const WORDS: SecretRevealWords = {
    secret: 'Secret',
    warning: 'Copy it now. It will not be shown again.',
    copy: 'Copy',
    copied: 'Copied',
}

export interface SecretRevealProps {
    value: string
    /** What the secret is, over the value: the token's name. */
    label?: ReactNode
    /** A line after the warning: where to put the secret, how to use it. */
    note?: ReactNode
    className?: string
    words?: Partial<SecretRevealWords>
    /** Focuses the value as it appears, such as after the create that made it took away what held focus. */
    autoFocus?: boolean
}

/**
 * A secret shown once, as it is created: an API token, a signing key, a recovery code. The value
 * sits whole in the code face, wrapped rather than cut so all of it can be checked, with a copy
 * button beside it and a warning under it that it will not be shown again. A label over it says
 * what the secret is.
 */
export function SecretReveal({ value, label, note, className, words: given, autoFocus = false }: SecretRevealProps) {
    const words = { ...WORDS, ...given }
    const code = useRef<HTMLElement>(null)
    useEffect(() => {
        if (autoFocus) code.current?.focus()
    }, [autoFocus])
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            {label !== undefined && <span className="text-sm font-medium">{label}</span>}
            <div className="flex items-start gap-1 rounded-control border border-border-strong bg-panel-ground py-1 pr-1 pl-3 has-[code:focus-visible]:border-ring">
                <code
                    ref={code}
                    data-secret=""
                    tabIndex={0}
                    role="textbox"
                    aria-readonly="true"
                    aria-label={typeof label === 'string' ? label : words.secret}
                    className="min-w-0 flex-1 py-1 font-mono text-sm break-all outline-none select-all"
                >
                    {value}
                </code>
                <CopyButton value={value} words={{ copy: words.copy, copied: words.copied }} />
            </div>
            <p role="status" className="flex items-start gap-1.5 text-xs text-warning-ink">
                <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                <span>
                    {words.warning}
                    {note !== undefined && <span className="text-muted-foreground"> {note}</span>}
                </span>
            </p>
        </div>
    )
}
