import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckIcon, RotateCcwIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from '@winterop-com/sokkel-ui/primitives/bubble'
import { Message, MessageContent } from '@winterop-com/sokkel-ui/primitives/message'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/** The shaped surface a message's text sits on, in seven tones, either side of the column. */
function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

const VARIANTS = ['default', 'secondary', 'muted', 'tinted', 'outline', 'ghost', 'destructive'] as const

const meta: Meta = { title: 'Primitives/Chat/Bubble', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-2xl">
            {VARIANTS.map((variant) => (
                <Stack key={variant} gap="xs">
                    <Caption>{variant}</Caption>
                    <Bubble variant={variant}>
                        <BubbleContent>Run 01a1a5c2 of import-orders failed at the validate step after 0.3s.</BubbleContent>
                    </Bubble>
                </Stack>
            ))}
            <Stack gap="xs">
                <Caption>align end</Caption>
                <Bubble align="end">
                    <BubbleContent>Why did it fail?</BubbleContent>
                </Bubble>
            </Stack>
            <Stack gap="xs" className="pb-4">
                <Caption>with reactions</Caption>
                <Bubble variant="muted">
                    <BubbleContent>The service api is healthy again.</BubbleContent>
                    <BubbleReactions>
                        <CheckIcon className="size-3.5" />
                    </BubbleReactions>
                </Bubble>
            </Stack>
        </Stack>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-2xl">
            <Stack gap="xs">
                <Caption>interactive, rendered as a button</Caption>
                <Bubble variant="outline">
                    <BubbleContent render={<button type="button" />}>
                        <Row as="span" gap="xs" inline>
                            <RotateCcwIcon className="size-3.5" />
                            Rerun import-orders
                        </Row>
                    </BubbleContent>
                </Bubble>
            </Stack>
            <Stack gap="xs">
                <Caption>error</Caption>
                <Bubble variant="destructive">
                    <BubbleContent>The message could not be sent. The server answered 503.</BubbleContent>
                </Bubble>
            </Stack>
            <Stack gap="xs">
                <Caption>a long unbroken value</Caption>
                <Bubble variant="muted">
                    <BubbleContent>
                        source-url=https://api.example.org/v1/orders/export?project=larkspur&amp;month=2026-10&amp;after=ord-10412
                    </BubbleContent>
                </Bubble>
            </Stack>
        </Stack>
    ),
}

export const Exchange: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-2xl">
            <Message align="end">
                <MessageContent>
                    <BubbleGroup>
                        <Bubble align="end">
                            <BubbleContent>Is the schedule on nightly-export still active?</BubbleContent>
                        </Bubble>
                        <Bubble align="end">
                            <BubbleContent>It ran at 14:02 and I did not expect that.</BubbleContent>
                        </Bubble>
                    </BubbleGroup>
                </MessageContent>
            </Message>
            <Message>
                <MessageContent>
                    <BubbleGroup>
                        <Bubble variant="muted">
                            <BubbleContent>Yes. The schedule every-hour fires at minute 2, so the next run is at 15:02.</BubbleContent>
                        </Bubble>
                        <Bubble variant="tinted">
                            <BubbleContent>Pause it from the Schedules page, or say so here and I will.</BubbleContent>
                        </Bubble>
                    </BubbleGroup>
                </MessageContent>
            </Message>
        </Stack>
    ),
}
