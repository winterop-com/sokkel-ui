import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Problem } from '@winterop-com/sokkel-ui/Problem'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { useCommands } from '@winterop-com/sokkel-ui/hooks/use-commands'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { RunGraph } from '@winterop-com/sokkel-ui-graph/RunGraph'
import { FileCode, History, Play, Square } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { Pane, RunLog } from '../editors/parts'
import { clock, counted, sayDuration, type Run } from '../model'
import { useStudio } from '../state'

const took = (run: Run) => (run.finished === undefined ? 'running' : sayDuration(run.finished - run.started))

const COLUMNS: DataColumn<Run>[] = [
    { id: 'number', header: 'Run', width: '5rem', cell: (run) => String(run.number), sortValue: (run) => run.number },
    { id: 'pipeline', header: 'Pipeline', width: 'minmax(10rem,1fr)', stack: 'primary', cell: (run) => run.pipeline, sortValue: (run) => run.pipeline },
    { id: 'project', header: 'Project', width: '7rem', stack: 'secondary', cell: (run) => run.project, sortValue: (run) => run.project },
    { id: 'state', header: 'State', width: '8rem', stack: 'secondary', cell: (run) => <StatusChip status={run.state} />, sortValue: (run) => run.state },
    {
        id: 'failed',
        header: 'Failed at',
        width: '7rem',
        stack: 'secondary',
        cell: (run) => run.failed?.step ?? '',
        sortValue: (run) => run.failed?.step ?? '',
    },
    { id: 'started', header: 'Started', width: '6rem', align: 'end', cell: (run) => clock(run.started), sortValue: (run) => run.started },
    { id: 'took', header: 'Took', width: '6rem', align: 'end', cell: took, sortValue: (run) => (run.finished ?? Date.now()) - run.started },
    { id: 'draft', header: 'From', width: '7rem', stack: 'secondary', cell: (run) => (run.draft ? 'unsaved' : 'saved') },
]

/** Every run started in the studio, newest first; a running one moves as it goes. */
export function RunsPage() {
    const { runs, files, open } = useStudio()
    const [query, setQuery] = useState('')
    const typed = query.trim().toLowerCase()
    const shown = typed === '' ? runs : runs.filter((run) => `${run.pipeline} ${run.project} ${run.state} ${run.failed?.step ?? ''}`.includes(typed))
    const first = files.find((file) => file.kind === 'pipeline')
    return (
        <Stack gap="page" className="h-full min-h-0">
            <PageHeader title="Runs" count={runs.length} description="The pipelines run from the studio, each with its steps and its log." />
            {runs.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>No runs yet</EmptyTitle>
                        <EmptyDescription>Open a pipeline and press Run, or Cmd/Ctrl+Enter in its editor.</EmptyDescription>
                    </EmptyHeader>
                    {first !== undefined && (
                        <Button size="sm" variant="outline" onClick={() => open(first.id)}>
                            <FileCode aria-hidden />
                            Open {first.name}
                        </Button>
                    )}
                </Empty>
            ) : (
                <DataTable
                    className="min-h-0 flex-1"
                    columns={COLUMNS}
                    rows={shown}
                    rowKey={(run) => run.id}
                    search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                    onOpen={(run) => go(`/runs/${run.id}`)}
                    words={{ rows: (count) => counted(count, 'run') }}
                    empty="No run matches."
                    minWidth="44rem"
                />
            )}
        </Stack>
    )
}

/** One run: how it stands, its steps as a graph and its log with the failing step marked. */
export function RunPage({ id }: { id: string }) {
    const { runs, byId, open, run: start, cancel, loading } = useStudio()
    const run = runs.find((one) => one.id === id)
    const [chosen, setChosen] = useState<string | null>(null)
    const file = run === undefined ? undefined : byId.get(run.file)
    const going = run?.state === 'running'

    const again = () => {
        if (file === undefined) return
        void start(file.id).then((made) => made !== undefined && go(`/runs/${made.id}`))
    }

    useCommands(
        run === undefined
            ? []
            : [
                  {
                      title: `Run ${String(run.number)}`,
                      commands: [
                          going
                              ? { id: 'run-cancel', label: 'Cancel this run', icon: Square, onSelect: () => cancel(run) }
                              : {
                                    id: 'run-again',
                                    label: 'Run the pipeline again',
                                    icon: Play,
                                    disabled: file === undefined ? 'The pipeline was deleted.' : false,
                                    onSelect: again,
                                },
                          {
                              id: 'run-file',
                              label: 'Open the pipeline',
                              icon: FileCode,
                              disabled: file === undefined ? 'The pipeline was deleted.' : false,
                              onSelect: () => file && open(file.id),
                          },
                      ],
                  },
              ],
        [run?.id, going, file?.id],
    )

    if (run === undefined)
        return loading ? null : (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>No such run</EmptyTitle>
                    <EmptyDescription>It may be from before the demo data was reset.</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" variant="outline" onClick={() => go('/runs')}>
                    <History aria-hidden />
                    All runs
                </Button>
            </Empty>
        )

    return (
        <Stack gap="page" className="h-full min-h-0">
            <PageHeader
                title={run.pipeline}
                code={`run ${String(run.number)}`}
                trail={[{ label: 'Runs', href: '#/runs' }, { label: `Run ${String(run.number)}` }]}
                meta={
                    <MetaLine
                        items={[
                            <StatusChip key="state" status={run.state} />,
                            run.project,
                            `started ${clock(run.started)} by ${run.by}`,
                            took(run),
                            run.draft ? 'from unsaved changes' : 'from the saved file',
                        ]}
                    />
                }
                actions={
                    <>
                        <Button size="sm" variant="outline" reason={file === undefined ? 'The pipeline was deleted.' : undefined} onClick={() => file && open(file.id)}>
                            <FileCode aria-hidden />
                            Open pipeline
                        </Button>
                        {going ? (
                            <Button size="sm" variant="outline" onClick={() => cancel(run)}>
                                <Square aria-hidden />
                                Cancel
                            </Button>
                        ) : (
                            <Button size="sm" reason={file === undefined ? 'The pipeline was deleted.' : undefined} onClick={again}>
                                <Play aria-hidden />
                                Run again
                            </Button>
                        )}
                    </>
                }
            />
            {run.failed !== undefined && (
                <Problem title={`${run.failed.step} failed`} detail="The steps after it were skipped; notify steps still ran." technical={run.failed.reason} />
            )}
            <SplitPane
                id="studio-run"
                direction="down"
                defaultShare={0.45}
                className="min-h-0 flex-1"
                first={
                    <Pane title="Steps" meta={going ? 'live' : counted(run.steps.length, 'step')}>
                        <RunGraph
                            steps={run.steps.map((step) => ({
                                code: step.id,
                                kind: step.kind,
                                needs: step.needs,
                                status: step.state,
                                duration_ms: step.duration_ms,
                            }))}
                            selected={chosen}
                            onSelect={setChosen}
                            words={{ label: `${run.pipeline} run ${String(run.number)}` }}
                        />
                    </Pane>
                }
                second={
                    <Pane title="Log" meta={counted(run.log.length, 'line')}>
                        <RunLog run={run} />
                    </Pane>
                }
            />
        </Stack>
    )
}
