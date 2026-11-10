import { CodeEditor, useSharedText, type CodeMark, type CodeProblem, type CodeRange } from '@winterop-com/sokkel-ui/CodeEditor'
import type { Issue } from '@winterop-com/sokkel-ui/IssueMark'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { useCommands } from '@winterop-com/sokkel-ui/hooks/use-commands'
import { keyLabels } from '@winterop-com/sokkel-ui/lib/keys'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { PipelineGraph } from '@winterop-com/sokkel-ui-graph/PipelineGraph'
import { RunGraph } from '@winterop-com/sokkel-ui-graph/RunGraph'
import { History, Maximize2, Play, Save, Square } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { go } from 'tidevann-shared/router'
import { counted, type WorkFile } from '../model'
import { describeWord, holdsReference, PIPELINE_SCHEMA, readPipeline, referenceWords } from '../pipeline'
import { useStudio } from '../state'
import { EditorPane, Pane, RunLog } from './parts'
import { Problems } from './Problems'

type GraphView = 'steps' | 'run'
type Below = 'problems' | 'log'

/**
 * A pipeline: its YAML checked and completed against the pipeline schema as it is typed, the
 * references checked beside it, the problems listed, the steps drawn as a graph that follows each
 * edit, and a run with its graph and log.
 */
export function PipelineEditor({ file }: { file: WorkFile }) {
    const { docFor, prefs, dirty, save, run, cancel, runs } = useStudio()
    const doc = docFor(file)
    const text = useSharedText(doc)
    const pipeline = useMemo(() => readPipeline(text), [text])
    const [problems, setProblems] = useState<readonly CodeProblem[]>([])
    const [reveal, setReveal] = useState<CodeRange | null>(null)
    const [popped, setPopped] = useState(false)
    const [graph, setGraph] = useState<GraphView>('steps')
    const [below, setBelow] = useState<Below>('problems')
    const [selected, setSelected] = useState<string | null>(null)

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
    const steps = useMemo(
        () =>
            pipeline.steps.map((step) => ({
                code: step.id,
                kind: step.kind,
                needs: step.needs,
                issues: problems
                    .filter((problem) => problem.from >= step.from && problem.from < step.to)
                    .map((problem): Issue => ({ tone: problem.tone === 'error' ? 'critical' : 'warning', text: problem.message })),
            })),
        [pipeline, problems],
    )

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
        [file.name, going, runReason, latest?.id],
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
        <PipelineGraph
            steps={steps}
            selected={selected}
            onSelect={(code) => {
                setSelected(code)
                const step = pipeline.steps.find((one) => one.id === code)
                if (step !== undefined) setReveal({ from: step.from, to: step.from })
            }}
        />
    )

    return (
        <SplitPane
            id="studio-pipeline"
            defaultShare={0.55}
            minShare={0.3}
            maxShare={0.75}
            first={
                <EditorPane
                    id={file.id}
                    name={file.name}
                    popped={popped}
                    onPoppedChange={setPopped}
                    actions={
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
                    }
                >
                    {editor}
                </EditorPane>
            }
            second={
                <SplitPane
                    id="studio-pipeline-side"
                    direction="down"
                    defaultShare={0.5}
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
                                    value={below}
                                    onValueChange={setBelow}
                                    options={[
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
                            ) : (
                                <Problems
                                    problems={problems}
                                    onReveal={(problem) => setReveal({ from: problem.from, to: problem.to })}
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
