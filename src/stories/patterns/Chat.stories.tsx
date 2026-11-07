import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Code } from '@winterop-com/sokkel-ui/Code'
import { ConfirmCard, type ConfirmState } from '@winterop-com/sokkel-ui/ConfirmCard'
import { Markdown } from '@winterop-com/sokkel-ui/Markdown'
import { MermaidDiagram } from '@winterop-com/sokkel-ui/MermaidDiagram'
import { ToolCalls, type ToolCallEntry } from '@winterop-com/sokkel-ui/ToolCall'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * The pieces an assistant's answer is made of: markdown with code and diagrams, the tools it
 * called, and an action it holds until a person answers.
 */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider>
            <Stack gap="xl" className="mx-auto max-w-3xl">
                {children}
            </Stack>
        </TooltipProvider>
    )
}

const ANSWER = `The run **failed at \`validate\`**, step 3 of 5. The \`fetch\` step read 2,184 rows from \`orders-2026-10.csv\`, but 37 of them carry an \`amount\` that is not a number.

| row | order | amount |
| --- | --- | --- |
| 412 | \`ord-10412\` | \`n/a\` |
| 977 | \`ord-10977\` | \`-\` |

Two ways forward:

1. Drop rows whose amount does not parse, in \`transform\`, before \`validate\`:

\`\`\`yaml
steps:
  transform:
    uses: rows.filter
    with:
      where: "try_cast(amount as double) is not null"
\`\`\`

2. Or keep them and let \`validate\` warn instead of fail, with \`on_invalid: warn\`.

See the [rows.filter reference](https://docs.example.org/steps/rows-filter) for the expression syntax.`

const FLOW = `flowchart LR
  fetch --> transform --> validate --> upload
  validate -. warn .-> notify`

const CALLS: ToolCallEntry[] = [
    {
        id: '1',
        name: 'runs.get',
        args: { job: 'import-orders', run: 'run_01JCF8Q2' },
        result: { state: 'failed', failed_step: 'validate', duration_ms: 4180 },
        status: 'done',
        duration: '0.2s',
    },
    {
        id: '2',
        name: 'runs.log',
        args: { run: 'run_01JCF8Q2', step: 'validate', tail: 50 },
        result: '37 rows failed: amount is not a number',
        status: 'error',
        duration: '0.4s',
    },
    { id: '3', name: 'docs.search', args: { query: 'rows.filter' }, status: 'running' },
    { id: '4', name: 'jobs.diff', args: { job: 'import-orders' }, status: 'pending' },
]

function Answer() {
    return (
        <Ground>
            <Markdown content={ANSWER} />
        </Ground>
    )
}

function Calls() {
    return (
        <Ground>
            <ToolCalls calls={CALLS} />
        </Ground>
    )
}

function Confirm() {
    const [state, setState] = useState<ConfirmState>('pending')
    return (
        <Ground>
            <ConfirmCard
                action="Add a filter step to import-orders and save it"
                tool="jobs.update"
                args={{ job: 'import-orders', insert_before: 'validate', step: { uses: 'rows.filter' } }}
                state={state}
                onApprove={() => setState('approved')}
                onDeny={() => setState('denied')}
            />
            <ConfirmCard action="Delete the job import-orders" tool="jobs.delete" args={{ job: 'import-orders' }} state="denied" />
            <ConfirmCard action="Run import-orders now" tool="runs.start" args={{ job: 'import-orders' }} state="expired" />
        </Ground>
    )
}

function CodeAndDiagram() {
    return (
        <Ground>
            <Code
                title="import-orders.yaml"
                language="yaml"
                lineNumbers
                highlight={[6, 7]}
                value={`code: import-orders
steps:
  fetch:
    uses: http.get
    with: { url: https://files.example.org/orders-2026-10.csv }
  validate:
    uses: rows.check
    with: { rules: orders, on_invalid: fail }
`}
            />
            <MermaidDiagram code={FLOW} />
            <MermaidDiagram code={'flowchart LR\n  fetch -->'} />
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/Chat', parameters: { frame: 'padded' } }
export default meta

export const MarkdownAnswer: StoryObj = { name: 'Markdown', render: () => <Answer /> }
export const Tools: StoryObj = { name: 'Tool calls', render: () => <Calls /> }
export const Held: StoryObj = { name: 'Confirm card', render: () => <Confirm /> }
export const Blocks: StoryObj = { name: 'Code and diagrams', render: () => <CodeAndDiagram /> }
