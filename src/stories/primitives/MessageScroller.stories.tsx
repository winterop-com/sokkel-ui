import type { Meta, StoryObj } from '@storybook/react-vite'
import { BotIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Bubble, BubbleContent } from '../../components/ui/bubble'
import { Message, MessageAvatar, MessageContent, MessageFooter } from '../../components/ui/message'
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from '../../components/ui/message-scroller'

/**
 * The scrolling column a conversation lives in. It opens at the end, and a button appears to
 * return there once the reader scrolls back.
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

const TURNS: { id: string; from: 'person' | 'assistant'; text: string; at: string }[] = [
    { id: 'm1', from: 'person', text: 'Which pipelines ran this morning?', at: '2026-11-04 09:12' },
    {
        id: 'm2',
        from: 'assistant',
        text: 'Four: dhis2-play, weather-gate, fhir-tour and connections-tour. Three succeeded; fhir-tour failed at 09:41.',
        at: '2026-11-04 09:12',
    },
    { id: 'm3', from: 'person', text: 'Why did fhir-tour fail?', at: '2026-11-04 09:13' },
    {
        id: 'm4',
        from: 'assistant',
        text: 'The block fhir.bundle rejected a Patient resource without an identifier. The schema patient-v2 requires one.',
        at: '2026-11-04 09:13',
    },
    { id: 'm5', from: 'person', text: 'Rerun it with the fixed export.', at: '2026-11-04 09:20' },
    { id: 'm6', from: 'assistant', text: 'Run 01a1a4f0 of fhir-tour succeeded in 3.8s.', at: '2026-11-04 09:21' },
    { id: 'm7', from: 'person', text: 'Why did weather-gate fail at 14:02?', at: '2026-11-04 14:03' },
    {
        id: 'm8',
        from: 'assistant',
        text: 'The gate step found no forecast rows for station SN18700, so it stopped the run before store.',
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
                                <p className="m-auto text-sm text-muted-foreground">Ask about a pipeline, a run or a connection.</p>
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

const meta: Meta = { title: 'Primitives/Chat/MessageScroller' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <div className="flex w-full max-w-xl flex-col gap-2">
                    <Caption>opens at the end</Caption>
                    <Column turns={TURNS} position="end" />
                </div>
                <div className="flex w-full max-w-xl flex-col gap-2">
                    <Caption>opens at the start</Caption>
                    <Column turns={TURNS} position="start" />
                </div>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <div className="flex w-full max-w-xl flex-col gap-2">
                    <Caption>empty</Caption>
                    <Column turns={[]} position="end" />
                </div>
                <div className="flex w-full max-w-xl flex-col gap-2">
                    <Caption>short, nothing to scroll</Caption>
                    <Column turns={TURNS.slice(0, 2)} position="end" />
                </div>
            </div>
        </Ground>
    ),
}
