import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { JsonTree } from '@winterop-com/sokkel-ui/JsonTree'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { LogView } from '@winterop-com/sokkel-ui/LogView'
import { Problem } from '@winterop-com/sokkel-ui/Problem'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Timeline } from '@winterop-com/sokkel-ui/Timeline'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { ExternalLinkIcon, RotateCcwIcon, XIcon } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { useActions } from './actions'
import { outputsOf, runLog } from './logs'
import { sayBy, stamp, took } from './model'
import { stepEvents } from './parts'
import { useConsole, type LiveRun } from './state'
import { isLive } from './timeline'

/** What can be done with a run, as a row of buttons. */
export function RunButtons({ run, page = true }: { run: LiveRun; page?: boolean }) {
    const actions = useActions()
    const live = isLive(run.at.state)
    return (
        <Row gap="sm" wrap>
            {page && (
                <Button size="sm" variant="outline" onClick={() => go(`/runs/${run.id}`)}>
                    <ExternalLinkIcon aria-hidden />
                    Open page
                </Button>
            )}
            <Button
                size="sm"
                variant="outline"
                onClick={() => actions.retry(run)}
                reason={live ? 'The run has not finished yet.' : undefined}
            >
                <RotateCcwIcon aria-hidden />
                Retry
            </Button>
            <Button
                size="sm"
                variant="ghost"
                onClick={() => actions.cancel(run)}
                reason={live ? undefined : 'Only a run going can be cancelled.'}
            >
                <XIcon aria-hidden />
                Cancel
            </Button>
        </Row>
    )
}

/** The run's facts: its job, state, step, who started it, when, and how long it took. */
export function runFacts(run: LiveRun, name: string | undefined) {
    return [
        { term: 'Run', value: run.id, code: true },
        { term: 'Job', value: name === undefined ? run.job : `${name} (${run.job})` },
        { term: 'Project', value: run.project },
        { term: 'State', value: <StatusChip status={run.at.state} /> },
        { term: 'Step', value: run.at.step ?? undefined, code: true },
        { term: 'Started by', value: sayBy(run) },
        { term: 'Asked for', value: stamp(run.created) },
        { term: 'Duration', value: run.at.state === 'skipped' ? undefined : took(run.at.duration), numeric: true },
        { term: 'Records', value: run.records.toLocaleString('en-US'), numeric: true },
        ...(run.retryOf === null ? [] : [{ term: 'Retries', value: run.retryOf, code: true }]),
    ]
}

/** A run beside the page: its facts and what can be done with it, its steps, and its log. */
export function RunPanel({ run }: { run: LiveRun }) {
    const { jobOf, prefs, now } = useConsole()
    const [tab, setTab] = useState('details')
    const outputs = outputsOf(run, run.at)
    return (
        <SidePanel
            active={tab}
            onActiveChange={setTab}
            tabs={[
                {
                    id: 'details',
                    label: 'Details',
                    content: (
                        <>
                            <PanelSection title="Run">
                                <RunButtons run={run} />
                                {run.at.state === 'failed' && (
                                    <Problem title={`Failed at ${run.at.step ?? 'a step'}`} technical={run.error ?? undefined} />
                                )}
                                {run.skipped !== null && <Problem tone="warning" title="Skipped" detail={run.skipped} />}
                                <DescriptionList termWidth="6rem" items={runFacts(run, jobOf(run.job)?.name)} />
                            </PanelSection>
                            <PanelSection title="Inputs">
                                <JsonTree value={run.inputs} />
                            </PanelSection>
                            <PanelSection title="Outputs">
                                {outputs === null ? (
                                    <p className="text-sm text-muted-foreground">Once the run ends.</p>
                                ) : (
                                    <JsonTree value={outputs} />
                                )}
                            </PanelSection>
                        </>
                    ),
                },
                {
                    id: 'steps',
                    label: 'Steps',
                    content: (
                        <PanelSection title="Steps">
                            <Timeline events={stepEvents(run)} />
                        </PanelSection>
                    ),
                },
                {
                    id: 'log',
                    label: 'Log',
                    content: (
                        <LogView
                            lines={runLog(run, run.at, now)}
                            follow={prefs.followLog}
                            wrap={prefs.wrapLog}
                            numbered={false}
                            className="m-3"
                        />
                    ),
                },
            ]}
        />
    )
}
