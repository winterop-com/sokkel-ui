import { Banner } from '@winterop-com/sokkel-ui/Banner'
import { CodeEditor, type CodeCompletion, type CodeMark } from '@winterop-com/sokkel-ui/CodeEditor'
import { DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { useCommands } from '@winterop-com/sokkel-ui/hooks/use-commands'
import { keyLabels } from '@winterop-com/sokkel-ui/lib/keys'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Maximize2, Play, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { counted, sayDuration, type WorkFile } from '../model'
import { runQuery, SqlError, type QueryResult, type Table } from '../sql'
import { useStudio } from '../state'
import { tablesWith } from '../tables'
import { EditorPane, Pane } from './parts'
import { resultColumns, resultRows } from './results'

type Outcome = { state: 'done'; result: QueryResult; at: number } | { state: 'failed'; message: string; mark: CodeMark }

/** The table and column names a query completes from, each with what it holds. */
function tableWords(tables: readonly Table[]): CodeCompletion[] {
    const columns = new Map<string, CodeCompletion>()
    for (const table of tables)
        for (const column of table.columns) {
            const known = columns.get(column.name)
            columns.set(column.name, {
                label: column.name,
                detail: known === undefined ? `${table.name}, ${column.type}` : `${String(known.detail).split(',')[0]} and ${table.name}`,
                docs: column.description,
                kind: 'property',
            })
        }
    return [
        ...tables.map((table) => ({ label: table.name, detail: 'table', docs: table.description, kind: 'type' as const })),
        ...columns.values(),
    ]
}

/** A query: SQL over the simulated tables, run with Mod-Enter or Run, its rows in a table under it and a refusal marked where it is. */
export function QueryEditor({ file }: { file: WorkFile }) {
    const { docFor, prefs, dirty, save, runs } = useStudio()
    const doc = docFor(file)
    const [popped, setPopped] = useState(false)
    const tables = useMemo(() => tablesWith(runs), [runs])
    const words = useMemo(() => tableWords(tables), [tables])
    const [outcome, setOutcome] = useState<Outcome | undefined>(undefined)

    const execute = (source = doc.text) => {
        try {
            setOutcome({ state: 'done', result: runQuery(source, tables), at: Date.now() })
        } catch (error) {
            if (error instanceof SqlError)
                setOutcome({
                    state: 'failed',
                    message: error.message,
                    mark: { from: error.from, to: Math.max(error.to, error.from + 1), tone: 'error', message: error.message },
                })
            else setOutcome({ state: 'failed', message: String(error), mark: { line: 1, tone: 'error' } })
        }
    }
    // The query runs once as it opens, so its rows are there to read.
    useEffect(() => execute(), [file.id])

    useCommands(
        [
            {
                title: file.name,
                commands: [
                    {
                        id: 'query-run',
                        label: 'Run the query',
                        icon: Play,
                        keys: keyLabels({ key: 'Enter', mod: true }),
                        onSelect: () => execute(),
                    },
                    { id: 'query-pop', label: 'Pop out the editor', icon: Maximize2, onSelect: () => setPopped(true) },
                ],
            },
        ],
        [file.name, tables],
    )

    const describe = (word: string) => {
        const lower = word.toLowerCase()
        const table = tables.find((one) => one.name === lower)
        if (table !== undefined) return `${table.name}: ${table.description} ${counted(table.rows.length, 'row')}.`
        const owners = tables.filter((one) => one.columns.some((column) => column.name === lower))
        if (owners.length === 0) return null
        return owners
            .map((one) => `${one.name}.${lower}: ${one.columns.find((column) => column.name === lower)?.description ?? ''}`)
            .join('\n')
    }

    const rows = outcome?.state === 'done' ? resultRows(outcome.result.rows) : []
    const columns = outcome?.state === 'done' ? resultColumns(outcome.result.columns, rows) : []

    return (
        <SplitPane
            id="studio-query"
            direction="down"
            defaultShare={0.45}
            minShare={0.2}
            maxShare={0.8}
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
                            <Button size="sm" onClick={() => execute()}>
                                <Play aria-hidden />
                                Run
                            </Button>
                        </>
                    }
                >
                    <CodeEditor
                        key={file.id}
                        doc={doc}
                        label={file.name}
                        language="sql"
                        variant="pane"
                        completions={words}
                        hover={describe}
                        marks={outcome?.state === 'failed' ? [outcome.mark] : []}
                        onRun={execute}
                        keys={{ 'Mod-s': () => void save(file.id) }}
                        wrap={prefs.wrap}
                        lineNumbers={prefs.lineNumbers}
                        size={prefs.size}
                        bracketColors={prefs.bracketColors}
                        search
                    />
                </EditorPane>
            }
            second={
                <Pane
                    title="Results"
                    meta={
                        outcome?.state === 'done'
                            ? `${counted(outcome.result.rows.length, 'row')} in ${sayDuration(outcome.result.ms)}`
                            : outcome?.state === 'failed'
                              ? 'Refused'
                              : undefined
                    }
                >
                    {outcome?.state === 'failed' ? (
                        <Banner tone="critical">{outcome.message}</Banner>
                    ) : (
                        <DataTable
                            key={outcome?.state === 'done' ? String(outcome.at) : 'none'}
                            className="h-full min-h-0"
                            framed={false}
                            columns={columns}
                            rows={rows}
                            rowKey={(row) => row.key}
                            minWidth="auto"
                            defaultPageSize={100}
                            empty="The query found no rows."
                            words={{ rows: (count) => counted(count, 'row') }}
                        />
                    )}
                </Pane>
            }
        />
    )
}
