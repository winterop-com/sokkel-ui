import type { Meta, StoryObj } from '@storybook/react-vite'
import { BotIcon, FileSpreadsheetIcon, FileTextIcon, TriangleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from '../../components/ui/attachment'
import { Bubble, BubbleContent } from '../../components/ui/bubble'
import { CodeBlock, CodeBlockContent, CodeBlockHeader, CodeBlockLine, CodeBlockTitle } from '../../components/ui/code-block'
import { Marker, MarkerContent } from '../../components/ui/marker'
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader } from '../../components/ui/message'
import {
    Trace,
    TraceCollapsible,
    TraceCollapsibleContent,
    TraceCollapsibleTrigger,
    TraceDescription,
    TraceIcon,
    TraceLine,
    TraceTitle,
} from '../../components/ui/trace'
import { useHighlightedCode } from '../../hooks/use-highlighted-code'
import { Stack } from '../../components/Layout'

/**
 * A message row: an avatar, a header, the content and a footer, aligned to the start for the
 * assistant and to the end for the person. The conversation composes every chat primitive.
 */
function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

function Assistant() {
    return (
        <MessageAvatar className="size-8 text-muted-foreground">
            <BotIcon className="size-4" />
        </MessageAvatar>
    )
}

function Person() {
    return <MessageAvatar className="size-8 text-xs font-medium">AL</MessageAvatar>
}

const STEP = `steps:
  fetch:
    uses: http.get
    with:
      url: https://files.example.org/orders-2026-10.csv
      format: csv
  validate:
    uses: rows.check
    with:
      input: \${{ steps.fetch.output }}
      expression: .amount | type == "number"
      message: amount is not a number
  upload:
    uses: bucket.put
    with:
      bucket: harbor-exports`

function FailingStep() {
    const lines = useHighlightedCode(STEP, 'yaml')
    return (
        <CodeBlock size="sm">
            <CodeBlockHeader>
                <CodeBlockTitle>
                    <FileTextIcon />
                    jobs/import-orders.yaml
                </CodeBlockTitle>
            </CodeBlockHeader>
            <CodeBlockContent lineNumbers>
                {lines.map((line, at) => (
                    <CodeBlockLine key={at} variant={at === 10 ? 'highlighted' : 'default'}>
                        {line}
                    </CodeBlockLine>
                ))}
            </CodeBlockContent>
        </CodeBlock>
    )
}

function ConversationView() {
    return (
        <Stack gap="xl" className="mx-auto w-full max-w-2xl">
            <Marker variant="separator">
                <MarkerContent>2026-11-04</MarkerContent>
            </Marker>
            <Message align="end">
                <Person />
                <MessageContent>
                    <Attachment size="sm">
                        <AttachmentMedia>
                            <FileSpreadsheetIcon />
                        </AttachmentMedia>
                        <AttachmentContent>
                            <AttachmentTitle>orders-2026-10.csv</AttachmentTitle>
                            <AttachmentDescription>CSV, 182 KB</AttachmentDescription>
                        </AttachmentContent>
                    </Attachment>
                    <Bubble align="end">
                        <BubbleContent>Why did import-orders fail at 14:02? The orders I attached look complete to me.</BubbleContent>
                    </Bubble>
                </MessageContent>
            </Message>
            <Message>
                <Assistant />
                <MessageContent>
                    <MessageHeader>Assistant</MessageHeader>
                    <Trace>
                        <TraceLine>
                            <TraceIcon>
                                <FileTextIcon />
                            </TraceIcon>
                            <TraceTitle>Read run 01a1a5c2 of import-orders</TraceTitle>
                            <TraceDescription>0.2s</TraceDescription>
                        </TraceLine>
                        <TraceCollapsible defaultOpen>
                            <TraceCollapsibleTrigger>
                                <TraceLine status="error">
                                    <TraceIcon>
                                        <TriangleAlertIcon />
                                    </TraceIcon>
                                    <TraceTitle>Read the log of step validate</TraceTitle>
                                    <TraceDescription>0.1s</TraceDescription>
                                </TraceLine>
                            </TraceCollapsibleTrigger>
                            <TraceCollapsibleContent>
                                <p className="font-mono text-xs">
                                    2026-11-04 14:02:07 validate failed: 37 of 2,184 rows have an amount that is not a number
                                </p>
                            </TraceCollapsibleContent>
                        </TraceCollapsible>
                    </Trace>
                    <Bubble variant="ghost">
                        <BubbleContent>
                            The fetch step read all 2,184 rows, but 37 of them carry an amount that is not a number, such as n/a on row 412,
                            so validate stopped the run before upload. The rows are all there; the check is on line 11:
                        </BubbleContent>
                    </Bubble>
                    <FailingStep />
                    <Bubble variant="ghost">
                        <BubbleContent>
                            Fix those 37 amounts in the file and rerun, or drop them in a transform step before validate.
                        </BubbleContent>
                    </Bubble>
                </MessageContent>
            </Message>
        </Stack>
    )
}

const meta: Meta = { title: 'Primitives/Chat/Message', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <MessageGroup className="max-w-2xl gap-6">
            <Stack gap="sm">
                <Caption>align start, with avatar and header</Caption>
                <Message>
                    <Assistant />
                    <MessageContent>
                        <MessageHeader>Assistant</MessageHeader>
                        <Bubble variant="muted">
                            <BubbleContent>The last run of nightly-export succeeded in 1.2s.</BubbleContent>
                        </Bubble>
                    </MessageContent>
                </Message>
            </Stack>
            <Stack gap="sm">
                <Caption>align end, with footer</Caption>
                <Message align="end">
                    <Person />
                    <MessageContent>
                        <Bubble align="end">
                            <BubbleContent>Show me the runs that failed today.</BubbleContent>
                        </Bubble>
                        <MessageFooter>2026-11-04 14:05</MessageFooter>
                    </MessageContent>
                </Message>
            </Stack>
            <Stack gap="sm">
                <Caption>no avatar</Caption>
                <Message>
                    <MessageContent>
                        <Bubble variant="outline">
                            <BubbleContent>Two runs failed: import-orders at 14:02 and sync-inventory at 09:41.</BubbleContent>
                        </Bubble>
                    </MessageContent>
                </Message>
            </Stack>
            <Stack gap="sm">
                <Caption>group of consecutive messages</Caption>
                <MessageGroup>
                    <Message align="end">
                        <MessageContent>
                            <Bubble align="end">
                                <BubbleContent>Pause the schedule on import-orders.</BubbleContent>
                            </Bubble>
                        </MessageContent>
                    </Message>
                    <Message align="end">
                        <MessageContent>
                            <Bubble align="end">
                                <BubbleContent>Only until tomorrow morning.</BubbleContent>
                            </Bubble>
                        </MessageContent>
                    </Message>
                </MessageGroup>
            </Stack>
        </MessageGroup>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Stack gap="xl" className="max-w-2xl">
            <Stack gap="sm">
                <Caption>working, a tool call running</Caption>
                <Message>
                    <Assistant />
                    <MessageContent>
                        <Trace>
                            <TraceLine status="running">
                                <TraceTitle>Reading runs of import-orders</TraceTitle>
                            </TraceLine>
                        </Trace>
                    </MessageContent>
                </Message>
            </Stack>
            <Stack gap="sm">
                <Caption>error</Caption>
                <Message>
                    <Assistant />
                    <MessageContent>
                        <Bubble variant="destructive">
                            <BubbleContent>The service api refused the request. Check its API token.</BubbleContent>
                        </Bubble>
                        <MessageFooter>2026-11-04 14:06</MessageFooter>
                    </MessageContent>
                </Message>
            </Stack>
        </Stack>
    ),
}

export const Conversation: StoryObj = {
    render: () => <ConversationView />,
}
