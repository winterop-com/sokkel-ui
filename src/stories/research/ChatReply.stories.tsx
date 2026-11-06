import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleCheck, Copy, RotateCcw, Search, ShieldAlert, ThumbsUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { TidevannMark } from '../fixtures/TidevannMark'
import { ConfirmCard, type ConfirmState } from '../../components/ConfirmCard'
import { Markdown, type InlineCode } from '../../components/Markdown'
import { Timeline } from '../../components/Timeline'
import { ToolCalls, type ToolCallEntry } from '../../components/ToolCall'
import { Avatar, AvatarFallback } from '../../components/ui/avatar'
import { Bubble, BubbleContent } from '../../components/ui/bubble'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '../../components/ui/card'
import { Marker, MarkerContent } from '../../components/ui/marker'
import { Message, MessageContent, MessageFooter, MessageHeader } from '../../components/ui/message'
import { TooltipProvider } from '../../components/ui/tooltip'

/**
 * Four ways to draw the assistant's side of a turn, to pick from. Every column shows the same
 * exchange: a question, three tool calls folded behind one quiet line that opens, the answer with
 * its inline code drawn more calmly than chips, a held change to approve, and the reply's actions
 * at the default button size. Under each, the folded line while the tools run and once one fails.
 * No option is picked yet.
 */
const meta: Meta = { title: 'Research/Chat reply', tags: ['no-screenshot'] }
export default meta

const QUESTION = 'Why did nightly-export fail last night?'

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

/** The three calls, each with what it did and what it found, so an option can say either. */
const CALLS = [
    {
        id: '1',
        name: 'runs.get',
        did: 'Read latest run',
        found: 'Run failed at validate',
        args: { job: 'nightly-export', run: 'latest' },
        result: { state: 'failed', step: 'validate' },
        duration: '0.2s',
    },
    {
        id: '2',
        name: 'runs.log',
        did: 'Read validation log',
        found: '37 rows rejected',
        args: { run: 'run_01JCF8Q2', step: 'validate' },
        result: '37 rows rejected',
        duration: '0.4s',
    },
    {
        id: '3',
        name: 'files.sample',
        did: 'Sampled rejected rows',
        found: '2 rows sampled',
        args: { file: 'orders-2026-10.csv', rows: [112, 340] },
        result: { rows: 2 },
        duration: '0.3s',
    },
]

type Phase = 'done' | 'running' | 'failed'

/** The calls in one phase, labeled by what each did or by what it found. */
function calls(phase: Phase, say: 'did' | 'found'): ToolCallEntry[] {
    return CALLS.map(({ did, found, ...call }, index) => {
        const label = say === 'did' ? did : found
        if (phase === 'running') {
            if (index === 0) return { ...call, label, status: 'done' }
            if (index === 1) return { ...call, label: did, status: 'running', result: undefined, duration: undefined }
            return { ...call, label: did, status: 'pending', result: undefined, duration: undefined }
        }
        if (phase === 'failed' && index === 1) {
            return { ...call, label: 'Could not read validation log', status: 'error', result: 'log store timed out after 30s' }
        }
        if (phase === 'failed' && index === 2) return { ...call, label: did, status: 'pending', result: undefined, duration: undefined }
        return { ...call, label, status: 'done' }
    })
}

function Question({ outline = false, named = false }: { outline?: boolean; named?: boolean }) {
    return (
        <Message align="end">
            <MessageContent>
                {named && <MessageHeader>You</MessageHeader>}
                <Bubble align="end" variant={outline ? 'outline' : 'secondary'}>
                    <BubbleContent>{QUESTION}</BubbleContent>
                </Bubble>
            </MessageContent>
        </Message>
    )
}

function Answer({ code }: { code: InlineCode }) {
    return <Markdown content={ANSWER} inlineCode={code} />
}

function Confirm({ appearance }: { appearance: 'card' | 'section' }) {
    const [state, setState] = useState<ConfirmState>('pending')
    return (
        <ConfirmCard
            action="Add the locale-aware parse to nightly-export and save it"
            tool="jobs.update"
            args={{ job: 'nightly-export', step: 'transform', set: { amount: 'parse_decimal' } }}
            state={state}
            appearance={appearance}
            details
            onApprove={() => setState('approved')}
            onDeny={() => setState('denied')}
        />
    )
}

/** Copy, Try again and Good answer at the default size; Try again waits while a change is held. */
function Actions({ labeledFeedback = false }: { labeledFeedback?: boolean }) {
    return (
        <MessageFooter variant="actions">
            <Button variant="ghost">
                <Copy aria-hidden />
                Copy
            </Button>
            <Button variant="ghost" disabled>
                <RotateCcw aria-hidden />
                Try again
            </Button>
            {labeledFeedback ? (
                <Button variant="ghost">
                    <ThumbsUp aria-hidden />
                    Good answer
                </Button>
            ) : (
                <Button variant="ghost" size="icon" aria-label="Good answer" title="Good answer">
                    <ThumbsUp aria-hidden />
                </Button>
            )}
        </MessageFooter>
    )
}

interface Option {
    id: string
    name: string
    idea: string
    reply: () => ReactNode
    /** The folded line while the tools run and once one has failed. */
    states: { running: ReactNode; failed: ReactNode; say: 'did' | 'found' }
}

const OPTIONS: Option[] = [
    {
        id: 'reading',
        name: 'Reading Column',
        idea: 'A plain document: a speaker line, one folded summary of the work, the answer unboxed, then a separate card for the decision.',
        reply: () => (
            <>
                <Question />
                <Message>
                    <MessageContent className="gap-2">
                        <MessageHeader variant="speaker">Assistant</MessageHeader>
                        <div className="flex flex-col gap-4">
                            <ToolCalls calls={calls('done', 'did')} summary="Checked the run, log, and sample · 3 tools" />
                            <Answer code="plain" />
                            <Confirm appearance="card" />
                        </div>
                        <Actions />
                    </MessageContent>
                </Message>
            </>
        ),
        states: {
            say: 'did',
            running: 'Checking the validation log · 1 of 3 complete',
            failed: 'Could not read the validation log · 1 tool failed',
        },
    },
    {
        id: 'answer',
        name: 'Answer First',
        idea: 'The finding leads under a ruled speaker line; the tool calls follow as evidence one click away, then the change to approve.',
        reply: () => (
            <>
                <Question outline named />
                <Message>
                    <MessageContent className="gap-4">
                        <Marker variant="border">
                            <MessageHeader variant="speaker">Assistant</MessageHeader>
                        </Marker>
                        <div className="flex flex-col gap-3">
                            <Answer code="rule" />
                            <ToolCalls calls={calls('done', 'found')} summary="Evidence · run, log, and sample · 3 tools" />
                        </div>
                        <div className="flex flex-col gap-3">
                            <Confirm appearance="card" />
                            <Actions labeledFeedback />
                        </div>
                    </MessageContent>
                </Message>
            </>
        ),
        states: {
            say: 'found',
            running: 'Gathering evidence · reading the log',
            failed: 'Evidence incomplete · validation log unavailable',
        },
    },
    {
        id: 'card',
        name: 'Reply Card',
        idea: 'The whole turn in one quiet card: a header with the mark, the work, the answer, the approval as a section, and a footer of actions.',
        reply: () => (
            <>
                <Question />
                <Message>
                    <MessageContent>
                        <Card>
                            <CardHeader>
                                <MessageHeader variant="speaker">
                                    <Avatar shape="square">
                                        <AvatarFallback>
                                            <TidevannMark />
                                        </AvatarFallback>
                                    </Avatar>
                                    Assistant
                                </MessageHeader>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                <ToolCalls calls={calls('done', 'found')} summary="Investigation complete · 3 tools" />
                                <Answer code="wash" />
                                <Confirm appearance="section" />
                            </CardContent>
                            <CardFooter>
                                <Actions />
                            </CardFooter>
                        </Card>
                    </MessageContent>
                </Message>
            </>
        ),
        states: { say: 'found', running: 'Investigating · reading the validation log', failed: 'Investigation incomplete · 1 tool failed' },
    },
    {
        id: 'steps',
        name: 'Guided Steps',
        idea: 'Three stages on a quiet rail: what was checked, what was found, and what comes next, which holds the change and the actions.',
        reply: () => (
            <>
                <Question />
                <Message>
                    <MessageContent className="gap-4">
                        <MessageHeader variant="speaker">Assistant</MessageHeader>
                        <Timeline
                            events={[
                                {
                                    id: 'checked',
                                    title: <span className="font-medium">Checked</span>,
                                    tone: 'succeeded',
                                    icon: <CircleCheck className="size-4" />,
                                    content: <ToolCalls calls={calls('done', 'found')} summary="Run, log, and sample checked · 3 tools" />,
                                },
                                {
                                    id: 'found',
                                    title: <span className="font-medium">Found</span>,
                                    icon: <Search className="size-4" />,
                                    content: <Answer code="plain" />,
                                },
                                {
                                    id: 'next',
                                    title: <span className="font-medium">Next</span>,
                                    tone: 'waiting',
                                    icon: <ShieldAlert className="size-4" />,
                                    content: (
                                        <div className="flex flex-col gap-3">
                                            <Confirm appearance="card" />
                                            <Actions />
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    </MessageContent>
                </Message>
            </>
        ),
        states: { say: 'found', running: 'Reading validation log · 1 of 3 complete', failed: 'Validation log unavailable · 1 failed' },
    },
]

function Column({ option }: { option: Option }) {
    return (
        <section className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-col gap-1 border-b border-border pb-3">
                <h2 className="text-title font-semibold">{option.name}</h2>
                <p className="text-xs text-muted-foreground">{option.idea}</p>
            </div>
            <div className="flex flex-col gap-6">{option.reply()}</div>
            <div className="flex flex-col gap-3 border-t border-border pt-4">
                <Marker>
                    <MarkerContent>While running, and with one tool failed</MarkerContent>
                </Marker>
                <ToolCalls calls={calls('running', option.states.say)} summary={option.states.running} defaultOpen={false} />
                <ToolCalls calls={calls('failed', option.states.say)} summary={option.states.failed} defaultOpen={false} />
            </div>
        </section>
    )
}

/** The four options side by side, in the toolbar's theme and scheme. */
export const Options: StoryObj = {
    render: () => (
        <TooltipProvider>
            <div className="min-h-svh bg-background p-4 text-foreground md:p-6">
                <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-4">
                    {OPTIONS.map((option) => (
                        <Column key={option.id} option={option} />
                    ))}
                </div>
            </div>
        </TooltipProvider>
    ),
}
