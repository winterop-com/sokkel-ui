import { CircleAlert, Loader2, RotateCw, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ProseText } from './ProseText'
import { Button } from './ui/button'

/** How a failed read is drawn: as the page's failure, or as a warning over data the page can do without. */
export type PageStateTone = 'critical' | 'warning'

/** How a read came back, when the caller kept it: an HTTP status, or no answer at all. */
export type ReadOutcome = number | 'unreachable'

/** The headings a failed read is given, by what the server answered. */
export interface PageStateWords {
    loading: string
    /** The heading over a refused read of the page's own data. */
    refused: string
    missing: string
    unreachable: string
    /** The heading over a refused read in the `warning` tone, of data the page stands without. */
    partRefused: string
    /** The heading over a `warning` read that found nothing there. */
    partMissing: string
    /** The button that reads again after a failure. */
    retry: string
}

const WORDS: PageStateWords = {
    loading: 'Loading',
    refused: 'The server refused this read',
    missing: 'Nothing is there',
    unreachable: 'The server is not answering',
    partRefused: 'Part of this page could not be read',
    partMissing: 'Part of this page is not there',
    retry: 'Try again',
}

/**
 * The heading over a failed read: a 404 is an absence and no answer is silence, not a refusal. In
 * the `warning` tone a refusal or an absence is said of a part of the page, not of the page.
 */
export function pageStateHeading(
    outcome: ReadOutcome | null | undefined,
    words: PageStateWords = WORDS,
    tone: PageStateTone = 'critical',
): string {
    const part = tone === 'warning'
    if (outcome === 'unreachable') return words.unreachable
    if (outcome === 404) return part ? words.partMissing : words.missing
    return part ? words.partRefused : words.refused
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

export interface PageStateProps {
    loading: boolean
    /** What the server said when it refused, or a sentence the caller wrote in its place. */
    error?: ReactNode
    status?: ReadOutcome | null
    empty?: boolean
    /** The one line an empty read states. */
    emptyMessage?: ReactNode
    /** An empty state that is more than a sentence, such as a way to make the first one. */
    emptyRender?: ReactNode
    /** Reads again after a failure, from a button under the diagnostic. */
    onRetry?: () => void
    /**
     * How a failure is drawn: `critical`, the page's own read failing, or `warning`, a read of
     * secondary data the page stands without, in the warning tone.
     */
    tone?: PageStateTone
    words?: Partial<PageStateWords>
    children: ReactNode
}

/**
 * The states a read lands in, kept distinct all the way to the screen: loading, failed, empty, and
 * the content. A failure is headed by what the server answered, with its own diagnostic under the
 * heading; a string diagnostic has its backticked parts drawn in the code face. `onRetry` puts a
 * button that reads again under the diagnostic, as a dashboard panel's failure has one. `tone`
 * `warning` draws a failed read of secondary data, such as a side list beside the page's own
 * content, as a warning rather than the page's failure, announced politely rather than as an alert,
 * and headed as a part of the page that could not be read (`partRefused`, `partMissing`).
 */
export function PageState({
    loading,
    error,
    status,
    empty = false,
    emptyMessage,
    emptyRender,
    onRetry,
    tone = 'critical',
    words: given,
    children,
}: PageStateProps) {
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
        const warning = tone === 'warning'
        return (
            <Frame className={cn(warning && 'border-warning/35 bg-warning/8')}>
                {warning ? (
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-ink" aria-hidden />
                ) : (
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                )}
                <div className="flex min-w-0 flex-col gap-3">
                    <div role={warning ? 'status' : 'alert'} className="flex min-w-0 flex-col gap-1">
                        <p className="font-medium">{pageStateHeading(status, words, tone)}</p>
                        <p className="text-xs break-words text-muted-foreground">
                            {typeof error === 'string' ? <ProseText text={error} /> : error}
                        </p>
                    </div>
                    {onRetry !== undefined && (
                        <Button size="sm" variant="outline" className="self-start" onClick={onRetry}>
                            <RotateCw aria-hidden />
                            {words.retry}
                        </Button>
                    )}
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
