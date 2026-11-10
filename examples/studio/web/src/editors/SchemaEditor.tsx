import { CodeEditor, useSharedText, type CodeProblem, type CodeRange } from '@winterop-com/sokkel-ui/CodeEditor'
import { JSON_SCHEMA_2020_12 } from '@winterop-com/sokkel-ui/json-schema'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { useCommands } from '@winterop-com/sokkel-ui/hooks/use-commands'
import type { JsonSchema } from '@winterop-com/sokkel-ui/schema/read'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Maximize2, RotateCcw, Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { samples } from '../backend'
import type { WorkFile } from '../model'
import { useStudio } from '../state'
import { EditorPane, Pane } from './parts'
import { Problems } from './Problems'

type Below = 'schema' | 'value'

/** The schema a document holds, or nothing while it does not read as a JSON object. */
function readSchema(text: string): JsonSchema | undefined {
    try {
        const value: unknown = JSON.parse(text)
        return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonSchema) : undefined
    } catch {
        return undefined
    }
}

/** How long typing stops before the tried value is kept, in milliseconds. */
const KEEP_AFTER = 500

/**
 * A JSON Schema: edited against the 2020-12 meta-schema, every keyword completed and checked as it
 * is typed, beside a value tried against the schema as it stands, so each edit shows what it lets
 * through.
 */
export function SchemaEditor({ file }: { file: WorkFile }) {
    const { docFor, prefs, dirty, save, revert } = useStudio()
    const doc = docFor(file)
    const text = useSharedText(doc)
    const [problems, setProblems] = useState<readonly CodeProblem[]>([])
    const [valueProblems, setValueProblems] = useState<readonly CodeProblem[]>([])
    const [reveal, setReveal] = useState<CodeRange | null>(null)
    const [revealValue, setRevealValue] = useState<CodeRange | null>(null)
    const [popped, setPopped] = useState(false)
    const [below, setBelow] = useState<Below>('value')

    // The schema is tried only once it reads and the meta-schema finds no error in it.
    const parsed = useMemo(() => readSchema(text), [text])
    const errors = problems.filter((problem) => problem.tone === 'error').length
    const schema = errors === 0 ? parsed : undefined

    const kept = useCollection(samples)
    const stored = kept.rows?.find((row) => row.id === file.id)?.text
    const [value, setValue] = useState<string | undefined>(undefined)
    const timer = useRef<number | undefined>(undefined)
    useEffect(() => () => window.clearTimeout(timer.current), [])
    const shown = value ?? stored ?? '{}\n'
    const keep = (next: string) => {
        setValue(next)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
            const exists = kept.rows?.some((row) => row.id === file.id) ?? false
            void (exists ? samples.update(file.id, { text: next }) : samples.create({ text: next }, file.id))
        }, KEEP_AFTER)
    }

    useCommands(
        [
            {
                title: file.name,
                commands: [
                    { id: 'schema-pop', label: 'Pop out the editor', icon: Maximize2, onSelect: () => setPopped(true) },
                    {
                        id: 'schema-revert',
                        label: 'Revert to the saved schema',
                        icon: RotateCcw,
                        disabled: dirty.has(file.id) ? false : 'No changes to revert.',
                        onSelect: () => revert(file.id),
                    },
                ],
            },
        ],
        [file.name, dirty.has(file.id)],
    )

    const verdict =
        schema === undefined ? (
            <StatusChip status="skipped" label="Schema not ready" />
        ) : valueProblems.some((problem) => problem.tone === 'error') ? (
            <StatusChip status="failed" label="Refused" />
        ) : (
            <StatusChip status="succeeded" label="Passes" />
        )

    return (
        <SplitPane
            id="studio-schema"
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
                        <Button size="sm" variant="ghost" disabled={!dirty.has(file.id)} onClick={() => void save(file.id)}>
                            <Save aria-hidden />
                            Save
                        </Button>
                    }
                >
                    <CodeEditor
                        key={file.id}
                        doc={doc}
                        label={file.name}
                        language="json"
                        variant="pane"
                        schema={JSON_SCHEMA_2020_12}
                        onProblems={setProblems}
                        reveal={reveal}
                        keys={{ 'Mod-s': () => void save(file.id) }}
                        wrap={prefs.wrap}
                        lineNumbers={prefs.lineNumbers}
                        size={prefs.size}
                        folding={prefs.folding}
                        indentGuides={prefs.indentGuides}
                        bracketColors={prefs.bracketColors}
                        search
                    />
                </EditorPane>
            }
            second={
                <SplitPane
                    id="studio-schema-side"
                    direction="down"
                    defaultShare={0.55}
                    first={
                        <Pane title="Try a value" meta={verdict}>
                            <CodeEditor
                                key={file.id}
                                label={`A value tried against ${file.name}`}
                                language="json"
                                variant="pane"
                                value={shown}
                                onChange={keep}
                                schema={schema}
                                onProblems={setValueProblems}
                                reveal={revealValue}
                                wrap={prefs.wrap}
                                lineNumbers={prefs.lineNumbers}
                                size={prefs.size}
                                bracketColors={prefs.bracketColors}
                            />
                        </Pane>
                    }
                    second={
                        <Pane
                            title={
                                <Segmented<Below>
                                    size="sm"
                                    label="Show the problems of"
                                    value={below}
                                    onValueChange={setBelow}
                                    options={[
                                        { value: 'value', label: 'Value', count: valueProblems.length },
                                        { value: 'schema', label: 'Schema', count: problems.length },
                                    ]}
                                />
                            }
                        >
                            {below === 'schema' ? (
                                <Problems
                                    problems={problems}
                                    onReveal={(problem) => setReveal({ from: problem.from, to: problem.to })}
                                    empty="The schema is valid JSON Schema 2020-12."
                                />
                            ) : (
                                <Problems
                                    problems={valueProblems}
                                    onReveal={(problem) => setRevealValue({ from: problem.from, to: problem.to })}
                                    empty={schema === undefined ? 'Fix the schema first; the value is tried once it is valid.' : 'The value passes the schema.'}
                                />
                            )}
                        </Pane>
                    }
                />
            }
        />
    )
}
