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
    /** The button that reads again after a failure. */
    retry: string
}

const WORDS: PageStateWords = {
    loading: 'Loading',
    refused: 'The server refused this read',
    missing: 'Nothing is there',
    unreachable: 'The server is not answering',
    partRefused: 'Part of this page could not be read',
    retry: 'Try again',
}

/**
 * The heading over a failed read: a 404 is an absence and no answer is silence, not a refusal. In
 * the `warning` tone a refusal is said of a part of the page, not of the page.
 */
export function pageStateHeading(
    outcome: ReadOutcome | null | undefined,
    words: PageStateWords = WORDS,
    tone: PageStateTone = 'critical',
): string {
    if (outcome === 'unreachable') return words.unreachable
    if (outcome === 404) return words.missing
    return tone === 'warning' ? words.partRefused : words.refused
}

/**
 * The frame the three states share: a box that keeps its height inside a flex column, or, unframed,
 * the same row with no edge or ground of its own and a panel's padding, for a state inside a panel.
 */
function Frame({ children, framed, className }: { children: ReactNode; framed: boolean; className?: string }) {
    return (
        <div
            data-slot="page-state"
            className={cn(
                'flex shrink-0 items-start gap-3 text-sm',
                framed ? 'rounded-surface border border-border-strong bg-card px-4 py-6' : 'px-(--density-panel-pad) py-3',
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
    /** Each failure a refusal named, listed under the diagnostic, such as a problem document's errors. */
    problems?: readonly ReactNode[]
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
    /**
     * The element a failure's heading is: `h1` where the state stands in for a whole page, such as a
     * detail page whose record failed to load, so the page still has its heading; `h2` for a part
     * under the page's own; a plain line (`p`) otherwise.
     */
    headingLevel?: PageStateHeadingLevel
    /**
     * Draws the state in its own box (the default). `false` drops the box, for a state that sits in
     * a panel already: a table's `empty`, a section's body.
     */
    frame?: boolean
    words?: Partial<PageStateWords>
    children: ReactNode
}

/** The element a failed read's heading is drawn as. */
export type PageStateHeadingLevel = 'h1' | 'h2' | 'p'

/**
 * The states a read lands in, kept distinct all the way to the screen: loading, failed, empty, and
 * the content. A failure is headed by what the server answered, with its own diagnostic under the
 * heading; a string diagnostic has its backticked parts drawn in the code face. `onRetry` puts a
 * button that reads again under the diagnostic, as a dashboard panel's failure has one. `tone`
 * `warning` draws a failed read of secondary data, such as a side list beside the page's own
 * content, as a warning rather than the page's failure, announced politely rather than as an alert,
 * and a refusal headed as a part of the page that could not be read (`partRefused`).
 * `headingLevel="h1"` makes a failure's heading the page's own where the state stands in for the
 * whole page, so `Shell`'s `routeKey` has a heading to move the focus to. `problems` lists each
 * failure a refusal named under its diagnostic, and `frame={false}` drops the box for a state inside
 * a panel, such as a table's `empty`.
 */
export function PageState({
    loading,
    error,
    problems,
    status,
    empty = false,
    emptyMessage,
    emptyRender,
    onRetry,
    tone = 'critical',
    headingLevel: Heading = 'p',
    frame = true,
    words: given,
    children,
}: PageStateProps) {
    const words = { ...WORDS, ...given }
    if (loading) {
        return (
            <Frame framed={frame} className="items-center text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                <span role="status">{words.loading}</span>
            </Frame>
        )
    }
    if (error !== undefined && error !== null && error !== false) {
        const warning = tone === 'warning'
        return (
            <Frame framed={frame} className={cn(warning && 'border-warning/35 bg-warning/8')}>
                {warning ? (
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-ink" aria-hidden />
                ) : (
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                )}
                <div className="flex min-w-0 flex-col gap-3">
                    <div role={warning ? 'status' : 'alert'} className="flex min-w-0 flex-col gap-1">
                        <Heading className="font-medium">{pageStateHeading(status, words, tone)}</Heading>
                        <div className="text-xs break-words text-muted-foreground">
                            {typeof error === 'string' ? <ProseText text={error} /> : error}
                        </div>
                        {problems !== undefined && problems.length > 0 && (
                            <ul data-slot="page-state-problems" className="list-disc pl-4 text-xs break-words text-muted-foreground">
                                {problems.map((problem, index) => (
                                    <li key={index}>{typeof problem === 'string' ? <ProseText text={problem} /> : problem}</li>
                                ))}
                            </ul>
                        )}
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
        return (
            <Frame framed={frame} className="text-muted-foreground">
                {emptyMessage}
            </Frame>
        )
    }
    return <>{children}</>
}
