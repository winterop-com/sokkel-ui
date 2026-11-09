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

const MATH = String.raw`Retries back off exponentially: the $n$-th retry waits $t_n = t_0 \cdot 2^{n}$, capped at \(t_{\max}\), so with $t_0 = 30\,\text{s}$ the fourth waits four minutes.

The expected time a run of $k$ steps spends waiting, when each step fails with probability $p$:

$$
E[W] = k \sum_{n=1}^{\infty} p^{n}\, t_0\, 2^{n-1} = \frac{k\, p\, t_0}{1 - 2p}, \qquad p < \tfrac{1}{2}
$$

A run's throughput, in the delimiters some models write:

\[
\text{rows/s} = \frac{\text{rows read}}{t_{\text{fetch}} + t_{\text{transform}} + t_{\text{upload}}}
\]

The spread of run times, as a fenced block:

~~~math
\begin{aligned}
\bar t &= \frac{1}{N}\sum_{i=1}^{N} t_i \\
\sigma^2 &= \frac{1}{N}\sum_{i=1}^{N} (t_i - \bar t)^2
\end{aligned}
~~~

A formula KaTeX cannot read keeps its source: $\frac{1}{2$.

Prices stay prices: the worker costs $5 a day and the scheduler $10, so the pair is $15.`

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

/** Three answers cut off mid-stream: in a sentence, in a table's last row, and inside a code block. */
const STREAMED = [
    'The run **failed at `validate`**, step 3 of 5. The `fetch` step read 2,184 rows, but 37 of them carry an',
    `The rows that failed, so far:

| row | order | amount |
| --- | --- | --- |
| 412 | \`ord-10412\` | \`n/a\` |
| 977 | \`ord-10977\` |`,
    `Drop rows whose amount does not parse, in \`transform\`:

\`\`\`yaml
steps:
  transform:
    uses: rows.filter
    with:
      where: "try_cast(amount`,
]

function Streamed() {
    return (
        <Ground>
            {STREAMED.map((content, index) => (
                <Markdown key={index} content={content} streaming caret />
            ))}
        </Ground>
    )
}

function MathReply() {
    return (
        <Ground>
            <Markdown content={MATH} />
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

/**
 * Answers still streaming, each with the caret where the next words land: after the last words of
 * a sentence, in the last cell of a table's newest row, and at the end of a code block's last line.
 */
export const Streaming: StoryObj = { render: () => <Streamed /> }
/**
 * LaTeX in an answer, drawn by KaTeX once it loads: inline with `$…$` and `\(…\)`, display with
 * `$$`, `\[…\]` and a `math` fence, a formula KaTeX cannot read, and dollars that stay prices.
 */
export const MathAnswer: StoryObj = { name: 'Math', render: () => <MathReply /> }
export const Tools: StoryObj = { name: 'Tool calls', render: () => <Calls /> }
export const Held: StoryObj = { name: 'Confirm card', render: () => <Confirm /> }
export const Blocks: StoryObj = { name: 'Code and diagrams', render: () => <CodeAndDiagram /> }
