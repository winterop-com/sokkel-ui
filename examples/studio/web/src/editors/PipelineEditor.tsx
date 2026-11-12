import { CodeEditor, useSharedText, type CodeMark, type CodeProblem, type CodeRange } from '@winterop-com/sokkel-ui/CodeEditor'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import type { Issue } from '@winterop-com/sokkel-ui/IssueMark'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { useCommands } from '@winterop-com/sokkel-ui/hooks/use-commands'
import { keyLabels } from '@winterop-com/sokkel-ui/lib/keys'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { RunGraph } from '@winterop-com/sokkel-ui-graph/RunGraph'
import { Columns2, FileText, History, Maximize2, Play, Save, Square, Workflow } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { go } from 'tidevann-shared/router'
import { counted, type PipelineView, type WorkFile } from '../model'
import {
    describeWord,
    holdsReference,
    KIND_DOCS,
    PIPELINE_SCHEMA,
    readPipeline,
    referenceWords,
    RUN_FIELDS,
    STEP_FIELDS,
    STEP_KINDS,
} from '../pipeline'
import { useStudio } from '../state'
import { EditorPane, Pane, RunLog } from './parts'
import { PipelineCanvas } from './PipelineCanvas'
import { Problems } from './Problems'
import { StepSettings } from './StepSettings'

type GraphView = 'steps' | 'run'
type Below = 'step' | 'problems' | 'log'

const VIEWS: { value: PipelineView; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'split', label: 'Both' },
    { value: 'graph', label: 'Graph' },
]

/** What a pipeline is written with: the kinds of step, and what a reference can name. */
function PipelineReference() {
    return (
        <Stack gap="xl">
            <Section variant="flat" title="Step kinds">
                <DescriptionList layout="stacked" items={STEP_KINDS.map((kind) => ({ term: kind, value: KIND_DOCS[kind] }))} />
            </Section>
            <Section variant="flat" title="Step fields" description="Named as ${steps.<id>.<field>}.">
                <DescriptionList layout="stacked" items={Object.entries(STEP_FIELDS).map(([term, value]) => ({ term, value }))} />
            </Section>
            <Section variant="flat" title="Run fields" description="Named as ${run.<field>}.">
                <DescriptionList layout="stacked" items={Object.entries(RUN_FIELDS).map(([term, value]) => ({ term, value }))} />
            </Section>
        </Stack>
    )
}

/**
 * A pipeline: its YAML checked and completed against the pipeline schema as it is typed, the
 * references checked beside it, the problems listed, and a run with its graph and log. The steps
 * are edited as text, on a graph, or both side by side: each edit on the graph is written into the
 * YAML, each edit of the YAML redraws the graph, and one undo serves both.
 */
export function PipelineEditor({ file }: { file: WorkFile }) {
    const { docFor, prefs, setPrefs, dirty, save, run, cancel, runs } = useStudio()
    const doc = docFor(file)
    const text = useSharedText(doc)
    const pipeline = useMemo(() => readPipeline(text), [text])
    const [problems, setProblems] = useState<readonly CodeProblem[]>([])
    const [reveal, setReveal] = useState<CodeRange | null>(null)
    const [popped, setPopped] = useState(false)
    const [graph, setGraph] = useState<GraphView>('steps')
    const [below, setBelow] = useState<Below>('problems')
    const [selected, setSelected] = useState<string | null>(null)

    const view = prefs.pipelineView
    const setView = (next: PipelineView) => void setPrefs({ pipelineView: next })
    // A step is chosen on the graph, so the text alone has no step to set.
    const shownBelow: Below = view === 'text' && below === 'step' ? 'problems' : below

    const latest = runs.find((one) => one.file === file.id)
    const going = latest?.state === 'running'
    const errors = problems.filter((problem) => problem.tone === 'error').length

    // The line a run failed on, washed in the editor while the step is still there.
    const marks = useMemo<CodeMark[]>(() => {
        const failedStep = latest?.failed === undefined ? undefined : pipeline.steps.find((step) => step.id === latest.failed?.step)
        if (failedStep === undefined) return pipeline.marks
        const line = text.slice(0, failedStep.from).split('\n').length
        return [...pipeline.marks, { line, tone: 'error' }]
    }, [pipeline, latest, text])

    const words = useMemo(() => referenceWords(pipeline), [pipeline])
    // What the checks found within each step's lines, marked on its box.
    const issues = useMemo(() => {
        const found = new Map<string, Issue[]>()
        for (const step of pipeline.steps) {
            const within = problems
                .filter((problem) => problem.from >= step.from && problem.from < step.to)
                .map((problem): Issue => ({ tone: problem.tone === 'error' ? 'critical' : 'warning', text: problem.message }))
            if (within.length > 0) found.set(step.id, within)
        }
        return found
    }, [pipeline, problems])

    const revealStep = (id: string) => {
        const step = pipeline.steps.find((one) => one.id === id)
        if (step !== undefined) setReveal({ from: step.from, to: step.from })
    }
    const choose = (id: string | null) => {
        setSelected(id)
        if (id !== null && view !== 'graph') revealStep(id)
    }

    const start = () => {
        if (errors > 0 || going) return
        void run(file.id).then((started) => {
            if (started === undefined) return
            setGraph('run')
            setBelow('log')
        })
    }
    const runReason = going
        ? undefined
        : errors > 0
          ? `Fix the ${counted(errors, 'error')} first.`
          : pipeline.broken
            ? 'The YAML does not read.'
            : undefined

    useCommands(
        [
            {
                title: file.name,
                commands: [
                    going
                        ? { id: 'pipeline-cancel', label: 'Cancel the run', icon: Square, onSelect: () => latest && cancel(latest) }
                        : {
                              id: 'pipeline-run',
                              label: 'Run',
                              icon: Play,
                              keys: keyLabels({ key: 'Enter', mod: true }),
                              disabled: runReason ?? false,
                              onSelect: start,
                          },
                    { id: 'pipeline-pop', label: 'Pop out the editor', icon: Maximize2, onSelect: () => setPopped(true) },
                    {
                        id: 'pipeline-text',
                        label: 'Edit as text',
                        icon: FileText,
                        disabled: view === 'text',
                        onSelect: () => setView('text'),
                    },
                    {
                        id: 'pipeline-split',
                        label: 'Edit as text and graph',
                        icon: Columns2,
                        disabled: view === 'split',
                        onSelect: () => setView('split'),
                    },
                    {
                        id: 'pipeline-graph',
                        label: 'Edit on the graph',
                        icon: Workflow,
                        disabled: view === 'graph',
                        onSelect: () => setView('graph'),
                    },
                    ...(latest === undefined
                        ? []
                        : [
                              {
                                  id: 'pipeline-last',
                                  label: `Open run ${String(latest.number)}`,
                                  icon: History,
                                  onSelect: () => go(`/runs/${latest.id}`),
                              },
                          ]),
                ],
            },
        ],
        [file.name, going, runReason, latest?.id, view],
    )

    // A run that ends while its graph is shown keeps it; a new file starts on its steps.
    useEffect(() => {
        setGraph('steps')
        setBelow('problems')
    }, [file.id])

    const editor = (
        <CodeEditor
            key={file.id}
            doc={doc}
            label={file.name}
            language="yaml"
            variant="pane"
            schema={PIPELINE_SCHEMA}
            deferred={holdsReference}
            marks={marks}
            completions={words}
            hover={(word) => describeWord(pipeline, word)}
            onProblems={setProblems}
            reveal={reveal}
            onRun={start}
            keys={{ 'Mod-s': () => void save(file.id) }}
            wrap={prefs.wrap}
            lineNumbers={prefs.lineNumbers}
            size={prefs.size}
            folding={prefs.folding}
            indentGuides={prefs.indentGuides}
            bracketColors={prefs.bracketColors}
            search
        />
    )

    const graphPane = pipeline.broken ? (
        <Empty>
            <EmptyHeader>
                <EmptyTitle>The YAML does not read</EmptyTitle>
                <EmptyDescription>The steps show again once the problem marked in the editor is fixed.</EmptyDescription>
            </EmptyHeader>
        </Empty>
    ) : graph === 'run' && latest !== undefined ? (
        <RunGraph
            steps={latest.steps.map((step) => ({
                code: step.id,
                kind: step.kind,
                needs: step.needs,
                status: step.state,
                duration_ms: step.duration_ms,
            }))}
            selected={selected}
            onSelect={setSelected}
        />
    ) : (
        <PipelineCanvas
            fileId={file.id}
            doc={doc}
            pipeline={pipeline}
            issues={issues}
            selected={selected}
            onSelect={choose}
            onShowText={(id) => {
                if (view === 'graph') setView('split')
                setSelected(id)
                revealStep(id)
            }}
            onSettings={(id) => {
                setSelected(id)
                setBelow('step')
            }}
            shown={view !== 'text'}
        />
    )

    const viewSwitch = <Segmented<PipelineView> size="sm" label="Edit as" value={view} onValueChange={setView} options={VIEWS} />
    const fileActions = (
        <>
            <Button size="sm" variant="ghost" disabled={!dirty.has(file.id)} onClick={() => void save(file.id)}>
                <Save aria-hidden />
                Save
            </Button>
            {going ? (
                <Button size="sm" variant="outline" onClick={() => latest && cancel(latest)}>
                    <Square aria-hidden />
                    Cancel
                </Button>
            ) : (
                <Button size="sm" reason={runReason} onClick={start}>
                    <Play aria-hidden />
                    Run
                </Button>
            )}
        </>
    )
    const graphSwitch = (
        <Segmented<GraphView>
            size="sm"
            label="Show"
            value={graph}
            onValueChange={setGraph}
            options={[
                { value: 'steps', label: 'Steps' },
                {
                    value: 'run',
                    label: 'Last run',
                    disabled: latest === undefined,
                    hint: latest === undefined ? 'Not run yet' : undefined,
                },
            ]}
        />
    )

    return (
        <SplitPane
            id="studio-pipeline"
            only={view === 'graph' ? 'second' : undefined}
            defaultShare={0.55}
            minShare={0.3}
            maxShare={0.75}
            first={
                <EditorPane
                    id={file.id}
                    name={file.name}
                    popped={popped}
                    onPoppedChange={setPopped}
                    reference={<PipelineReference />}
                    actions={
                        <>
                            {viewSwitch}
                            {fileActions}
                        </>
                    }
                >
                    {editor}
                </EditorPane>
            }
            second={
                <SplitPane
                    id="studio-pipeline-side"
                    direction="down"
                    only={view === 'text' ? 'second' : undefined}
                    defaultShare={0.6}
                    first={
                        <Pane
                            title="Steps"
                            meta={
                                graph === 'run' && latest !== undefined ? (
                                    <StatusChip status={latest.state} label={`Run ${String(latest.number)} ${latest.state}`} />
                                ) : (
                                    counted(pipeline.steps.length, 'step')
                                )
                            }
                            actions={
                                view === 'graph' ? (
                                    <>
                                        {graphSwitch}
                                        {viewSwitch}
                                        {fileActions}
                                    </>
                                ) : (
                                    graphSwitch
                                )
                            }
                        >
                            {graphPane}
                        </Pane>
                    }
                    second={
                        <Pane
                            title={
                                <Segmented<Below>
                                    size="sm"
                                    label="Show"
                                    value={shownBelow}
                                    onValueChange={setBelow}
                                    options={[
                                        ...(view === 'text' ? [] : [{ value: 'step' as const, label: 'Step' }]),
                                        { value: 'problems', label: 'Problems', count: problems.length },
                                        {
                                            value: 'log',
                                            label: 'Log',
                                            disabled: latest === undefined,
                                            hint: latest === undefined ? 'Not run yet' : undefined,
                                        },
                                    ]}
                                />
                            }
                            meta={
                                below === 'log' && latest !== undefined
                                    ? latest.failed !== undefined
                                        ? `Failed at ${latest.failed.step}: ${latest.failed.reason}`
                                        : latest.draft
                                          ? 'Run from unsaved changes'
                                          : undefined
                                    : undefined
                            }
                            actions={
                                below === 'log' && latest !== undefined ? (
                                    <Button size="sm" variant="ghost" onClick={() => go(`/runs/${latest.id}`)}>
                                        <History aria-hidden />
                                        Open run
                                    </Button>
                                ) : undefined
                            }
                        >
                            {below === 'log' && latest !== undefined ? (
                                <RunLog run={latest} />
                            ) : shownBelow === 'step' ? (
                                <StepSettings
                                    fileId={file.id}
                                    doc={doc}
                                    text={text}
                                    pipeline={pipeline}
                                    selected={selected}
                                    onRenamed={setSelected}
                                />
                            ) : (
                                <Problems
                                    problems={problems}
                                    onReveal={(problem) => {
                                        // On the graph alone, a problem chooses the step it is in.
                                        const step = pipeline.steps.find((one) => problem.from >= one.from && problem.from < one.to)
                                        if (view === 'graph' && step !== undefined) setSelected(step.id)
                                        else setReveal({ from: problem.from, to: problem.to })
                                    }}
                                    empty="No problems: the pipeline is ready to run."
                                />
                            )}
                        </Pane>
                    }
                />
            }
        />
    )
}
