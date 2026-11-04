import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleXIcon, PauseIcon, PlayIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Bubble, BubbleContent } from '../../components/ui/bubble'
import { Marker, MarkerContent, MarkerIcon } from '../../components/ui/marker'
import { Message, MessageContent } from '../../components/ui/message'

/** A quiet line between messages: a date, an event, or a note that something happened. */
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

const meta: Meta = { title: 'Primitives/Chat/Marker' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-2xl flex-col gap-6">
                {(['default', 'separator', 'border'] as const).map((variant) => (
                    <div key={variant} className="flex flex-col gap-2">
                        <Caption>{variant}</Caption>
                        <Marker variant={variant}>
                            <MarkerContent>2026-11-04</MarkerContent>
                        </Marker>
                    </div>
                ))}
                <div className="flex flex-col gap-2">
                    <Caption>with icon</Caption>
                    <Marker>
                        <MarkerIcon>
                            <PlayIcon />
                        </MarkerIcon>
                        <MarkerContent>Run 01a1a5c2 of import-orders started at 14:02</MarkerContent>
                    </Marker>
                </div>
                <div className="flex flex-col gap-2">
                    <Caption>with a link</Caption>
                    <Marker>
                        <MarkerIcon>
                            <CircleXIcon />
                        </MarkerIcon>
                        <MarkerContent>
                            Run 01a1a5c2 failed. <a href="#run">Open the run</a>
                        </MarkerContent>
                    </Marker>
                </div>
            </div>
        </Ground>
    ),
}

export const Timeline: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-2xl flex-col gap-4">
                <Marker variant="separator">
                    <MarkerContent>2026-11-04</MarkerContent>
                </Marker>
                <Message align="end">
                    <MessageContent>
                        <Bubble align="end">
                            <BubbleContent>Pause sync-inventory until the api service is back.</BubbleContent>
                        </Bubble>
                    </MessageContent>
                </Message>
                <Marker>
                    <MarkerIcon>
                        <PauseIcon />
                    </MarkerIcon>
                    <MarkerContent>Schedule every-hour on sync-inventory paused at 14:06</MarkerContent>
                </Marker>
                <Message>
                    <MessageContent>
                        <Bubble variant="muted">
                            <BubbleContent>Paused. It will not run until you resume the schedule.</BubbleContent>
                        </Bubble>
                    </MessageContent>
                </Message>
            </div>
        </Ground>
    ),
}
