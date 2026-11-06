import { PageHeader } from '../../components/PageHeader'
import type { ReactNode } from 'react'

import { Field } from '../../components/Field'
import { ISSUE_EDGE, worst, type Issue } from '../../components/IssueMark'
import { type DataColumn, DataTable } from '../../components/DataTable'
import { StatusChip, type Status } from '../../components/StatusChip'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { cn } from '../../lib/cn'
import { TidevannMark } from '../fixtures/TidevannMark'
import { TopBar } from '../../components/TopBar'
import { Stack } from '../../components/Layout'

interface Run {
    id: number
    job: string
    status: Status
    at: string
    took: string
}

const RUNS: Run[] = [
    { id: 4812, job: 'import-orders', status: 'succeeded', at: '2026-11-05 02:00', took: '1m 12s' },
    { id: 4811, job: 'import-orders', status: 'failed', at: '2026-11-04 02:00', took: '0m 41s' },
    { id: 4810, job: 'import-orders', status: 'succeeded', at: '2026-11-03 02:00', took: '1m 09s' },
    { id: 4809, job: 'import-orders', status: 'succeeded', at: '2026-11-02 02:00', took: '1m 15s' },
    { id: 4808, job: 'import-orders', status: 'cancelled', at: '2026-11-01 02:00', took: '0m 03s' },
    { id: 4807, job: 'import-orders', status: 'succeeded', at: '2026-10-31 02:00', took: '1m 11s' },
]

const RUN_COLUMNS: DataColumn<Run>[] = [
    { id: 'run', header: 'Run', width: '6rem', cell: (run) => <span className="font-mono text-xs">#{run.id}</span> },
    { id: 'state', header: 'State', width: '8rem', cell: (run) => <StatusChip status={run.status} /> },
    {
        id: 'started',
        header: 'Started',
        width: 'minmax(0,1fr)',
        cell: (run) => <span className="font-mono text-xs text-muted-foreground">{run.at}</span>,
    },
    {
        id: 'took',
        header: 'Took',
        width: '5rem',
        align: 'end',
        cell: (run) => <span className="font-mono text-xs text-muted-foreground">{run.took}</span>,
    },
]

/**
 * The page a dialog opens over: a job in the harbor project with its latest runs. Its one button
 * opens the dialog again once it has been closed.
 */
export function Behind({ action, onAction, children }: { action?: string; onAction?: () => void; children?: ReactNode }) {
    return (
        <Stack gap="none" className="h-svh bg-background text-foreground">
            <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
                <TidevannMark className="size-5 shrink-0 text-primary" />
                <TopBar
                    trail={[
                        { label: 'Tidevann', href: '#' },
                        { label: 'harbor', href: '#' },
                        { label: 'import-orders', code: true },
                    ]}
                    actions={
                        action === undefined ? undefined : (
                            <Button size="sm" variant="outline" onClick={onAction}>
                                {action}
                            </Button>
                        )
                    }
                />
            </header>
            {children ?? (
                <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6">
                    <Stack gap="2xs">
                        <PageHeader title="Import orders" />
                        <p className="text-sm text-muted-foreground">
                            Loads the monthly orders file into the warehouse, every night at 02:00 UTC.
                        </p>
                    </Stack>
                    <DataTable variant="list" columns={RUN_COLUMNS} rows={RUNS} rowKey={(run) => String(run.id)} className="max-w-3xl" />
                </main>
            )}
        </Stack>
    )
}

/**
 * A labeled input in the library's `Field`, which draws its issues as the mark at the input's end,
 * so the dialog keeps its height. `issueOpen` lets the footer's count open the mark.
 */
export function TextField({
    id,
    label,
    value,
    onChange,
    issues = [],
    issueOpen,
    onIssueOpenChange,
    hint,
    required,
    mono = false,
    type,
    placeholder,
    autoFocus,
    onEnter,
    onBlur,
}: {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    issues?: readonly Issue[]
    issueOpen?: boolean
    onIssueOpenChange?: (open: boolean) => void
    hint?: string
    required?: boolean
    mono?: boolean
    type?: string
    placeholder?: string
    autoFocus?: boolean
    onEnter?: () => void
    onBlur?: () => void
}) {
    const tone = worst(issues)
    return (
        <Field
            id={id}
            label={label}
            hint={hint}
            required={required}
            issues={issues}
            issueOpen={issueOpen}
            onIssueOpenChange={onIssueOpenChange}
        >
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
                onBlur={onBlur}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && onEnter !== undefined) onEnter()
                }}
                className={cn(mono && 'font-mono', tone !== null && ISSUE_EDGE[tone])}
            />
        </Field>
    )
}

/** Waits, as a request to the server would. */
export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
