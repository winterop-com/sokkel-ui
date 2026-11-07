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
} from '@winterop-com/sokkel-ui/primitives/attachment'
import { Bubble, BubbleContent } from '@winterop-com/sokkel-ui/primitives/bubble'
import { Message, MessageContent } from '@winterop-com/sokkel-ui/primitives/message'
import { Spinner } from '@winterop-com/sokkel-ui/primitives/spinner'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/** A file a person adds to a message: a media tile, a name, a line of detail, and its actions. */
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

const meta: Meta = { title: 'Primitives/Chat/Attachment', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <>
            {(['horizontal', 'vertical'] as const).map((orientation) => (
                <Row key={orientation} gap="xl" align="start" wrap>
                    {(['default', 'sm', 'xs'] as const).map((size) => (
                        <Stack key={size} gap="xs">
                            <Caption>
                                {orientation}, {size}
                            </Caption>
                            <Csv size={size} orientation={orientation} />
                        </Stack>
                    ))}
                </Row>
            ))}
            <Row gap="xl" align="start" wrap>
                <Stack gap="xs">
                    <Caption>media only</Caption>
                    <Attachment>
                        <AttachmentMedia>
                            <FileJsonIcon />
                        </AttachmentMedia>
                    </Attachment>
                </Stack>
                <Stack gap="xs">
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
                </Stack>
                <Stack gap="xs">
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
                </Stack>
            </Row>
        </>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="start" wrap>
            <Stack gap="xs">
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
            </Stack>
            <Stack gap="xs">
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
            </Stack>
            <Stack gap="xs">
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
            </Stack>
            <Stack gap="xs">
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
            </Stack>
            <Stack gap="xs">
                <Caption>done</Caption>
                <Csv size="default" orientation="horizontal" />
            </Stack>
        </Row>
    ),
}

export const InAMessage: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-2xl">
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
        </Stack>
    ),
}
