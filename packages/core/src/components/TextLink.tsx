import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Link } from './Link'

export interface TextLinkProps {
    href: string
    children: ReactNode
    /** Opens the address in a new tab, as a link that leaves the app does. */
    external?: boolean
    /** Drawn in the code face, as an id or a code is. */
    code?: boolean
    className?: string
}

/**
 * A link inside text or a value: a place named in a record's facts, a form's title in a receipt,
 * a sentence's way onward. It is drawn in the primary ink and underlined on hover, so it
 * reads as a link among plain values without shouting, and ringed on focus; `code` sets it in the code
 * face for an id.
 * `external` opens it in a new tab, safely. An internal link goes through the app's `LinkProvider`.
 */
export function TextLink({ href, children, external = false, code = false, className }: TextLinkProps) {
    return (
        <Link
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            className={cn(
                'rounded-mini text-primary-ink underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring',
                code && 'font-mono',
                className,
            )}
        >
            {children}
        </Link>
    )
}
