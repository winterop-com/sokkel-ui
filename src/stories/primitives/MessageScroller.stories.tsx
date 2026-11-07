import type { Meta, StoryObj } from '@storybook/react-vite'
import { BotIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Bubble, BubbleContent } from '@winterop-com/sokkel-ui/primitives/bubble'
import { Message, MessageAvatar, MessageContent, MessageFooter } from '@winterop-com/sokkel-ui/primitives/message'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from '@winterop-com/sokkel-ui/primitives/message-scroller'

/**
 * The scrolling column a conversation lives in. It opens at the end, and a button appears to
 * return there once the reader scrolls back.
 */
function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

const TURNS: { id: string; from: 'person' | 'assistant'; text: string; at: string }[] = [
    { id: 'm1', from: 'person', text: 'Which jobs ran this morning?', at: '2026-11-04 09:12' },
    {
        id: 'm2',
        from: 'assistant',
        text: 'Four: nightly-export, sync-inventory, rebuild-index and send-digest. Three succeeded; sync-inventory failed at 09:41.',
        at: '2026-11-04 09:12',
    },
    { id: 'm3', from: 'person', text: 'Why did sync-inventory fail?', at: '2026-11-04 09:13' },
    {
        id: 'm4',
        from: 'assistant',
        text: 'The step transform rejected an item of inventory.json without a SKU. The rules for inventory require one.',
        at: '2026-11-04 09:13',
    },
    { id: 'm5', from: 'person', text: 'Rerun it with the fixed export.', at: '2026-11-04 09:20' },
    { id: 'm6', from: 'assistant', text: 'Run 01a1a4f0 of sync-inventory succeeded in 3.8s.', at: '2026-11-04 09:21' },
    { id: 'm7', from: 'person', text: 'Why did import-orders fail at 14:02?', at: '2026-11-04 14:03' },
    {
        id: 'm8',
        from: 'assistant',
        text: 'The validate step found 37 rows of orders-2026-10.csv whose amount is not a number, so it stopped the run before upload.',
        at: '2026-11-04 14:03',
    },
]

function Turn({ turn }: { turn: (typeof TURNS)[number] }) {
    const mine = turn.from === 'person'
    return (
        <Message align={mine ? 'end' : 'start'}>
            {mine ? null : (
                <MessageAvatar className="size-8 text-muted-foreground">
                    <BotIcon className="size-4" />
                </MessageAvatar>
            )}
            <MessageContent>
                <Bubble align={mine ? 'end' : 'start'} variant={mine ? 'default' : 'muted'}>
                    <BubbleContent>{turn.text}</BubbleContent>
                </Bubble>
                <MessageFooter>{turn.at}</MessageFooter>
            </MessageContent>
        </Message>
    )
}

function Column({ turns, position }: { turns: typeof TURNS; position: 'start' | 'end' }) {
    return (
        <div className="h-96 w-full max-w-xl rounded-lg border border-border">
            <MessageScrollerProvider defaultScrollPosition={position}>
                <MessageScroller>
                    <MessageScrollerViewport aria-label="Conversation">
                        <MessageScrollerContent className="p-4">
                            {turns.length === 0 ? (
                                <p className="m-auto text-sm text-muted-foreground">Ask about a job, a run or a service.</p>
                            ) : (
                                turns.map((turn) => (
                                    <MessageScrollerItem key={turn.id} messageId={turn.id} scrollAnchor={turn.from === 'person'}>
                                        <Turn turn={turn} />
                                    </MessageScrollerItem>
                                ))
                            )}
                        </MessageScrollerContent>
                    </MessageScrollerViewport>
                    <MessageScrollerButton direction="start" />
                    <MessageScrollerButton direction="end" />
                </MessageScroller>
            </MessageScrollerProvider>
        </div>
    )
}

const meta: Meta = { title: 'Primitives/Chat/MessageScroller', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Stack gap="sm" className="w-full max-w-xl">
                <Caption>opens at the end</Caption>
                <Column turns={TURNS} position="end" />
            </Stack>
            <Stack gap="sm" className="w-full max-w-xl">
                <Caption>opens at the start</Caption>
                <Column turns={TURNS} position="start" />
            </Stack>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Stack gap="sm" className="w-full max-w-xl">
                <Caption>empty</Caption>
                <Column turns={[]} position="end" />
            </Stack>
            <Stack gap="sm" className="w-full max-w-xl">
                <Caption>short, nothing to scroll</Caption>
                <Column turns={TURNS.slice(0, 2)} position="end" />
            </Stack>
        </Row>
    ),
}
