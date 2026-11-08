import { CircleAlert, ListChecks, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'

import { Code } from './Code'
import { Spinner } from './ui/spinner'
import {
    Trace,
    TraceCollapsible,
    TraceCollapsibleContent,
    TraceCollapsibleTrigger,
    TraceDescription,
    TraceIcon,
    TraceLine,
    TraceTitle,
} from './ui/trace'

function clip(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** One value inside a digest: a string clipped, a list counted, an object elided. */
function brief(value: unknown): string {
    if (Array.isArray(value)) return `[${value.length}]`
    if (value !== null && typeof value === 'object') return '{…}'
    if (typeof value === 'string') return JSON.stringify(clip(value, 32))
    return String(value)
}

/**
 * A payload said in one line: the first three `key: value` pairs of an object, the length of a
 * list, a scalar as itself. `{ code: 'import-orders', limit: 20, since: '…' }` reads
 * `code: "import-orders", limit: 20, since: "…"`.
 */
export function digest(payload: unknown, pairs = 3): string {
    if (payload === undefined) return ''
    if (Array.isArray(payload)) return `[${payload.length} items]`
    if (payload === null || typeof payload !== 'object') return brief(payload)
    const entries = Object.entries(payload as Record<string, unknown>)
    const shown = entries.slice(0, pairs).map(([key, value]) => `${key}: ${brief(value)}`)
    return entries.length > pairs ? `${shown.join(', ')}, …` : shown.join(', ')
}

export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error'

/** A tool an assistant called. */
export interface ToolCallEntry {
    id: string
    name: string
    args?: unknown
    result?: unknown
    status: ToolCallStatus
    /** How long it took, already written for a reader: `1.2s`. */
    duration?: string
    /**
     * What the call did, said for a reader: "Read latest run", or what it found: "37 rows rejected".
     * A labeled call reads as that sentence in the text face; its name and payload wait inside it.
     */
    label?: string
}

function Line({ call }: { call: ToolCallEntry }) {
    const status = call.status === 'done' ? undefined : call.status
    const labeled = call.label !== undefined
    return (
        <TraceLine status={status} className={labeled ? undefined : 'font-mono text-xs'}>
            <TraceIcon>
                {call.status === 'running' ? (
                    <Spinner className={labeled ? 'size-4' : 'size-3.5'} />
                ) : call.status === 'error' ? (
                    <CircleAlert className={labeled ? 'size-4' : 'size-3.5'} />
                ) : (
                    <Wrench className={labeled ? 'size-4' : 'size-3.5'} />
                )}
            </TraceIcon>
            <TraceTitle>
                {labeled ? (
                    <span className="text-foreground">{call.label}</span>
                ) : (
                    <>
                        <span className="text-foreground">{call.name}</span>
                        <span>({digest(call.args)})</span>
                    </>
                )}
            </TraceTitle>
            {call.duration !== undefined && <TraceDescription>{call.duration}</TraceDescription>}
        </TraceLine>
    )
}

function Detail({ call, words }: { call: ToolCallEntry; words: ToolCallsWords }) {
    return (
        <div className="flex flex-col gap-2">
            {call.label !== undefined && (
                <p className="font-mono text-xs text-muted-foreground">
                    <span className="text-foreground">{call.name}</span>({digest(call.args)})
                </p>
            )}
            {call.args !== undefined && <Code title={words.args} size="sm" language="json" value={JSON.stringify(call.args, null, 2)} />}
            {call.result !== undefined && (
                <Code
                    title={words.result}
                    size="sm"
                    language="json"
                    variant={call.status === 'error' ? 'destructive' : 'default'}
                    value={typeof call.result === 'string' ? call.result : JSON.stringify(call.result, null, 2)}
                />
            )}
        </div>
    )
}

export interface ToolCallsWords {
    args: string
    result: string
}

function Calls({ calls, words, openFailed }: { calls: readonly ToolCallEntry[]; words: ToolCallsWords; openFailed: boolean }) {
    return (
        <Trace>
            {calls.map((call) =>
                call.status === 'done' || call.status === 'error' ? (
                    <TraceCollapsible key={call.id} defaultOpen={openFailed && call.status === 'error'}>
                        <TraceCollapsibleTrigger>
                            <Line call={call} />
                        </TraceCollapsibleTrigger>
                        <TraceCollapsibleContent>
                            <Detail call={call} words={words} />
                        </TraceCollapsibleContent>
                    </TraceCollapsible>
                ) : (
                    <div key={call.id}>
                        <Line call={call} />
                    </div>
                ),
            )}
        </Trace>
    )
}

const WORDS: ToolCallsWords = {
    args: 'Arguments',
    result: 'Result',
}

/**
 * The tools an assistant called, one line each: the name, its arguments in one line, and how long
 * it took. A call that has finished opens into its arguments and its result in full.
 *
 * Given a `summary`, the calls fold behind that one quiet line, which opens into them: "Checked the
 * run, log, and sample · 3 tools". The line takes a spinner while a call runs and the destructive
 * ink once one has failed; then it starts open, with the failed call open inside it.
 */
export function ToolCalls({
    calls,
    summary,
    defaultOpen,
    words: given,
}: {
    calls: readonly ToolCallEntry[]
    /** One line that stands for every call and opens into them, written from the calls' state. */
    summary?: ReactNode
    /** Whether the folded calls start open; by default only when one has failed. */
    defaultOpen?: boolean
    words?: Partial<ToolCallsWords>
}) {
    const words = { ...WORDS, ...given }
    if (summary === undefined) return <Calls calls={calls} words={words} openFailed={false} />
    const running = calls.some((call) => call.status === 'running' || call.status === 'pending')
    const failed = calls.some((call) => call.status === 'error')
    return (
        <Trace>
            <TraceCollapsible defaultOpen={defaultOpen ?? failed}>
                <TraceCollapsibleTrigger>
                    <TraceLine status={failed ? 'error' : running ? 'running' : undefined}>
                        <TraceIcon>{failed ? <CircleAlert /> : running ? <Spinner /> : <ListChecks />}</TraceIcon>
                        <TraceTitle className="whitespace-normal">{summary}</TraceTitle>
                    </TraceLine>
                </TraceCollapsibleTrigger>
                <TraceCollapsibleContent>
                    <Calls calls={calls} words={words} openFailed={failed} />
                </TraceCollapsibleContent>
            </TraceCollapsible>
        </Trace>
    )
}
