import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'

import { ConversationHistory, type ConversationEntry } from '@winterop-com/sokkel-ui/ConversationHistory'
import { Row } from '@winterop-com/sokkel-ui/Layout'

/**
 * The conversations beside a chat, grouped under Pinned, Today and Earlier with the current one
 * marked. Each conversation's menu, on its button or a right-click, renames it in place, pins it
 * and deletes it after asking; the pin is also a button on the row.
 */
const meta: Meta = { title: 'Patterns/Conversation history', parameters: { frame: 'none' } }
export default meta

/** The instant the story reads its times against: an afternoon, fixed so the story never changes. */
const NOW = new Date(2026, 10, 8, 16, 30).getTime()
const HOUR = 3_600_000
const DAY = 24 * HOUR

const CONVERSATIONS: ConversationEntry[] = [
    { id: 'c1', title: 'Why nightly-export failed', time: NOW - 0.4 * HOUR },
    { id: 'c2', title: 'Retry policy for sync-inventory', time: NOW - 3 * HOUR, pinned: true },
    { id: 'c3', title: 'Rebuild the index without downtime', time: NOW - 5 * HOUR },
    { id: 'c4', title: 'A digest for the harbor team', time: NOW - 1.2 * DAY },
    { id: 'c5', title: 'Rules for import-orders validation', time: NOW - 3 * DAY, pinned: true },
    { id: 'c6', title: 'Scheduler time zones', time: NOW - 9 * DAY },
    { id: 'c7', title: 'Moving juniper to the new worker', time: NOW - 40 * DAY },
    { id: 'c8', title: 'Upload step timeouts on example.org', time: NOW - 400 * DAY },
]

/** The list in a column of its own beside where the chat would be, at the window's full height. */
function Frame({ children }: { children: ReactNode }) {
    return (
        <Row gap="none" align="stretch" className="h-svh bg-background p-4 text-foreground">
            <div className="w-80 max-w-full min-w-0">{children}</div>
        </Row>
    )
}

function History({ renaming, deleting }: { renaming?: string; deleting?: string }) {
    const [conversations, setConversations] = useState(CONVERSATIONS)
    const [current, setCurrent] = useState('c1')
    return (
        <Frame>
            <ConversationHistory
                className="h-full"
                conversations={conversations}
                current={current}
                now={NOW}
                onSelect={setCurrent}
                onRename={(id, title) => setConversations((all) => all.map((one) => (one.id === id ? { ...one, title } : one)))}
                onPin={(id, pinned) => setConversations((all) => all.map((one) => (one.id === id ? { ...one, pinned } : one)))}
                onDelete={(id) => setConversations((all) => all.filter((one) => one.id !== id))}
                defaultRenaming={renaming}
                defaultDeleting={deleting}
            />
        </Frame>
    )
}

/** Pinned first, then today's and the earlier ones, newest first in each; the current one is filled. */
export const List: StoryObj = { render: () => <History /> }

/** A title being changed in place: Enter or leaving the field keeps it, Escape puts it back. */
export const Renaming: StoryObj = { render: () => <History renaming="c3" /> }

/** Deleting asks first. */
export const Delete: StoryObj = { render: () => <History deleting="c6" /> }

/** No conversation yet. */
export const Empty: StoryObj = {
    render: () => (
        <Frame>
            <ConversationHistory className="h-full" conversations={[]} now={NOW} />
        </Frame>
    ),
}
