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

/**
 * A message row: an avatar, a header, the content and a footer, aligned to the start for the
 * assistant and to the end for the person. The conversation composes every chat primitive.
 */
function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

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
    return <MessageAvatar className="size-8 text-xs font-medium">MH</MessageAvatar>
}

const STEP = `steps:
  fetch:
    block: http.get
    with:
      connection: met-no
      path: /weatherapi/locationforecast/2.0/compact
  gate:
    block: jq.assert
    with:
      input: \${{ steps.fetch.output }}
      expression: .properties.timeseries | length > 0
      message: no forecast rows for station SN18700
  store:
    block: dhis2.data-values
    with:
      connection: dhis2-play`

function FailingStep() {
    const lines = useHighlightedCode(STEP, 'yaml')
    return (
        <CodeBlock size="sm">
            <CodeBlockHeader>
                <CodeBlockTitle>
                    <FileTextIcon />
                    pipelines/weather-gate.yaml
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
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
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
                            <AttachmentTitle>readings-2026-11-04.csv</AttachmentTitle>
                            <AttachmentDescription>CSV, 4.2 KB</AttachmentDescription>
                        </AttachmentContent>
                    </Attachment>
                    <Bubble align="end">
                        <BubbleContent>Why did weather-gate fail at 14:02? The readings I attached look complete to me.</BubbleContent>
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
                            <TraceTitle>Read run 01a1a5c2 of weather-gate</TraceTitle>
                            <TraceDescription>0.2s</TraceDescription>
                        </TraceLine>
                        <TraceCollapsible defaultOpen>
                            <TraceCollapsibleTrigger>
                                <TraceLine status="error">
                                    <TraceIcon>
                                        <TriangleAlertIcon />
                                    </TraceIcon>
                                    <TraceTitle>Read the log of block gate</TraceTitle>
                                    <TraceDescription>0.1s</TraceDescription>
                                </TraceLine>
                            </TraceCollapsibleTrigger>
                            <TraceCollapsibleContent>
                                <p className="font-mono text-xs">
                                    2026-11-04 14:02:07 gate failed: .properties.timeseries | length &gt; 0 evaluated to false
                                </p>
                            </TraceCollapsibleContent>
                        </TraceCollapsible>
                    </Trace>
                    <Bubble variant="ghost">
                        <BubbleContent>
                            The fetch step succeeded, but the forecast it returned had no rows for station SN18700, so the gate stopped the
                            run before store. Your CSV is fine; it never reached the pipeline. The assertion is on line 11:
                        </BubbleContent>
                    </Bubble>
                    <FailingStep />
                    <Bubble variant="ghost">
                        <BubbleContent>
                            Rerun once the forecast service has data for the station, or point the gate at the readings source.
                        </BubbleContent>
                    </Bubble>
                </MessageContent>
            </Message>
        </div>
    )
}

const meta: Meta = { title: 'Primitives/Chat/Message' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <MessageGroup className="max-w-2xl gap-6">
                <div className="flex flex-col gap-2">
                    <Caption>align start, with avatar and header</Caption>
                    <Message>
                        <Assistant />
                        <MessageContent>
                            <MessageHeader>Assistant</MessageHeader>
                            <Bubble variant="muted">
                                <BubbleContent>The last run of dhis2-play succeeded in 1.2s.</BubbleContent>
                            </Bubble>
                        </MessageContent>
                    </Message>
                </div>
                <div className="flex flex-col gap-2">
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
                </div>
                <div className="flex flex-col gap-2">
                    <Caption>no avatar</Caption>
                    <Message>
                        <MessageContent>
                            <Bubble variant="outline">
                                <BubbleContent>Two runs failed: weather-gate at 14:02 and fhir-tour at 09:41.</BubbleContent>
                            </Bubble>
                        </MessageContent>
                    </Message>
                </div>
                <div className="flex flex-col gap-2">
                    <Caption>group of consecutive messages</Caption>
                    <MessageGroup>
                        <Message align="end">
                            <MessageContent>
                                <Bubble align="end">
                                    <BubbleContent>Pause the trigger on weather-gate.</BubbleContent>
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
                </div>
            </MessageGroup>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-2xl flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <Caption>working, a tool call running</Caption>
                    <Message>
                        <Assistant />
                        <MessageContent>
                            <Trace>
                                <TraceLine status="running">
                                    <TraceTitle>Reading runs of weather-gate</TraceTitle>
                                </TraceLine>
                            </Trace>
                        </MessageContent>
                    </Message>
                </div>
                <div className="flex flex-col gap-2">
                    <Caption>error</Caption>
                    <Message>
                        <Assistant />
                        <MessageContent>
                            <Bubble variant="destructive">
                                <BubbleContent>The connection dhis2-play refused the request. Check its credentials.</BubbleContent>
                            </Bubble>
                            <MessageFooter>2026-11-04 14:06</MessageFooter>
                        </MessageContent>
                    </Message>
                </div>
            </div>
        </Ground>
    ),
}

export const Conversation: StoryObj = {
    render: () => (
        <Ground>
            <ConversationView />
        </Ground>
    ),
}
