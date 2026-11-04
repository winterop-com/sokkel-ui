import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckIcon, RotateCcwIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from '../../components/ui/bubble'
import { Message, MessageContent } from '../../components/ui/message'

/** The shaped surface a message's text sits on, in seven tones, either side of the column. */
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

const VARIANTS = ['default', 'secondary', 'muted', 'tinted', 'outline', 'ghost', 'destructive'] as const

const meta: Meta = { title: 'Primitives/Chat/Bubble' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-2xl flex-col gap-5">
                {VARIANTS.map((variant) => (
                    <div key={variant} className="flex flex-col gap-1.5">
                        <Caption>{variant}</Caption>
                        <Bubble variant={variant}>
                            <BubbleContent>Run 01a1a5c2 of import-orders failed at the validate step after 0.3s.</BubbleContent>
                        </Bubble>
                    </div>
                ))}
                <div className="flex flex-col gap-1.5">
                    <Caption>align end</Caption>
                    <Bubble align="end">
                        <BubbleContent>Why did it fail?</BubbleContent>
                    </Bubble>
                </div>
                <div className="flex flex-col gap-1.5 pb-4">
                    <Caption>with reactions</Caption>
                    <Bubble variant="muted">
                        <BubbleContent>The service api is healthy again.</BubbleContent>
                        <BubbleReactions>
                            <CheckIcon className="size-3.5" />
                        </BubbleReactions>
                    </Bubble>
                </div>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-2xl flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                    <Caption>interactive, rendered as a button</Caption>
                    <Bubble variant="outline">
                        <BubbleContent render={<button type="button" />}>
                            <span className="inline-flex items-center gap-1.5">
                                <RotateCcwIcon className="size-3.5" />
                                Rerun import-orders
                            </span>
                        </BubbleContent>
                    </Bubble>
                </div>
                <div className="flex flex-col gap-1.5">
                    <Caption>error</Caption>
                    <Bubble variant="destructive">
                        <BubbleContent>The message could not be sent. The server answered 503.</BubbleContent>
                    </Bubble>
                </div>
                <div className="flex flex-col gap-1.5">
                    <Caption>a long unbroken value</Caption>
                    <Bubble variant="muted">
                        <BubbleContent>
                            source-url=https://api.example.org/v1/orders/export?project=larkspur&amp;month=2026-10&amp;after=ord-10412
                        </BubbleContent>
                    </Bubble>
                </div>
            </div>
        </Ground>
    ),
}

export const Exchange: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-2xl flex-col gap-4">
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
            </div>
        </Ground>
    ),
}
