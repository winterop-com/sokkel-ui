import type { CodeProblem } from '@winterop-com/sokkel-ui/CodeEditor'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { STATUS_CSS } from '@winterop-com/sokkel-ui/lib/status'

const TONE = { error: STATUS_CSS.critical, warning: STATUS_CSS.warning, info: STATUS_CSS.info } as const
const WORD = { error: 'Error', warning: 'Warning', info: 'Note' } as const

const COLUMNS: DataColumn<CodeProblem>[] = [
    {
        id: 'tone',
        header: 'Kind',
        width: '2.5rem',
        stack: 'lead',
        cell: (problem) => <Dot color={TONE[problem.tone]} label={WORD[problem.tone]} />,
    },
    { id: 'message', header: 'Problem', width: 'minmax(12rem,1fr)', stack: 'primary', cell: (problem) => problem.message },
    {
        id: 'where',
        header: 'Line',
        width: '6rem',
        align: 'end',
        stack: 'secondary',
        cell: (problem) => `line ${String(problem.line)}`,
    },
]

/** What the editor's checks found, a row each; pressing one goes to it in the editor. */
export function Problems({
    problems,
    onReveal,
    empty = 'No problems.',
}: {
    problems: readonly CodeProblem[]
    onReveal: (problem: CodeProblem) => void
    empty?: string
}) {
    return (
        <DataTable
            variant="list"
            framed={false}
            bar={false}
            columnHeads={false}
            resizable={false}
            minWidth="auto"
            className="h-full min-h-0"
            columns={COLUMNS}
            rows={problems}
            rowKey={(problem) => `${String(problem.from)}-${String(problem.to)}-${problem.message}`}
            onOpen={onReveal}
            empty={empty}
            words={{ rows: (count) => `${String(count)} ${count === 1 ? 'problem' : 'problems'}` }}
        />
    )
}
