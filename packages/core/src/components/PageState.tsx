import { CircleAlert, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ProseText } from './ProseText'

/** How a read came back, when the caller kept it: an HTTP status, or no answer at all. */
export type ReadOutcome = number | 'unreachable'

/** The headings a failed read is given, by what the server answered. */
export interface PageStateWords {
    loading: string
    refused: string
    missing: string
    unreachable: string
}

const WORDS: PageStateWords = {
    loading: 'Loading',
    refused: 'The server refused this read',
    missing: 'Nothing is there',
    unreachable: 'The server is not answering',
}

/** The heading over a failed read: a 404 is an absence and no answer is silence, not a refusal. */
export function pageStateHeading(outcome: ReadOutcome | null | undefined, words: PageStateWords = WORDS): string {
    if (outcome === 'unreachable') return words.unreachable
    if (outcome === 404) return words.missing
    return words.refused
}

/** The frame the three states share: a box that keeps its height inside a flex column. */
function Frame({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                'flex shrink-0 items-start gap-3 rounded-surface border border-border-strong bg-card px-4 py-6 text-sm',
                className,
            )}
        >
            {children}
        </div>
    )
}

/**
 * The states a read lands in, kept distinct all the way to the screen: loading, failed, empty, and
 * the content. A failure is headed by what the server answered, with its own diagnostic under the
 * heading; a string diagnostic has its backticked parts drawn in the code face.
 */
export function PageState({
    loading,
    error,
    status,
    empty = false,
    emptyMessage,
    emptyRender,
    words: given,
    children,
}: {
    loading: boolean
    /** What the server said when it refused, or a sentence the caller wrote in its place. */
    error?: ReactNode
    status?: ReadOutcome | null
    empty?: boolean
    /** The one line an empty read states. */
    emptyMessage?: ReactNode
    /** An empty state that is more than a sentence, such as a way to make the first one. */
    emptyRender?: ReactNode
    words?: Partial<PageStateWords>
    children: ReactNode
}) {
    const words = { ...WORDS, ...given }
    if (loading) {
        return (
            <Frame className="items-center text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                <span role="status">{words.loading}</span>
            </Frame>
        )
    }
    if (error !== undefined && error !== null && error !== false) {
        return (
            <Frame>
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                <div role="alert" className="flex min-w-0 flex-col gap-1">
                    <p className="font-medium">{pageStateHeading(status, words)}</p>
                    <p className="text-xs break-words text-muted-foreground">
                        {typeof error === 'string' ? <ProseText text={error} /> : error}
                    </p>
                </div>
            </Frame>
        )
    }
    if (empty) {
        if (emptyRender !== undefined) return <>{emptyRender}</>
        return <Frame className="text-muted-foreground">{emptyMessage}</Frame>
    }
    return <>{children}</>
}
