import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleXIcon, PauseIcon, PlayIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Bubble, BubbleContent } from '@winterop-com/sokkel-ui/primitives/bubble'
import { Marker, MarkerContent, MarkerIcon } from '@winterop-com/sokkel-ui/primitives/marker'
import { Message, MessageContent } from '@winterop-com/sokkel-ui/primitives/message'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

/** A quiet line between messages: a date, an event, or a note that something happened. */
function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

const meta: Meta = { title: 'Primitives/Chat/Marker', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Stack gap="xl" className="max-w-2xl">
            {(['default', 'separator', 'border'] as const).map((variant) => (
                <Stack key={variant} gap="sm">
                    <Caption>{variant}</Caption>
                    <Marker variant={variant}>
                        <MarkerContent>2026-11-04</MarkerContent>
                    </Marker>
                </Stack>
            ))}
            <Stack gap="sm">
                <Caption>with icon</Caption>
                <Marker>
                    <MarkerIcon>
                        <PlayIcon />
                    </MarkerIcon>
                    <MarkerContent>Run 01a1a5c2 of import-orders started at 14:02</MarkerContent>
                </Marker>
            </Stack>
            <Stack gap="sm">
                <Caption>with a link</Caption>
                <Marker>
                    <MarkerIcon>
                        <CircleXIcon />
                    </MarkerIcon>
                    <MarkerContent>
                        Run 01a1a5c2 failed. <a href="#run">Open the run</a>
                    </MarkerContent>
                </Marker>
            </Stack>
        </Stack>
    ),
}

export const Timeline: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-2xl">
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
        </Stack>
    ),
}
