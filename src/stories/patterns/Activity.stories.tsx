import type { Meta, StoryObj } from '@storybook/react-vite'
import { AtSign, CircleAlert, CircleCheck, Play, Trash2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'

import { ActivityList, ActivityMenu, type ActivityItem } from '@winterop-com/sokkel-ui/ActivityList'
import { AppBar } from '@winterop-com/sokkel-ui/AppBar'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * What happened while the person was away, or needs following up. The bell in the top bar counts
 * what is unread; the list keeps items until they are read, newest first, and each one carries its
 * own way to act. A toast for something just done never stands alone: the same event is here too.
 */
const meta: Meta = { title: 'Patterns/Activity' }
export default meta

const job = (code: string) => <span className="font-mono">{code}</span>

const ITEMS: ActivityItem[] = [
    {
        id: 'failed',
        group: 'Today',
        icon: <CircleAlert />,
        tone: 'critical',
        text: <>{job('nightly-export')} failed 3 runs in a row</>,
        when: '2 hours ago',
        unread: true,
        action: { label: 'Open', onClick: () => undefined },
    },
    {
        id: 'mention',
        group: 'Today',
        icon: <AtSign />,
        tone: 'info',
        text: <>grace mentioned you on {job('report-sync')}</>,
        when: '12 minutes ago',
        unread: true,
        action: { label: 'Reply', onClick: () => undefined },
    },
    {
        id: 'slow',
        group: 'Today',
        icon: <TriangleAlert />,
        tone: 'warning',
        text: <>{job('import-orders')} took 3 times its usual 1m 12s</>,
        when: '4 hours ago',
        unread: true,
    },
    {
        id: 'deleted',
        group: 'Yesterday',
        icon: <Trash2 />,
        tone: 'quiet',
        text: <>You deleted {job('weekly-digest')}</>,
        when: 'Yesterday, 16:40',
        action: { label: 'Restore', onClick: () => undefined },
    },
    {
        id: 'resumed',
        group: 'Yesterday',
        icon: <Play />,
        tone: 'quiet',
        text: <>ada resumed {job('archive-sweep')}</>,
        when: 'Yesterday, 09:12',
    },
    {
        id: 'deploy',
        group: 'Yesterday',
        icon: <CircleCheck />,
        tone: 'good',
        text: <>linus deployed harbor 1.4.0</>,
        when: 'Yesterday, 08:30',
    },
]

function useItems(start: ActivityItem[]) {
    const [items, setItems] = useState(start)
    return {
        items,
        onRead: (id: string) => setItems((was) => was.map((item) => (item.id === id ? { ...item, unread: false } : item))),
        onReadAll: () => setItems((was) => was.map((item) => ({ ...item, unread: false }))),
    }
}

function InTopBar({ start = ITEMS }: { start?: ActivityItem[] }) {
    const activity = useItems(start)
    return (
        <TooltipProvider>
            <Stack gap="none" className="min-h-svh bg-background text-foreground">
                <AppBar
                    mark={<TidevannMark />}
                    trail={[{ label: 'Tidevann', href: '#' }, { label: 'Runs' }]}
                    onSearch={() => undefined}
                    actions={
                        <>
                            <ActivityMenu {...activity} defaultOpen />
                        </>
                    }
                />
            </Stack>
        </TooltipProvider>
    )
}

/** The bell in the top bar, open: three unread items today, three read ones from yesterday. */
export const TopBarMenu: StoryObj = { name: 'From the top bar', render: () => <InTopBar /> }

function InPanel() {
    const activity = useItems(ITEMS)
    return (
        <Row gap="none" align="stretch" justify="end" className="min-h-svh bg-background text-foreground">
            <Stack as="aside" gap="none" className="h-svh w-[24rem] max-w-full border-l border-border-strong bg-sidebar">
                <ActivityList {...activity} className="h-full" />
            </Stack>
        </Row>
    )
}

/** The same list as a side panel's content, where it can stay open beside the work. */
export const InSidePanel: StoryObj = { name: 'In a side panel', render: () => <InPanel /> }

/** Everything read: no count on the bell, and Mark all read has nothing to do. */
export const AllRead: StoryObj = {
    name: 'All read',
    render: () => <InTopBar start={ITEMS.map((item) => ({ ...item, unread: false }))} />,
}

/** Nothing has happened yet. */
export const Empty: StoryObj = { render: () => <InTopBar start={[]} /> }
