import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Row } from '@winterop-com/sokkel-ui/Layout'
import { NotificationInbox, type Notice } from '@winterop-com/sokkel-ui/NotificationInbox'

/** What the app has told the viewer, behind a bell that counts the unread: a list of notices, newest first, with Mark all as read. */
const meta: Meta = { title: 'Patterns/Notification inbox' }
export default meta

const NOTICES: Notice[] = [
    {
        id: 'n-1',
        title: 'nightly-export failed',
        body: 'The upload step timed out after 3 tries.',
        when: '4 min ago',
        tone: 'critical',
        unread: true,
    },
    { id: 'n-2', title: 'grace mentioned you', body: 'In harbor: "can you look at the sync before 10?"', when: '18 min ago', unread: true },
    {
        id: 'n-3',
        title: 'sync-inventory completed with errors',
        body: '12 rows were skipped in validate.',
        when: '1 h ago',
        tone: 'warning',
        unread: true,
    },
    { id: 'n-4', title: 'rebuild-index succeeded', when: 'Yesterday at 23:10', tone: 'good' },
    { id: 'n-5', title: 'linus added you to larkspur', when: 'Monday' },
]

function InboxStory({ start, open }: { start: Notice[]; open?: boolean }) {
    const [notices, setNotices] = useState(start)
    return (
        <Row justify="end" className="p-6">
            <NotificationInbox
                notices={notices}
                defaultOpen={open}
                onOpen={(id) => setNotices(notices.map((notice) => (notice.id === id ? { ...notice, unread: false } : notice)))}
                onMarkAllRead={() => setNotices(notices.map((notice) => ({ ...notice, unread: false })))}
            />
        </Row>
    )
}

/** The bell with three unread; press it to open the inbox. */
export const Bell: StoryObj = { render: () => <InboxStory start={NOTICES} /> }

/** The inbox open: the unread on a wash with a dot, each notice's tone at its start. Press one to read it, or mark them all read. */
export const Open: StoryObj = { render: () => <InboxStory start={NOTICES} open /> }

/** Nothing in the inbox: it says so. */
export const Empty: StoryObj = { render: () => <InboxStory start={[]} open /> }
