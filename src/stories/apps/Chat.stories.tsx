import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bell, ChevronDown, Copy, Folder, MessageSquare, PenSquare, RotateCcw, Search, ThumbsUp } from 'lucide-react'
import { useState } from 'react'

import { AccountMenu } from '../../components/AccountMenu'
import { Composer } from '../../components/Composer'
import { ConfirmCard, type ConfirmState } from '../../components/ConfirmCard'
import { Markdown } from '../../components/Markdown'
import { Rail, type RailGroup } from '../../components/Rail'
import { Shell } from '../../components/Shell'
import { ToolCalls, type ToolCallEntry } from '../../components/ToolCall'
import { TopBar } from '../../components/TopBar'
import { Bubble, BubbleContent } from '../../components/ui/bubble'
import { Button } from '../../components/ui/button'
import { Message, MessageContent, MessageFooter } from '../../components/ui/message'
import { TooltipProvider } from '../../components/ui/tooltip'

/**
 * An assistant app in the library's frame: conversations in the rail, the exchange in a reading
 * column with markdown, tool calls and a held action, and the composer pinned under it.
 */
const GROUPS: RailGroup[] = [
    {
        id: 'top',
        entries: [
            { id: 'new', label: 'New chat', icon: PenSquare, href: '#' },
            { id: 'search', label: 'Search chats', icon: Search, href: '#' },
        ],
    },
    {
        id: 'pinned',
        title: 'Pinned',
        entries: [
            { id: 'c1', label: 'Why nightly-export failed', icon: MessageSquare, href: '#', active: true },
            { id: 'c2', label: 'Index rebuild timings', icon: MessageSquare, href: '#' },
            { id: 'p1', label: 'Harbor launch', icon: Folder, href: '#' },
        ],
    },
    {
        id: 'recent',
        title: 'Recent',
        entries: [
            { id: 'c3', label: 'Digest email wording', icon: MessageSquare, href: '#' },
            { id: 'c4', label: 'Orders CSV columns', icon: MessageSquare, href: '#' },
            { id: 'c5', label: 'Cron syntax for weekdays', icon: MessageSquare, href: '#' },
            { id: 'c6', label: 'Retry policy for the api', icon: MessageSquare, href: '#' },
        ],
    },
]

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

const CALLS: ToolCallEntry[] = [
    {
        id: '1',
        name: 'runs.get',
        args: { job: 'nightly-export', run: 'latest' },
        result: { state: 'failed', step: 'validate' },
        status: 'done',
        duration: '0.2s',
    },
    {
        id: '2',
        name: 'runs.log',
        args: { run: 'run_01JCF8Q2', step: 'validate' },
        result: '37 rows rejected',
        status: 'done',
        duration: '0.4s',
    },
    {
        id: '3',
        name: 'files.sample',
        args: { file: 'orders-2026-10.csv', rows: [112, 340] },
        result: { rows: 2 },
        status: 'done',
        duration: '0.3s',
    },
]

function Exchange() {
    const [state, setState] = useState<ConfirmState>('pending')
    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
            <Message align="end">
                <MessageContent>
                    <Bubble align="end" variant="secondary">
                        <BubbleContent>Why did nightly-export fail last night?</BubbleContent>
                    </Bubble>
                </MessageContent>
            </Message>
            <Message>
                <MessageContent>
                    <ToolCalls calls={CALLS} />
                    <Markdown content={ANSWER} />
                    <ConfirmCard
                        action="Add the locale-aware parse to nightly-export and save it"
                        tool="jobs.update"
                        args={{ job: 'nightly-export', step: 'transform', set: { amount: 'parse_decimal' } }}
                        state={state}
                        onApprove={() => setState('approved')}
                        onDeny={() => setState('denied')}
                    />
                    <MessageFooter className="gap-1 px-0">
                        <Button variant="ghost" size="icon-xs" aria-label="Copy">
                            <Copy aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon-xs" aria-label="Good answer">
                            <ThumbsUp aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon-xs" aria-label="Try again">
                            <RotateCcw aria-hidden />
                        </Button>
                        <span className="ml-2 font-normal text-faint tabular-nums">3 tools, 4.1s</span>
                    </MessageFooter>
                </MessageContent>
            </Message>
        </div>
    )
}

function ChatApp() {
    const [collapsed, setCollapsed] = useState(false)
    const [draft, setDraft] = useState('')
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark="A"
                        name="assistant"
                        groups={GROUPS}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={<AccountMenu name="ada" where="assistant.example.org" collapsed={collapsed} onSettings={() => undefined} />}
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'Why nightly-export failed' }]}
                        actions={
                            <>
                                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                                    fast model
                                    <ChevronDown aria-hidden />
                                </Button>
                                <Button variant="ghost" size="icon-sm" aria-label="Notifications">
                                    <Bell aria-hidden />
                                </Button>
                            </>
                        }
                    />
                }
            >
                <div className="flex h-full min-h-0 flex-col">
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <Exchange />
                    </div>
                    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
                        <Composer value={draft} onChange={setDraft} onSend={() => setDraft('')} onAttach={() => undefined} />
                    </div>
                </div>
            </Shell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Chat' }
export default meta

export const Conversation: StoryObj = { render: () => <ChatApp /> }
