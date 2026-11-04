import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Code } from '../../components/Code'
import { ConfirmCard, type ConfirmState } from '../../components/ConfirmCard'
import { Markdown } from '../../components/Markdown'
import { MermaidDiagram } from '../../components/MermaidDiagram'
import { ToolCalls, type ToolCallEntry } from '../../components/ToolCall'
import { TooltipProvider } from '../../components/ui/tooltip'

/**
 * The pieces an assistant's answer is made of: markdown with code and diagrams, the tools it
 * called, and an action it holds until a person answers.
 */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider>
            <div className="min-h-svh bg-background p-6 text-foreground">
                <div className="mx-auto flex max-w-3xl flex-col gap-6">{children}</div>
            </div>
        </TooltipProvider>
    )
}

const ANSWER = `The run **failed at \`validate\`**, step 4 of 7. The \`fetch\` step read 2,184 rows from \`dhis2-play\`, but 37 of them carry a \`value\` that is not a number.

| period | org unit | value |
| --- | --- | --- |
| 202610 | \`ImspTQPwCqd\` | \`n/a\` |
| 202610 | \`O6uvpzGd5pu\` | \`-\` |

Two ways forward:

1. Drop rows whose value does not parse, before \`validate\`:

\`\`\`yaml
steps:
  clean:
    block: filter
    with:
      where: "try_cast(value as double) is not null"
\`\`\`

2. Or keep them and let \`validate\` warn instead of fail, with \`on_invalid: warn\`.

See the [filter block](https://example.org/blocks/filter) for the expression syntax.`

const FLOW = `flowchart LR
  fetch --> clean --> validate --> write
  validate -. warn .-> notify`

const CALLS: ToolCallEntry[] = [
    {
        id: '1',
        name: 'runs.get',
        args: { pipeline: 'weather-gate', run: 'run_01JCF8Q2' },
        result: { state: 'failed', failed_step: 'validate', duration_ms: 4180 },
        status: 'done',
        duration: '0.2s',
    },
    {
        id: '2',
        name: 'runs.log',
        args: { run: 'run_01JCF8Q2', step: 'validate', tail: 50 },
        result: '37 rows failed: value is not a number',
        status: 'error',
        duration: '0.4s',
    },
    { id: '3', name: 'blocks.describe', args: { block: 'filter' }, status: 'running' },
    { id: '4', name: 'pipelines.diff', args: { pipeline: 'weather-gate' }, status: 'pending' },
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
                action="Add a clean step to weather-gate and save it"
                tool="pipelines.update"
                args={{ pipeline: 'weather-gate', insert_before: 'validate', step: { block: 'filter' } }}
                state={state}
                onApprove={() => setState('approved')}
                onDeny={() => setState('denied')}
            />
            <ConfirmCard
                action="Delete the pipeline weather-gate"
                tool="pipelines.delete"
                args={{ pipeline: 'weather-gate' }}
                state="denied"
            />
            <ConfirmCard action="Run weather-gate now" tool="runs.start" args={{ pipeline: 'weather-gate' }} state="expired" />
        </Ground>
    )
}

function CodeAndDiagram() {
    return (
        <Ground>
            <Code
                title="weather-gate.yaml"
                language="yaml"
                lineNumbers
                highlight={[6, 7]}
                value={`code: weather-gate
steps:
  fetch:
    block: dhis2.data-values
    with: { connection: dhis2-play, period: LAST_12_MONTHS }
  validate:
    block: schema.check
    with: { schema: readings, on_invalid: fail }
`}
            />
            <MermaidDiagram code={FLOW} />
            <MermaidDiagram code={'flowchart LR\n  fetch -->'} />
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/Chat' }
export default meta

export const MarkdownAnswer: StoryObj = { name: 'Markdown', render: () => <Answer /> }
export const Tools: StoryObj = { name: 'Tool calls', render: () => <Calls /> }
export const Held: StoryObj = { name: 'Confirm card', render: () => <Confirm /> }
export const Blocks: StoryObj = { name: 'Code and diagrams', render: () => <CodeAndDiagram /> }
