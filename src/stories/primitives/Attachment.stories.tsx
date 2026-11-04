import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileJsonIcon, FileSpreadsheetIcon, FileTextIcon, RotateCcwIcon, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentGroup,
    AttachmentMedia,
    AttachmentTitle,
    AttachmentTrigger,
} from '../../components/ui/attachment'
import { Bubble, BubbleContent } from '../../components/ui/bubble'
import { Message, MessageContent } from '../../components/ui/message'
import { Spinner } from '../../components/ui/spinner'

/** A file a person adds to a message: a media tile, a name, a line of detail, and its actions. */
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

function Csv({ size, orientation }: { size: 'default' | 'sm' | 'xs'; orientation: 'horizontal' | 'vertical' }) {
    return (
        <Attachment size={size} orientation={orientation}>
            <AttachmentMedia>
                <FileSpreadsheetIcon />
            </AttachmentMedia>
            <AttachmentContent>
                <AttachmentTitle>orders-2026-10.csv</AttachmentTitle>
                <AttachmentDescription>CSV, 4.2 KB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
                <AttachmentAction aria-label="Remove">
                    <XIcon />
                </AttachmentAction>
            </AttachmentActions>
        </Attachment>
    )
}

const meta: Meta = { title: 'Primitives/Chat/Attachment' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            {(['horizontal', 'vertical'] as const).map((orientation) => (
                <div key={orientation} className="flex flex-wrap items-start gap-6">
                    {(['default', 'sm', 'xs'] as const).map((size) => (
                        <div key={size} className="flex min-w-0 flex-col gap-1.5">
                            <Caption>
                                {orientation}, {size}
                            </Caption>
                            <Csv size={size} orientation={orientation} />
                        </div>
                    ))}
                </div>
            ))}
            <div className="flex flex-wrap items-start gap-6">
                <div className="flex flex-col gap-1.5">
                    <Caption>media only</Caption>
                    <Attachment>
                        <AttachmentMedia>
                            <FileJsonIcon />
                        </AttachmentMedia>
                    </Attachment>
                </div>
                <div className="flex flex-col gap-1.5">
                    <Caption>image media</Caption>
                    <Attachment>
                        <AttachmentMedia variant="image">
                            <div className="aspect-square w-full bg-linear-to-br from-chart-2 to-chart-3" />
                        </AttachmentMedia>
                        <AttachmentContent>
                            <AttachmentTitle>graph-import-orders.png</AttachmentTitle>
                            <AttachmentDescription>PNG, 88 KB</AttachmentDescription>
                        </AttachmentContent>
                    </Attachment>
                </div>
                <div className="flex flex-col gap-1.5">
                    <Caption>clickable, with a trigger</Caption>
                    <Attachment>
                        <AttachmentTrigger aria-label="Open validation rules orders-v2.json" />
                        <AttachmentMedia>
                            <FileJsonIcon />
                        </AttachmentMedia>
                        <AttachmentContent>
                            <AttachmentTitle>orders-v2.json</AttachmentTitle>
                            <AttachmentDescription>Rules, 2.1 KB</AttachmentDescription>
                        </AttachmentContent>
                    </Attachment>
                </div>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-start gap-6">
                <div className="flex flex-col gap-1.5">
                    <Caption>idle</Caption>
                    <Attachment state="idle">
                        <AttachmentMedia>
                            <FileTextIcon />
                        </AttachmentMedia>
                        <AttachmentContent>
                            <AttachmentTitle>Drop a file</AttachmentTitle>
                            <AttachmentDescription>CSV, JSON or YAML</AttachmentDescription>
                        </AttachmentContent>
                    </Attachment>
                </div>
                <div className="flex flex-col gap-1.5">
                    <Caption>uploading</Caption>
                    <Attachment state="uploading">
                        <AttachmentMedia>
                            <Spinner />
                        </AttachmentMedia>
                        <AttachmentContent>
                            <AttachmentTitle>orders-2026-10.csv</AttachmentTitle>
                            <AttachmentDescription>2.1 of 4.2 KB</AttachmentDescription>
                        </AttachmentContent>
                    </Attachment>
                </div>
                <div className="flex flex-col gap-1.5">
                    <Caption>processing</Caption>
                    <Attachment state="processing">
                        <AttachmentMedia>
                            <FileSpreadsheetIcon />
                        </AttachmentMedia>
                        <AttachmentContent>
                            <AttachmentTitle>orders-2026-10.csv</AttachmentTitle>
                            <AttachmentDescription>Checking against the orders rules</AttachmentDescription>
                        </AttachmentContent>
                    </Attachment>
                </div>
                <div className="flex flex-col gap-1.5">
                    <Caption>error</Caption>
                    <Attachment state="error">
                        <AttachmentMedia>
                            <FileSpreadsheetIcon />
                        </AttachmentMedia>
                        <AttachmentContent>
                            <AttachmentTitle>orders-2026-09.csv</AttachmentTitle>
                            <AttachmentDescription>Larger than the 16 MB limit</AttachmentDescription>
                        </AttachmentContent>
                        <AttachmentActions>
                            <AttachmentAction aria-label="Retry">
                                <RotateCcwIcon />
                            </AttachmentAction>
                        </AttachmentActions>
                    </Attachment>
                </div>
                <div className="flex flex-col gap-1.5">
                    <Caption>done</Caption>
                    <Csv size="default" orientation="horizontal" />
                </div>
            </div>
        </Ground>
    ),
}

export const InAMessage: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-2xl flex-col gap-4">
                <Message align="end">
                    <MessageContent>
                        <AttachmentGroup>
                            <Csv size="sm" orientation="horizontal" />
                            <Attachment size="sm">
                                <AttachmentMedia>
                                    <FileTextIcon />
                                </AttachmentMedia>
                                <AttachmentContent>
                                    <AttachmentTitle>import-orders.yaml</AttachmentTitle>
                                    <AttachmentDescription>Job, 0.6 KB</AttachmentDescription>
                                </AttachmentContent>
                            </Attachment>
                        </AttachmentGroup>
                        <Bubble align="end">
                            <BubbleContent>Why did import-orders fail at 14:02 with these orders?</BubbleContent>
                        </Bubble>
                    </MessageContent>
                </Message>
            </div>
        </Ground>
    ),
}
