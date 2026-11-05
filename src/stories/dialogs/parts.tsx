import { PageHeader } from '../../components/PageHeader'
import type { ReactNode } from 'react'

import { Field } from '../../components/Field'
import { ISSUE_EDGE, IssueMark, worst, type Issue } from '../../components/IssueMark'
import { StatusChip, type Status } from '../../components/StatusChip'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { cn } from '../../lib/cn'
import { TidevannMark } from '../fixtures/TidevannMark'

const RUNS: { id: number; job: string; status: Status; at: string; took: string }[] = [
    { id: 4812, job: 'import-orders', status: 'succeeded', at: '2026-11-05 02:00', took: '1m 12s' },
    { id: 4811, job: 'import-orders', status: 'failed', at: '2026-11-04 02:00', took: '0m 41s' },
    { id: 4810, job: 'import-orders', status: 'succeeded', at: '2026-11-03 02:00', took: '1m 09s' },
    { id: 4809, job: 'import-orders', status: 'succeeded', at: '2026-11-02 02:00', took: '1m 15s' },
    { id: 4808, job: 'import-orders', status: 'cancelled', at: '2026-11-01 02:00', took: '0m 03s' },
    { id: 4807, job: 'import-orders', status: 'succeeded', at: '2026-10-31 02:00', took: '1m 11s' },
]

/**
 * The page a dialog opens over: a job in the harbor project with its latest runs. Its one button
 * opens the dialog again once it has been closed.
 */
export function Behind({ action, onAction, children }: { action?: string; onAction?: () => void; children?: ReactNode }) {
    return (
        <div className="flex h-svh flex-col bg-background text-foreground">
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
                <TidevannMark className="size-5 text-primary" />
                <span className="font-medium">Tidevann</span>
                <span className="text-faint">/</span>
                <span className="text-muted-foreground">harbor</span>
                <span className="text-faint">/</span>
                <span className="font-mono text-xs">import-orders</span>
                {action !== undefined && (
                    <Button size="sm" variant="outline" className="ml-auto" onClick={onAction}>
                        {action}
                    </Button>
                )}
            </header>
            {children ?? (
                <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6">
                    <div className="flex flex-col gap-1">
                        <PageHeader title="Import orders" />
                        <p className="text-sm text-muted-foreground">
                            Loads the monthly orders file into the warehouse, every night at 02:00 UTC.
                        </p>
                    </div>
                    <table className="w-full max-w-3xl text-sm">
                        <thead className="text-left text-xs text-muted-foreground">
                            <tr className="border-b border-border">
                                <th className="py-2 font-medium">Run</th>
                                <th className="py-2 font-medium">State</th>
                                <th className="py-2 font-medium">Started</th>
                                <th className="py-2 text-right font-medium">Took</th>
                            </tr>
                        </thead>
                        <tbody>
                            {RUNS.map((run) => (
                                <tr key={run.id} className="border-b border-border">
                                    <td className="py-2 font-mono text-xs">#{run.id}</td>
                                    <td className="py-2">
                                        <StatusChip status={run.status} />
                                    </td>
                                    <td className="py-2 font-mono text-xs text-muted-foreground">{run.at}</td>
                                    <td className="py-2 text-right font-mono text-xs text-muted-foreground">{run.took}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </main>
            )}
        </div>
    )
}

/** A labeled input whose issues show as the mark inside it, so the dialog keeps its height. */
export function TextField({
    id,
    label,
    value,
    onChange,
    issues = [],
    hint,
    required,
    mono = false,
    type,
    placeholder,
    autoFocus,
    onEnter,
}: {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    issues?: readonly Issue[]
    hint?: string
    required?: boolean
    mono?: boolean
    type?: string
    placeholder?: string
    autoFocus?: boolean
    onEnter?: () => void
}) {
    const tone = worst(issues)
    return (
        <Field id={id} label={label} hint={hint} required={required}>
            <div className="relative">
                <Input
                    id={id}
                    type={type}
                    value={value}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    spellCheck={mono ? false : undefined}
                    autoComplete="off"
                    aria-invalid={tone === 'critical' || undefined}
                    onChange={(event) => onChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && onEnter !== undefined) onEnter()
                    }}
                    className={cn(mono && 'font-mono', tone !== null && cn('pr-9', ISSUE_EDGE[tone]))}
                />
                <IssueMark issues={issues} />
            </div>
        </Field>
    )
}

/** Waits, as a request to the server would. */
export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
