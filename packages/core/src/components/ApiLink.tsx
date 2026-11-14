import { ArrowUpRight } from 'lucide-react'

import { cn } from '../lib/cn'
import { CopyButton } from './CopyButton'
import { Link } from './Link'

export interface ApiLinkWords {
    copy: string
    copied: string
    /** Said after the path to a screen reader when the chip opens the address. */
    opens: string
}

const WORDS: ApiLinkWords = { copy: 'Copy the request', copied: 'Copied', opens: 'opens in a new tab' }

/** The ink a method is written in: reads quiet, writes in the warning ink, deletes in the critical. */
function methodTone(method: string): string {
    const name = method.toUpperCase()
    if (name === 'DELETE') return 'text-critical-ink'
    if (name === 'POST' || name === 'PUT' || name === 'PATCH') return 'text-warning-ink'
    return 'text-muted-foreground'
}

export interface ApiLinkProps {
    method?: string
    path: string
    href?: string
    copyValue?: string
    /** The whole chip opens `href` (or the path) in a new tab, in place of the copy button. */
    open?: boolean
    className?: string
    words?: Partial<ApiLinkWords>
}

const CHIP = 'inline-flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-chip border border-border bg-muted/50 pl-2'
const PATH = 'min-w-0 truncate font-mono text-xs'

/**
 * A small chip naming the request behind a screen, its method and path: `GET /api/jobs/nightly-export`.
 * A press on the copy button copies the method and the path, or `copyValue` when given, such as the
 * full address or a curl line. With `href` the path is a link, to the API's reference or the raw
 * response. With `open` the whole chip is one link that opens `href`, or the path when there is
 * none, in a new tab, and there is nothing to copy. The path truncates in a narrow room, its whole
 * text on hover.
 */
export function ApiLink({ method = 'GET', path, href, copyValue, open = false, className, words: given }: ApiLinkProps) {
    const words = { ...WORDS, ...given }
    const verb = <span className={cn('shrink-0 font-mono text-xs font-medium', methodTone(method))}>{method.toUpperCase()}</span>
    if (open) {
        return (
            <Link
                data-slot="api-link"
                href={href ?? path}
                target="_blank"
                rel="noreferrer"
                title={path}
                className={cn(
                    CHIP,
                    'pr-2 text-foreground outline-none hover:bg-hover focus-visible:outline-focus focus-visible:outline-ring',
                    className,
                )}
            >
                {verb}
                <span className={PATH}>{path}</span>
                <span className="sr-only">, {words.opens}</span>
                <ArrowUpRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
        )
    }
    return (
        <span data-slot="api-link" className={cn(CHIP, className)}>
            {verb}
            {href === undefined ? (
                <span title={path} className={PATH}>
                    {path}
                </span>
            ) : (
                <Link
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    title={path}
                    className={cn(
                        PATH,
                        'inline-flex items-center gap-0.5 rounded-mini underline-offset-2 outline-none hover:underline focus-visible:outline-focus focus-visible:outline-ring',
                    )}
                >
                    <span className="truncate">{path}</span>
                    <ArrowUpRight className="size-3 shrink-0" aria-hidden />
                </Link>
            )}
            <CopyButton value={copyValue ?? `${method.toUpperCase()} ${path}`} size="icon-xs" words={words} className="shrink-0" />
        </span>
    )
}
