import { DataTable, type DataSort } from '@winterop-com/sokkel-ui/DataTable'
import { FilterBar, type Filter, type FilterField } from '@winterop-com/sokkel-ui/FilterBar'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SavedViews, type SavedView } from '@winterop-com/sokkel-ui/SavedViews'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { filterRows } from '@winterop-com/sokkel-ui/lib/filters'
import { EMPTY_VIEW, type ListViewState } from '@winterop-com/sokkel-ui/lib/list-views'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { ChevronDown, Play, RotateCcwIcon, XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { useActions } from '../actions'
import { views } from '../backend'
import { counted, PEOPLE, PROJECTS, STATES } from '../model'
import { runColumns, runMenu } from '../parts'
import { useConsole, type LiveRun } from '../state'
import { isLive } from '../timeline'

const COLUMN_IDS = ['id', 'job', 'project', 'state', 'step', 'by', 'started', 'duration']

function fieldsOf(jobs: readonly string[]): FilterField<LiveRun>[] {
    return [
        { id: 'job', label: 'Job', type: 'set', options: jobs.map((job) => ({ value: job })), value: (run) => [run.job] },
        {
            id: 'state',
            label: 'State',
            type: 'set',
            options: STATES.map((state) => ({ value: state, row: <StatusChip status={state} /> })),
            value: (run) => [run.at.state],
        },
        {
            id: 'project',
            label: 'Project',
            type: 'set',
            options: PROJECTS.map((project) => ({ value: project })),
            value: (run) => [run.project],
        },
        {
            id: 'by',
            label: 'Started by',
            type: 'set',
            options: [...PEOPLE, 'schedule'].map((by) => ({ value: by })),
            value: (run) => [run.by],
        },
        { id: 'step', label: 'Step', type: 'text', value: (run) => run.at.step ?? '' },
        { id: 'started', label: 'Started', type: 'date', value: (run) => new Date(run.created) },
        { id: 'duration', label: 'Duration', type: 'number', unit: 's', value: (run) => Math.round(run.at.duration / 1000) },
    ]
}

/** Every run, newest first: searched, filtered, sorted and kept as saved views; a run opens beside the list or on its page. */
export function Runs() {
    const { runs, jobs, now, prefs, loading } = useConsole()
    const actions = useActions()
    const saved = useCollection(views)
    const [viewId, setViewId] = useState<string | null>('all')
    const [filters, setFilters] = useState<readonly Filter[]>([])
    const [sort, setSort] = useState<DataSort | null>(null)
    const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
    const [order, setOrder] = useState<readonly string[]>([])
    const [widths, setWidths] = useState<Readonly<Record<string, number>>>({})
    const [query, setQuery] = useState('')
    const [selection, setSelection] = useState<ReadonlySet<string>>(new Set())

    const jobIds = useMemo(() => [...new Set([...jobs.map((job) => job.id), ...runs.map((run) => run.job)])].sort(), [jobs, runs])
    const fields = useMemo(() => fieldsOf(jobIds), [jobIds])
    const shown = useMemo(() => {
        const kept = filterRows(runs, filters, fields)
        const wanted = query.trim().toLowerCase()
        return wanted === '' ? kept : kept.filter((run) => `${run.id} ${run.job} ${run.project}`.includes(wanted))
    }, [runs, filters, fields, query])

    const current: ListViewState = { filters, sort, hidden: [...hidden], order, widths }
    const apply = (state: ListViewState) => {
        setFilters(state.filters)
        setSort(state.sort)
        setHidden(new Set(state.hidden))
        setOrder(state.order)
        setWidths(state.widths)
    }
    const list: SavedView[] = saved.rows ?? []
    const failed = (what: string) => (error: unknown) => toast.add({ type: 'error', title: what, description: String(error) })

    const going = (ids: ReadonlySet<string>) => runs.filter((run) => ids.has(run.id) && isLive(run.at.state))
    const finished = (ids: ReadonlySet<string>) => runs.filter((run) => ids.has(run.id) && !isLive(run.at.state))
    const quick = jobs.filter((job) => !job.paused)

    return (
        <>
            <PageHeader
                title="Runs"
                count={counted(runs.length, 'run')}
                actions={
                    <>
                        <SavedViews
                            views={list}
                            value={viewId}
                            current={current}
                            columns={COLUMN_IDS}
                            onValueChange={(picked) => {
                                setViewId(picked.id)
                                apply(picked.state)
                            }}
                            onSave={(next) =>
                                void views.update(next.id, { name: next.name, state: next.state }).catch(failed('Could not save the view'))
                            }
                            onSaveNew={(name, state) =>
                                void views.create({ name, state }).then((made) => setViewId(made.id), failed('Could not save the view'))
                            }
                            onRename={(view, name) => void views.update(view.id, { name }).catch(failed('Could not rename the view'))}
                            onDelete={(view) =>
                                void views.remove(view.id).then(() => {
                                    setViewId('all')
                                    apply(EMPTY_VIEW)
                                }, failed('Could not delete the view'))
                            }
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button size="sm" disabled={quick.length === 0} />}>
                                <Play aria-hidden />
                                Run a job
                                <ChevronDown aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {quick.map((job) => (
                                    <DropdownMenuItem key={job.id} onClick={() => actions.runNow(job)}>
                                        <span className="font-mono">{job.id}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
            />
            <DataTable
                className="min-h-0 flex-1"
                columns={runColumns(now, prefs.times)}
                rows={shown}
                rowKey={(run) => run.id}
                loading={loading}
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                toolbar={<FilterBar fields={fields} filters={filters} onFiltersChange={setFilters} />}
                sort={sort}
                onSortChange={setSort}
                hiddenColumns={hidden}
                onHiddenColumnsChange={setHidden}
                columnOrder={order}
                onColumnOrderChange={setOrder}
                columnWidths={widths}
                onColumnWidthsChange={setWidths}
                selectable
                selection={selection}
                onSelectionChange={setSelection}
                bulkActions={(ids, clear) => (
                    <>
                        <Button
                            size="sm"
                            variant="outline"
                            reason={finished(ids).length === 0 ? 'None of these has finished.' : undefined}
                            onClick={() => {
                                for (const run of finished(ids)) actions.retry(run)
                                clear()
                            }}
                        >
                            <RotateCcwIcon aria-hidden />
                            Retry {finished(ids).length}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            reason={going(ids).length === 0 ? 'None of these is going.' : undefined}
                            onClick={() => {
                                actions.cancel(going(ids))
                                clear()
                            }}
                        >
                            <XIcon aria-hidden />
                            Cancel {going(ids).length}
                        </Button>
                    </>
                )}
                rowActions={(run) => runMenu(run, actions)}
                onOpen={actions.open}
                opened={(run) => run.id === actions.opened}
                words={{ rows: (count) => counted(count, 'run') }}
                minWidth="48rem"
            />
        </>
    )
}
