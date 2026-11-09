import { RunGraph } from '@winterop-com/sokkel-ui-graph/RunGraph'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { JsonTree } from '@winterop-com/sokkel-ui/JsonTree'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { LogView } from '@winterop-com/sokkel-ui/LogView'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Problem } from '@winterop-com/sokkel-ui/Problem'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Timeline } from '@winterop-com/sokkel-ui/Timeline'
import { useCommands } from '@winterop-com/sokkel-ui/hooks/use-commands'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Search as SearchIcon, ListChecks, RotateCcwIcon, XIcon } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { useActions } from '../actions'
import { outputsOf, runLog } from '../logs'
import { sayBy, stamp, took } from '../model'
import { stepEvents } from '../parts'
import { RunButtons, runFacts } from '../RunPanel'
import { useConsole } from '../state'
import { isLive } from '../timeline'

/** A run on its own page: what it is and where it stands, its steps as a graph, its log, and what it took in and gave back. */
export function RunPage({ id }: { id: string }) {
    const { runOf, jobOf, now, prefs, loading } = useConsole()
    const actions = useActions()
    const run = runOf(id)
    const [chosen, setChosen] = useState<string | null>(null)
    const live = run !== undefined && isLive(run.at.state)
    useCommands(
        run === undefined
            ? []
            : [
                  {
                      title: `Run ${run.id}`,
                      commands: [
                          live
                              ? { id: 'run-cancel', label: 'Cancel this run', icon: XIcon, onSelect: () => actions.cancel(run) }
                              : { id: 'run-retry', label: 'Retry this run', icon: RotateCcwIcon, onSelect: () => actions.retry(run) },
                          { id: 'run-job', label: `Open ${run.job}`, icon: ListChecks, onSelect: () => go(`/jobs/${run.job}`) },
                      ],
                  },
              ],
        [run?.id, live],
    )

    if (run === undefined) {
        return loading ? null : (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>No run {id}</EmptyTitle>
                    <EmptyDescription>It may be from before the demo data was reset.</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" variant="outline" onClick={() => go('/runs')}>
                    <SearchIcon aria-hidden />
                    All runs
                </Button>
            </Empty>
        )
    }

    const job = jobOf(run.job)
    const step = run.at.steps.find((one) => one.code === chosen)
    const outputs = outputsOf(run, run.at)
    return (
        <Stack gap="page">
            <PageHeader
                title={job?.name ?? run.job}
                code={run.id}
                meta={
                    <MetaLine
                        items={[
                            <StatusChip key="state" status={run.at.state} />,
                            run.at.step === null ? null : (
                                <span key="step">
                                    at <span className="font-mono">{run.at.step}</span>
                                </span>
                            ),
                            run.at.state === 'skipped' ? null : took(run.at.duration),
                            `by ${sayBy(run)}`,
                            stamp(run.created),
                        ].filter((item) => item !== null)}
                    />
                }
                actions={
                    <>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => go(`/jobs/${run.job}`)}
                            reason={job === undefined ? 'The job was deleted.' : undefined}
                        >
                            <ListChecks aria-hidden />
                            Open job
                        </Button>
                        <RunButtons run={run} page={false} />
                    </>
                }
            />
            {run.at.state === 'failed' && (
                <Problem
                    title={`${run.at.step ?? 'A step'} failed`}
                    detail="The steps after it were skipped. Retry runs the job again with the same inputs."
                    technical={run.error ?? undefined}
                />
            )}
            {run.skipped !== null && <Problem tone="warning" title="The scheduler skipped this run" detail={run.skipped} />}
            <Section title="Steps" meta={live ? 'live' : `${String(run.at.steps.length)} steps`} flush>
                <RunGraph
                    steps={run.at.steps}
                    selected={chosen}
                    onSelect={setChosen}
                    frame="fitted"
                    formatDuration={took}
                    words={{ label: `${run.job} run ${run.id}` }}
                />
            </Section>
            {step !== undefined && (
                <Section
                    title={<span className="font-mono">{step.code}</span>}
                    meta={step.kind}
                    actions={
                        <Button size="xs" variant="ghost" onClick={() => setChosen(null)}>
                            Close
                        </Button>
                    }
                >
                    <DescriptionList
                        termWidth="7rem"
                        items={[
                            { term: 'State', value: <StatusChip status={step.status} /> },
                            { term: 'Needs', value: step.needs.length === 0 ? 'nothing' : step.needs.join(', '), code: true },
                            {
                                term: 'Started',
                                value: step.status === 'queued' || step.status === 'skipped' ? undefined : stamp(step.start),
                            },
                            { term: 'Took', value: step.duration_ms === undefined ? undefined : took(step.duration_ms), numeric: true },
                            { term: 'Says', value: step.status === 'failed' ? (run.error ?? undefined) : undefined },
                        ]}
                    />
                </Section>
            )}
            <Section title="Log" meta={live ? 'following' : undefined} flush>
                <LogView lines={runLog(run, run.at, now)} follow={prefs.followLog} wrap={prefs.wrapLog} framed={false} />
            </Section>
            <Columns count={3} min="sm" gap="section">
                <Section title="Run">
                    <DescriptionList termWidth="6rem" items={runFacts(run, job?.name)} />
                </Section>
                <Section title="Inputs">
                    <JsonTree value={run.inputs} />
                </Section>
                <Section title="Outputs">
                    {outputs === null ? (
                        <p className="text-sm text-muted-foreground">What the run gives back shows once it ends.</p>
                    ) : (
                        <JsonTree value={outputs} />
                    )}
                </Section>
            </Columns>
            <Section title="Timeline">
                <Timeline events={stepEvents(run)} />
            </Section>
        </Stack>
    )
}
