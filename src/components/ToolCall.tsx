import { CircleAlert, Wrench } from 'lucide-react'

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
 * list, a scalar as itself. `{ code: 'weather-gate', limit: 20, since: '…' }` reads
 * `code: "weather-gate", limit: 20, since: "…"`.
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
}

function Line({ call }: { call: ToolCallEntry }) {
    const status = call.status === 'done' ? undefined : call.status
    return (
        <TraceLine status={status} className="font-mono text-xs">
            <TraceIcon>
                {call.status === 'running' ? (
                    <Spinner className="size-3.5" />
                ) : call.status === 'error' ? (
                    <CircleAlert className="size-3.5" />
                ) : (
                    <Wrench className="size-3.5" />
                )}
            </TraceIcon>
            <TraceTitle>
                <span className="text-foreground">{call.name}</span>
                <span>({digest(call.args)})</span>
            </TraceTitle>
            {call.duration !== undefined && <TraceDescription>{call.duration}</TraceDescription>}
        </TraceLine>
    )
}

/**
 * The tools an assistant called, one line each: the name, its arguments in one line, and how long
 * it took. A call that has finished opens into its arguments and its result in full.
 */
export function ToolCalls({
    calls,
    words = { args: 'Arguments', result: 'Result' },
}: {
    calls: readonly ToolCallEntry[]
    words?: { args: string; result: string }
}) {
    return (
        <Trace>
            {calls.map((call) =>
                call.status === 'done' || call.status === 'error' ? (
                    <TraceCollapsible key={call.id}>
                        <TraceCollapsibleTrigger>
                            <Line call={call} />
                        </TraceCollapsibleTrigger>
                        <TraceCollapsibleContent>
                            <div className="flex flex-col gap-2">
                                {call.args !== undefined && (
                                    <Code title={words.args} size="sm" language="json" value={JSON.stringify(call.args, null, 2)} />
                                )}
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
