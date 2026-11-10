import { ArrowUpRight } from 'lucide-react'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Link } from './Link'

/**
 * How a link sits among what is around it: `default` in the primary ink, underlined on hover;
 * `inline` in the body ink and always underlined, for a link inside running text; `data` in the
 * body ink with a dotted underline, for a link that is a value in a table or a list; `aside` in
 * the muted ink, for a way onward beside the main content.
 */
export type TextLinkVariant = 'default' | 'inline' | 'data' | 'aside'

/** The words a text link says. */
export interface TextLinkWords {
    /** Read after an external link's text, for a screen reader. */
    newTab: string
}

const WORDS: TextLinkWords = {
    newTab: 'opens in a new tab',
}

const VARIANT: Record<TextLinkVariant, string> = {
    default: 'text-primary-ink hover:underline',
    inline: 'text-foreground underline decoration-muted-foreground hover:decoration-foreground',
    data: 'text-foreground underline decoration-muted-foreground decoration-dotted hover:text-primary-ink hover:decoration-current hover:decoration-solid',
    aside: 'text-muted-foreground hover:text-foreground hover:underline',
}

interface TextLinkCommon {
    children: ReactNode
    variant?: TextLinkVariant
    /** Drawn in the code face, as an id or a code is. */
    code?: boolean
    className?: string
}

/** A link to an address, drawn through the app's `LinkProvider`. */
export interface TextLinkAnchorProps
    extends TextLinkCommon, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children' | 'className'> {
    href: string
    /** Opens the address in a new tab, safely, with a trailing mark and words saying so. */
    external?: boolean
    words?: Partial<TextLinkWords>
    onPress?: never
}

/** A button drawn as a link, for one that opens something in place: a panel, a row's detail. */
export interface TextLinkButtonProps
    extends TextLinkCommon, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children' | 'className' | 'type'> {
    onPress: (event: MouseEvent<HTMLButtonElement>) => void
    href?: never
    external?: never
    words?: never
}

export type TextLinkProps = TextLinkAnchorProps | TextLinkButtonProps

const BASE = 'rounded-mini underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-ring'

/**
 * A link inside text or a value: a job named in a run's facts, a host in a table, a sentence's way
 * onward. `variant` sets how it sits among what is around it (`TextLinkVariant`), and `code` sets
 * it in the code face for an id.
 *
 * With `href` it is a link, drawn through the app's `LinkProvider`; `external` opens it in a new
 * tab as a plain anchor, with a trailing mark and words a screen reader reads. With `onPress` it is
 * a button drawn the same way, for a link that opens something in place; the attributes it is
 * given, `aria-expanded` among them, go onto the button.
 */
export function TextLink(props: TextLinkProps) {
    if (props.onPress !== undefined) {
        const { children, variant = 'default', code = false, className, onPress, ...rest } = props
        return (
            <button
                type="button"
                {...rest}
                onClick={onPress}
                className={cn(BASE, 'inline cursor-pointer text-start', VARIANT[variant], code && 'font-mono', className)}
            >
                {children}
            </button>
        )
    }
    const { children, variant = 'default', code = false, className, href, external = false, words: given, ...rest } = props
    const words = { ...WORDS, ...given }
    return (
        <Link
            {...rest}
            href={href}
            target={external ? '_blank' : rest.target}
            rel={external ? 'noopener noreferrer' : rest.rel}
            className={cn(BASE, VARIANT[variant], code && 'font-mono', className)}
        >
            {children}
            {external && (
                <>
                    <ArrowUpRight data-slot="external-mark" className="ms-0.5 inline size-3 align-baseline" aria-hidden />
                    <span className="sr-only"> ({words.newTab})</span>
                </>
            )}
        </Link>
    )
}
