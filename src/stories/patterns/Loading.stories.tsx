import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { LoadingBar, LoadingOverlay, PageProgress } from '../../components/Loaders'
import { Section } from '../../components/Section'
import { StatusChip, type Status } from '../../components/StatusChip'
import { Button } from '../../components/ui/button'

/**
 * Waits that take a while: a bar with known or unknown progress, the bar along the top of a page
 * while it loads, and an element dimmed under a bar while it loads again. The page and element
 * loaders appear only after a short delay, so a fast answer shows nothing.
 */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-3xl flex-col gap-6">{children}</div>
        </div>
    )
}

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

function Bars() {
    return (
        <Ground>
            <Caption>unknown progress</Caption>
            <LoadingBar />
            <Caption>known progress, 35% and 80%</Caption>
            <LoadingBar value={35} />
            <LoadingBar value={80} />
            <Caption>quiet, on a muted track</Caption>
            <LoadingBar tone="muted" />
        </Ground>
    )
}

const RUNS: { id: string; job: string; state: Status; took: string }[] = [
    { id: 'r1', job: 'import-orders', state: 'running', took: '1m 12s' },
    { id: 'r2', job: 'nightly-export', state: 'failed', took: '4.2s' },
    { id: 'r3', job: 'rebuild-index', state: 'succeeded', took: '6m 03s' },
    { id: 'r4', job: 'send-digest', state: 'succeeded', took: '12.8s' },
]

function Rows() {
    return (
        <ul className="divide-y divide-border">
            {RUNS.map((run) => (
                <li key={run.id} className="grid grid-cols-[minmax(0,1fr)_7rem_4rem] items-center gap-3 px-3 py-2 text-sm">
                    <span className="truncate font-mono">{run.job}</span>
                    <span>
                        <StatusChip status={run.state} />
                    </span>
                    <span className="text-right text-muted-foreground tabular-nums">{run.took}</span>
                </li>
            ))}
        </ul>
    )
}

function PageLoad() {
    return (
        <div className="flex min-h-svh flex-col bg-background text-foreground">
            <header className="relative flex h-shell-top shrink-0 items-center border-b border-border-strong bg-sidebar px-4 text-sm font-medium">
                Runs
                <PageProgress loading delay={0} value={60} />
            </header>
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
                <Section title="Runs" flush>
                    <Rows />
                </Section>
            </div>
        </div>
    )
}

function ElementReload({ interactive = false }: { interactive?: boolean }) {
    const [loading, setLoading] = useState(!interactive)
    return (
        <Ground>
            {interactive && (
                <div className="flex items-center gap-3">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setLoading(true)
                            setTimeout(() => setLoading(false), 2000)
                        }}
                    >
                        Refresh
                    </Button>
                    <Caption>The bar appears only if the refresh takes longer than 300ms.</Caption>
                </div>
            )}
            <LoadingOverlay loading={loading} delay={interactive ? 300 : 0} className="rounded-surface">
                <Section title="Runs" meta="248 today" flush>
                    <Rows />
                </Section>
            </LoadingOverlay>
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/Loading' }
export default meta

export const Bars_: StoryObj = { name: 'Bars', render: () => <Bars /> }
export const Page: StoryObj = { name: 'Page load', render: () => <PageLoad /> }
export const Element: StoryObj = { name: 'Element reload', render: () => <ElementReload /> }
export const Try: StoryObj = { name: 'Try it', render: () => <ElementReload interactive /> }
