import type { Meta, StoryObj } from '@storybook/react-vite'
import { Play } from 'lucide-react'
import { useState } from 'react'

import { Banner } from '@winterop-com/sokkel-ui/Banner'
import { CodeEditor, type CodeCompletion, type CodeMark } from '@winterop-com/sokkel-ui/CodeEditor'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Kbd } from '@winterop-com/sokkel-ui/primitives/kbd'
import { EditorApp } from './frame'

type Row = Record<string, string | number>

const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders']
const STATES = ['succeeded', 'failed', 'succeeded', 'running', 'succeeded', 'cancelled', 'failed', 'skipped', 'queued']
const PROJECTS = ['harbor', 'juniper', 'larkspur']
const STEPS = ['fetch', 'transform', 'validate', 'upload', 'notify']

/** Tidevann's tables, made the same every time. */
const TABLES: Record<string, { docs: string; columns: Record<string, string>; rows: Row[] }> = {
    runs: {
        docs: 'Every run of every job, one row each.',
        columns: {
            id: 'The run number.',
            job: 'The job the run belongs to.',
            project: 'harbor, juniper or larkspur.',
            state: 'succeeded, failed, running, queued, cancelled or skipped.',
            step: 'The step the run is at, or stopped on.',
            started: 'When the run started, in UTC.',
            duration_s: 'How long it ran, in seconds.',
        },
        rows: Array.from({ length: 60 }, (_, index) => ({
            id: 4200 - index,
            job: JOBS[index % JOBS.length],
            project: PROJECTS[Math.floor(index / 2) % PROJECTS.length],
            state: STATES[index % STATES.length],
            step: STEPS[(index * 3) % STEPS.length],
            started: `2026-11-${String(9 - Math.floor(index / 8)).padStart(2, '0')} ${String(23 - (index % 8) * 3).padStart(2, '0')}:00`,
            duration_s: 40 + ((index * 37) % 400),
        })),
    },
    jobs: {
        docs: 'The jobs of each project.',
        columns: {
            code: 'The job code.',
            project: 'The project it runs in.',
            owner: 'Who answers for it.',
            schedule: 'When it runs, as a cron line.',
        },
        rows: JOBS.map((code, index) => ({
            code,
            project: PROJECTS[index % PROJECTS.length],
            owner: ['ada', 'grace', 'linus', 'margaret'][index % 4],
            schedule: ['0 2 * * *', '0 * * * *', '0 4 * * 0', '0 7 * * 1-5', '30 1 * * *'][index],
        })),
    },
}

/** The tables and their columns, offered while typing. */
const WORDS: CodeCompletion[] = Object.entries(TABLES).flatMap(([table, { docs, columns }]) => [
    { label: table, detail: 'table', docs, kind: 'type' as const },
    ...Object.entries(columns).map(([column, about]) => ({ label: column, detail: table, docs: about, kind: 'property' as const })),
])

interface Result {
    columns: string[]
    rows: Row[]
    error?: { message: string; mark: CodeMark }
}

/** Where a word is written in the query, as a mark. */
function markAt(query: string, word: string, message: string): CodeMark {
    const at = Math.max(0, query.indexOf(word))
    return { from: at, to: at + word.length, tone: 'error', message }
}

/** Runs a query over the tables: its columns, `where` equalities joined by `and`, `order by` and `limit`. */
function run(query: string): Result {
    const text = query.replaceAll(/--.*$/gm, ' ')
    const table = /\bfrom\s+(\w+)/i.exec(text)?.[1]
    if (table === undefined) return { columns: [], rows: [], error: { message: 'A query needs a from.', mark: { line: 1, tone: 'error' } } }
    const source = TABLES[table]
    if (source === undefined) {
        const message = `There is no table ${table}. The tables are ${Object.keys(TABLES).join(' and ')}.`
        return { columns: [], rows: [], error: { message, mark: markAt(query, table, message) } }
    }
    const known = Object.keys(source.columns)
    const picked = (/\bselect\s+([\s\S]*?)\s+from\b/i.exec(text)?.[1] ?? '*').split(',').map((part) => part.trim())
    const columns = picked.includes('*') ? known : picked
    const unknown = [...columns, ...[...text.matchAll(/(\w+)\s*=\s*'/g)].map((match) => match[1])].find((column) => !known.includes(column))
    if (unknown !== undefined) {
        const message = `${table} has no column ${unknown}.`
        return { columns: [], rows: [], error: { message, mark: markAt(query, unknown, message) } }
    }
    let rows = source.rows.filter((row) =>
        [...text.matchAll(/(\w+)\s*=\s*'([^']*)'/g)].every(([, column, value]) => String(row[column]) === value),
    )
    const order = /\border\s+by\s+(\w+)(\s+desc)?/i.exec(text)
    if (order !== null) {
        const [, column, desc] = order
        rows = [...rows].sort((a, b) => (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0) * (desc === undefined ? 1 : -1))
    }
    const limit = /\blimit\s+(\d+)/i.exec(text)
    if (limit !== null) rows = rows.slice(0, Number(limit[1]))
    return { columns, rows }
}

const FAILED = `-- The failed runs in larkspur, newest first
select id, job, step, started, duration_s
from runs
where state = 'failed'
  and project = 'larkspur'
order by started desc
limit 20;`

interface Ran {
    id: string
    query: string
    when: string
    rows: number
}

const HISTORY: Ran[] = [
    { id: 'h3', query: FAILED, when: '09:42', rows: run(FAILED).rows.length },
    { id: 'h2', query: "select code, owner, schedule\nfrom jobs\nwhere project = 'harbor';", when: '09:31', rows: 2 },
    { id: 'h1', query: "select *\nfrom runs\nwhere state = 'running'\nlimit 10;", when: 'yesterday', rows: 7 },
]

/** A query's first line that is not a comment, for the history. */
const headline = (query: string) =>
    query
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line !== '' && !line.startsWith('--')) ?? query

function cellOf(column: string) {
    return (row: Row) => (column === 'state' ? <StatusChip status={String(row.state)} /> : String(row[column]))
}

function QueryConsole() {
    const [query, setQuery] = useState(FAILED)
    const [result, setResult] = useState<Result>(() => run(FAILED))
    const [history, setHistory] = useState<Ran[]>(HISTORY)
    const [count, setCount] = useState(HISTORY.length)

    const execute = (text: string) => {
        const next = run(text)
        setResult(next)
        if (next.error !== undefined) return
        setCount((value) => value + 1)
        setHistory((list) => [{ id: `h${String(count + 1)}`, query: text, when: 'just now', rows: next.rows.length }, ...list])
    }

    const resultColumns: DataColumn<Row>[] = result.columns.map((column, index) => ({
        id: column,
        header: column,
        width: column === 'job' || column === 'started' ? 'minmax(10rem,1fr)' : 'minmax(6rem,1fr)',
        align: typeof result.rows[0]?.[column] === 'number' ? 'end' : 'start',
        sortValue: (row) => row[column],
        stack: index === 0 ? 'line' : 'secondary',
        cell: cellOf(column),
    }))

    const historyColumns: DataColumn<Ran>[] = [
        {
            id: 'query',
            header: 'Query',
            width: 'minmax(10rem,1fr)',
            cell: (ran) => <span className="truncate font-mono">{headline(ran.query)}</span>,
        },
        { id: 'when', header: 'Ran', width: '6rem', stack: 'secondary', cell: (ran) => ran.when },
        { id: 'rows', header: 'Rows', width: '4rem', align: 'end', stack: 'secondary', cell: (ran) => String(ran.rows) },
    ]

    return (
        <EditorApp
            place="query"
            trail={[
                { label: 'Query', href: '#' },
                { label: 'runs', code: true },
            ]}
        >
            <SplitPane
                defaultShare={0.26}
                minShare={0.16}
                maxShare={0.45}
                narrow="second"
                narrowBelow={720}
                first={
                    <Stack gap="none" className="h-full min-h-0">
                        <PaneHeader title="History" meta={String(history.length)} />
                        <Fill>
                            <DataTable
                                variant="list"
                                columns={historyColumns}
                                rows={history}
                                rowKey={(ran) => ran.id}
                                onOpen={(ran) => setQuery(ran.query)}
                                minWidth="auto"
                            />
                        </Fill>
                    </Stack>
                }
                second={
                    <SplitPane
                        direction="down"
                        defaultShare={0.45}
                        first={
                            <Stack gap="none" className="h-full min-h-0">
                                <PaneHeader
                                    title="Query"
                                    meta={
                                        <span>
                                            <Kbd>Cmd/Ctrl+Enter</Kbd> runs
                                        </span>
                                    }
                                    actions={
                                        <Button size="sm" onClick={() => execute(query)}>
                                            <Play aria-hidden />
                                            Run
                                        </Button>
                                    }
                                />
                                <Fill>
                                    <CodeEditor
                                        label="Query"
                                        language="sql"
                                        variant="pane"
                                        size="sm"
                                        value={query}
                                        onChange={setQuery}
                                        completions={WORDS}
                                        onRun={execute}
                                        marks={result.error === undefined ? [] : [result.error.mark]}
                                    />
                                </Fill>
                            </Stack>
                        }
                        second={
                            <Stack gap="none" className="h-full min-h-0">
                                <PaneHeader
                                    title="Results"
                                    meta={result.error === undefined ? `${String(result.rows.length)} rows` : 'Error'}
                                />
                                <Fill>
                                    {result.error === undefined ? (
                                        <DataTable
                                            columns={resultColumns}
                                            rows={result.rows}
                                            rowKey={(row) => Object.values(row).join('|')}
                                            bar={false}
                                            empty="No rows"
                                        />
                                    ) : (
                                        <Banner tone="critical">{result.error.message}</Banner>
                                    )}
                                </Fill>
                            </Stack>
                        }
                    />
                }
            />
        </EditorApp>
    )
}

const meta: Meta = { title: 'Editors/Query' }
export default meta

/**
 * A SQL console over Tidevann's runs and jobs: the tables and their columns complete as they are
 * typed, each with what it holds; Mod-Enter or Run runs the query and its rows fill the table under
 * it, sorted from its heads; a table or column that does not exist is underlined with why. Each run
 * goes to the history beside it, and pressing one puts its query back in the editor.
 */
export const Query: StoryObj = { render: () => <QueryConsole /> }
