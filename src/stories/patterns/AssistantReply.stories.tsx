import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'

import { AssistantReply, type AssistantReplyLayout } from '@winterop-com/sokkel-ui/AssistantReply'
import type { ConfirmState } from '@winterop-com/sokkel-ui/ConfirmCard'
import type { ToolCallEntry } from '@winterop-com/sokkel-ui/ToolCall'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { TidevannMark } from '../fixtures/TidevannMark'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { tuneUrl } from '../media/fixtures/tune'
import { waveformOf } from '../media/fixtures/waveform'
import { speakLater } from '../fixtures/speech'

/**
 * The assistant's side of a turn: who speaks, the tools it called folded behind one line, the
 * model's thinking folded behind another, the answer, a held change and the reply's actions, on the
 * card layout or the steps layout, and the states an answer passes through, from waiting for the
 * first word to failing.
 */
function Ground({ children }: { children: ReactNode }) {
    return (
        <TooltipProvider>
            <div className="min-h-svh bg-background p-4 text-foreground md:p-6">
                <Stack gap="3xl" className="mx-auto max-w-3xl">
                    {children}
                </Stack>
            </div>
        </TooltipProvider>
    )
}

const ANSWER = `The run failed at **\`validate\`**: 37 rows of \`orders-2026-10.csv\` carry an \`amount\` that is not a number.

| row | order | amount |
| --- | --- | --- |
| 112 | \`A-20431\` | \`n/a\` |
| 340 | \`A-20659\` | \`12,50\` |

The second one is a decimal comma. Parsing amounts with the locale fixes most of them:

\`\`\`yaml
transform:
  amount: parse_decimal(amount, locale: "nb-NO")
\`\`\`

The rest are blanks, and dropping them before \`validate\` is safe.`

const PARTIAL = `The run failed at **\`validate\`**: 37 rows of \`orders-2026-10.csv\` carry an \`amount\` that is not a number.

The second sample, \`12,50\`, is a decimal comma. Parsing amounts with`

const REASONING = `The person asks why **nightly-export** failed. Start with the latest run, then its log at the failing step.

\`validate\` rejected 37 rows, all on \`amount\`. Two samples should show whether it is one cause or several: \`n/a\` is a blank written out, and \`12,50\` looks like a decimal comma from a European feed.

If most rejections are commas, parsing with the locale in \`transform\` fixes them without loosening \`validate\`.`

const THINKING = `The person asks why **nightly-export** failed. Start with the latest run, then its log at the failing step.

\`validate\` rejected 37 rows, all on \`amount\`. Two samples should show whether it is one cause or`

const CALLS: ToolCallEntry[] = [
    {
        id: '1',
        name: 'runs.get',
        label: 'Run failed at validate',
        args: { job: 'nightly-export', run: 'latest' },
        result: { state: 'failed', step: 'validate' },
        status: 'done',
        duration: '0.2s',
    },
    {
        id: '2',
        name: 'runs.log',
        label: '37 rows rejected',
        args: { run: 'run_01JCF8Q2', step: 'validate' },
        result: '37 rows rejected',
        status: 'done',
        duration: '0.4s',
    },
    {
        id: '3',
        name: 'files.sample',
        label: '2 rows sampled',
        args: { file: 'orders-2026-10.csv', rows: [112, 340] },
        result: { rows: 2 },
        status: 'done',
        duration: '0.3s',
    },
]

const RUNNING: ToolCallEntry[] = [
    CALLS[0],
    { ...CALLS[1], label: 'Reading validation log', status: 'running', result: undefined, duration: undefined },
    { ...CALLS[2], label: 'Sampling rejected rows', status: 'pending', result: undefined, duration: undefined },
]

const BROKEN: ToolCallEntry[] = [
    CALLS[0],
    { ...CALLS[1], label: 'Could not read validation log', status: 'error', result: 'log store timed out after 30s' },
]

const SPEAKER = { mark: <TidevannMark />, name: 'Tidevann', time: '09:42', onRetry: () => undefined }

function Full({ layout }: { layout: AssistantReplyLayout }) {
    const [state, setState] = useState<ConfirmState>('pending')
    const [feedback, setFeedback] = useState<'good' | 'bad'>()
    return (
        <AssistantReply
            {...SPEAKER}
            layout={layout}
            calls={CALLS}
            summary="Investigation complete · 3 tools"
            reasoning={REASONING}
            content={ANSWER}
            held={{
                action: 'Add the locale-aware parse to nightly-export and save it',
                tool: 'jobs.update',
                args: { job: 'nightly-export', step: 'transform', set: { amount: 'parse_decimal' } },
                state,
                onApprove: () => setState('approved'),
                onDeny: () => setState('denied'),
            }}
            feedback={feedback}
            onFeedback={setFeedback}
            facts="3 tools, 4.1s"
        />
    )
}

function States({ layout }: { layout: AssistantReplyLayout }) {
    const [at, setAt] = useState(2)
    return (
        <>
            <AssistantReply {...SPEAKER} layout={layout} state="streaming" />
            <AssistantReply {...SPEAKER} layout={layout} calls={CALLS} reasoning={THINKING} state="streaming" />
            <AssistantReply
                {...SPEAKER}
                layout={layout}
                calls={RUNNING}
                summary="Investigating · reading the validation log"
                content={PARTIAL}
                state="streaming"
            />
            <AssistantReply {...SPEAKER} layout={layout} calls={CALLS} content={PARTIAL} state="stopped" onFeedback={() => undefined} />
            <AssistantReply
                {...SPEAKER}
                layout={layout}
                calls={BROKEN}
                summary="Investigation incomplete · 1 tool failed"
                state="failed"
                problem={{
                    detail: 'The model stopped answering after 30 seconds. Nothing was changed.',
                    technical: 'upstream closed the stream: 504 gateway timeout (request req_01JCF9A1)',
                }}
            />
            <AssistantReply
                {...SPEAKER}
                layout={layout}
                content={
                    [
                        'The run failed at `validate`: 37 rows carry an `amount` that is not a number.',
                        'Validation rejected 37 rows of `orders-2026-10.csv`; 31 use a decimal comma, such as `12,50`.',
                        'Short version: decimal commas. Parse `amount` with the locale in `transform`.',
                    ][at - 1]
                }
                versions={{ at, of: 3, onChange: setAt }}
                onFeedback={() => undefined}
            />
        </>
    )
}

const meta: Meta = { title: 'Patterns/Assistant reply' }
export default meta

/** The whole turn in one quiet card: the mark, the folded tools, the answer, the held change as a section, and the actions. */
export const Card: StoryObj = {
    render: () => (
        <Ground>
            <Full layout="card" />
        </Ground>
    ),
}

/** The turn on a rail: Checked holds the tools, Found the answer, Next the held change and the actions. */
export const Steps: StoryObj = {
    render: () => (
        <Ground>
            <Full layout="steps" />
        </Ground>
    ),
}

/** An answer the model also read aloud, played in one line under it. */
export const ReadAloud: StoryObj = {
    name: 'Read aloud',
    render: () => (
        <Ground>
            <AssistantReply
                {...SPEAKER}
                content="Two jobs failed this week: **nightly-export** on Tuesday and Wednesday, and **sync-inventory** once on Monday."
                speech={{ src: tuneUrl(), waveform: waveformOf(11, 64), duration: 8 }}
                onFeedback={() => undefined}
            />
        </Ground>
    ),
}

/** Read aloud in the footer, after Copy: the first press fetches the answer's audio, spinning while it comes, and plays it; a press while it plays stops it. */
export const ReadOnPress: StoryObj = {
    name: 'Read on press',
    render: () => (
        <Ground>
            <AssistantReply
                {...SPEAKER}
                content="Two jobs failed this week: **nightly-export** on Tuesday and Wednesday, and **sync-inventory** once on Monday."
                speak={speakLater}
                onFeedback={() => undefined}
            />
        </Ground>
    ),
}

/** In a card: waiting for the first word, thinking with the thought open and growing, streaming with a caret while a tool runs, stopped, failed with Try again, and the second of three versions. */
export const CardStates: StoryObj = {
    name: 'Card states',
    render: () => (
        <Ground>
            <States layout="card" />
        </Ground>
    ),
}

/** The same states on the steps layout. */
export const StepsStates: StoryObj = {
    name: 'Steps states',
    render: () => (
        <Ground>
            <States layout="steps" />
        </Ground>
    ),
}
