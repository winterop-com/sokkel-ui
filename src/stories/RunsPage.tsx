import { BookOpen, CalendarClock, ChevronDown, Filter, Library, Play, Search, Server, Webhook, Workflow, X } from 'lucide-react'

/**
 * A list page drawn on the tokens alone, to compare the three densities before any component
 * exists: the shell's rail and top bar, a page header, a toolbar, a listing with its column bar,
 * and an open side panel. Every distance on it is a density token.
 */
const RUNS = [
    { id: '01a1a5c6', job: 'nightly-export', status: 'succeeded', step: null, at: '2 min ago', took: '1.4s' },
    { id: '01a1a5c2', job: 'import-orders', status: 'failed', step: 'validate', at: '6 min ago', took: '0.3s' },
    { id: '01a1a5b9', job: 'sync-inventory', status: 'running', step: 'transform', at: '7 min ago', took: '-' },
    { id: '01a1a5b1', job: 'rebuild-index', status: 'succeeded', step: null, at: '12 min ago', took: '8.2s' },
    { id: '01a1a5a7', job: 'send-digest', status: 'completed_with_errors', step: 'notify', at: '14 min ago', took: '2.9s' },
    { id: '01a1a59e', job: 'rebuild-index', status: 'queued', step: null, at: '15 min ago', took: '-' },
    { id: '01a1a591', job: 'nightly-export', status: 'cancelled', step: 'upload', at: '21 min ago', took: '4.0s' },
    { id: '01a1a588', job: 'sync-inventory', status: 'succeeded', step: null, at: '33 min ago', took: '19.5s' },
]

const STATUS: Record<string, string> = {
    succeeded: 'bg-status-succeeded/15 text-status-succeeded-ink',
    failed: 'bg-status-failed/15 text-status-failed-ink',
    running: 'bg-status-running/15 text-status-running-ink',
    queued: 'bg-status-queued/15 text-status-queued-ink',
    cancelled: 'bg-status-cancelled/15 text-status-cancelled-ink',
    completed_with_errors: 'bg-status-completed-with-errors/15 text-status-completed-with-errors-ink',
}

const NAV = [
    [
        'Operate',
        [
            ['Runs', Play],
            ['Schedules', CalendarClock],
        ],
    ],
    [
        'Build',
        [
            ['Jobs', Workflow],
            ['Services', Server],
            ['Webhooks', Webhook],
        ],
    ],
    [
        'Reference',
        [
            ['Docs', BookOpen],
            ['Examples', Library],
        ],
    ],
] as const

export function RunsPage() {
    return (
        <div className="flex h-screen min-h-0 bg-background text-foreground">
            <aside className="flex w-56 shrink-0 flex-col border-r border-border-strong bg-sidebar">
                <div className="flex h-shell-top items-center px-(--density-panel-pad) font-semibold">atlas</div>
                <nav className="flex flex-col gap-1 px-2">
                    {NAV.map(([group, items]) => (
                        <div key={group}>
                            <p className="px-2 pt-4 pb-1.5 text-xs font-medium tracking-wide text-faint uppercase">{group}</p>
                            {items.map(([item, Icon]) => (
                                <a
                                    key={item}
                                    className={
                                        item === 'Runs'
                                            ? 'flex h-(--density-row) items-center gap-3 rounded-l-sm rounded-r-md border-l-2 border-sidebar-primary bg-sidebar-accent px-3 text-sm font-medium'
                                            : 'flex h-(--density-row) items-center gap-3 rounded-l-sm rounded-r-md border-l-2 border-transparent px-3 text-sm text-muted-foreground hover:bg-secondary'
                                    }
                                >
                                    <Icon className="size-4 shrink-0" aria-hidden />
                                    {item}
                                </a>
                            ))}
                        </div>
                    ))}
                </nav>
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-shell-top shrink-0 items-center gap-2 border-b border-border-strong px-(--density-page-inset) text-sm text-muted-foreground">
                    <span>Runs</span>
                    <span className="ml-auto font-mono text-xs">atlas 1.4.0</span>
                </header>
                <main className="flex min-h-0 flex-1 flex-col gap-(--density-page-gap) overflow-y-auto px-(--density-page-inset) pt-(--density-page-top) pb-10">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <h1 className="text-page font-medium tracking-tight">Runs</h1>
                            <p className="font-mono text-xs text-muted-foreground">8 loaded</p>
                        </div>
                        <button className="h-(--density-control) rounded-control bg-primary px-3 text-sm font-medium text-primary-foreground">
                            Run a job
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="flex h-(--density-control) w-64 items-center gap-2 rounded-control border border-input bg-field px-2.5 text-sm">
                            <Search className="size-4 text-faint" aria-hidden />
                            <input
                                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
                                placeholder="Search runs"
                            />
                            <kbd className="font-mono text-xs text-faint">/</kbd>
                        </label>
                        <button className="flex h-(--density-control) items-center gap-1.5 rounded-control border border-input bg-field px-2.5 text-sm">
                            <Filter className="size-3.5 text-faint" aria-hidden /> Status: failed
                            <X className="size-3.5 text-faint" aria-hidden />
                        </button>
                        <button className="flex h-(--density-control) items-center gap-1.5 rounded-control border border-dashed border-input px-2.5 text-sm text-muted-foreground">
                            Job <ChevronDown className="size-3.5" aria-hidden />
                        </button>
                    </div>
                    <div className="flex min-h-0 gap-(--density-page-gap)">
                        <section className="min-w-0 flex-1 overflow-hidden rounded-surface border border-border-strong bg-card">
                            <div className="grid h-(--density-panel-head) grid-cols-[6rem_1fr_9rem_7rem_5rem] items-center gap-3 border-b border-border-strong bg-panel-ground px-(--density-panel-pad) text-xs font-medium text-muted-foreground">
                                <span>Run</span>
                                <span>Job</span>
                                <span>Status</span>
                                <span>Started</span>
                                <span className="text-right">Took</span>
                            </div>
                            {RUNS.map((run, at) => (
                                <div
                                    key={run.id}
                                    className={`grid h-(--density-row) grid-cols-[6rem_1fr_9rem_7rem_5rem] items-center gap-3 border-b border-border px-(--density-panel-pad) text-sm last:border-b-0 ${at === 1 ? 'bg-secondary' : 'hover:bg-secondary/60'}`}
                                >
                                    <span className="font-mono text-xs text-muted-foreground">{run.id}</span>
                                    <span className="truncate">
                                        {run.job}
                                        {run.step !== null && <span className="text-faint"> at {run.step}</span>}
                                    </span>
                                    <span>
                                        <span className={`rounded-chip px-1.5 py-0.5 text-xs ${STATUS[run.status]}`}>
                                            {run.status.replaceAll('_', ' ')}
                                        </span>
                                    </span>
                                    <span className="text-xs text-muted-foreground">{run.at}</span>
                                    <span className="text-right font-mono text-xs">{run.took}</span>
                                </div>
                            ))}
                        </section>
                        <aside className="w-80 shrink-0 overflow-hidden rounded-surface border border-border-strong bg-card">
                            <div className="flex h-(--density-panel-head) items-center border-b border-border-strong bg-panel-ground px-(--density-panel-pad) text-sm font-medium">
                                Run 01a1a5c2
                            </div>
                            <div className="flex flex-col gap-(--density-section-gap) p-(--density-panel-pad) text-sm">
                                <p>
                                    <span className="rounded-chip bg-status-failed/15 px-1.5 py-0.5 text-xs text-status-failed-ink">
                                        failed
                                    </span>{' '}
                                    at <span className="font-mono">validate</span>
                                </p>
                                <div className="rounded-control border border-critical/35 bg-critical/10 p-(--density-panel-pad) text-critical-ink">
                                    at $.amount: &apos;n/a&apos; does not match &apos;^[0-9]+[.][0-9]{'{2}'}$&apos;
                                </div>
                                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                                    <dt className="text-muted-foreground">job</dt>
                                    <dd>import-orders</dd>
                                    <dt className="text-muted-foreground">started by</dt>
                                    <dd>ada (API token)</dd>
                                    <dt className="text-muted-foreground">took</dt>
                                    <dd className="font-mono">0.3s</dd>
                                </dl>
                            </div>
                        </aside>
                    </div>
                </main>
            </div>
        </div>
    )
}
