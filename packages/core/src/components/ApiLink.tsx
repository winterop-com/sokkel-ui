import { ArrowUpRight } from 'lucide-react'

import { cn } from '../lib/cn'
import { CopyButton } from './CopyButton'

export interface ApiLinkWords {
    copy: string
    copied: string
}

const WORDS: ApiLinkWords = { copy: 'Copy the request', copied: 'Copied' }

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
    className?: string
    words?: Partial<ApiLinkWords>
}

/**
 * A small chip naming the request behind a screen, its method and path: `GET /api/jobs/nightly-export`.
 * A press on the copy button copies the method and the path, or `copyValue` when given, such as the
 * full address or a curl line. With `href` the path is a link, to the API's reference or the raw
 * response. The path truncates in a narrow room, its whole text on hover.
 */
export function ApiLink({ method = 'GET', path, href, copyValue, className, words: given }: ApiLinkProps) {
    const words = { ...WORDS, ...given }
    const pathClass = 'min-w-0 truncate font-mono text-xs'
    return (
        <span
            data-slot="api-link"
            className={cn(
                'inline-flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-chip border border-border bg-muted/50 pl-2',
                className,
            )}
        >
            <span className={cn('shrink-0 font-mono text-xs font-medium', methodTone(method))}>{method.toUpperCase()}</span>
            {href === undefined ? (
                <span title={path} className={pathClass}>
                    {path}
                </span>
            ) : (
                <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    title={path}
                    className={cn(
                        pathClass,
                        'inline-flex items-center gap-0.5 rounded-mini underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring',
                    )}
                >
                    <span className="truncate">{path}</span>
                    <ArrowUpRight className="size-3 shrink-0" aria-hidden />
                </a>
            )}
            <CopyButton value={copyValue ?? `${method.toUpperCase()} ${path}`} size="icon-xs" words={words} className="shrink-0" />
        </span>
    )
}
