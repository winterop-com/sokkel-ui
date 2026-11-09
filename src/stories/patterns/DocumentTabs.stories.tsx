import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarDays, FileText, Plus } from 'lucide-react'
import { useState } from 'react'

import { DocumentTabs, type DocumentTab } from '@winterop-com/sokkel-ui/DocumentTabs'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { Markdown } from '@winterop-com/sokkel-ui/Markdown'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

/** The notes open in a work area, a tab each, over the note shown. */
const meta: Meta = { title: 'Patterns/Document tabs', parameters: { layout: 'fullscreen' } }
export default meta

const FEW: DocumentTab[] = [
    { id: 'export', label: 'Nightly export', icon: FileText, title: 'Runbooks / Nightly export' },
    { id: 'retry', label: 'Retry a run', icon: FileText, dirty: true, title: 'Runbooks / Retry a run' },
    { id: 'today', label: '2026-11-09', icon: CalendarDays, title: 'Daily / 2026-11-09' },
]

const MORE: DocumentTab[] = [
    ...FEW,
    ...[
        'Weekly sync with grace',
        'Plan for the quarter in harbor',
        'Questions for margaret',
        'sync-inventory failures',
        'rebuild-index on the worker',
        'send-digest wording',
        'juniper import-orders',
        'On call this week',
        'larkspur bucket retention',
    ].map((label, index) => ({ id: `note-${String(index)}`, label, icon: FileText })),
]

function Tabs({ start, active: first }: { start: readonly DocumentTab[]; active: string }) {
    const [tabs, setTabs] = useState(start)
    const [active, setActive] = useState<string | null>(first)
    const [made, setMade] = useState(0)
    const close = (id: string) => {
        const at = tabs.findIndex((tab) => tab.id === id)
        const rest = tabs.filter((tab) => tab.id !== id)
        setTabs(rest)
        if (active === id) setActive(rest[Math.min(at, rest.length - 1)]?.id ?? null)
    }
    const add = () => {
        const id = `new-${String(made)}`
        setMade(made + 1)
        setTabs([...tabs, { id, label: made === 0 ? 'Untitled' : `Untitled ${String(made + 1)}`, icon: FileText }])
        setActive(id)
    }
    const shown = tabs.find((tab) => tab.id === active)
    return (
        <TooltipProvider>
            <Stack gap="none" className="h-dvh">
                <DocumentTabs
                    tabs={tabs}
                    active={active}
                    onActiveChange={setActive}
                    onClose={close}
                    end={
                        <IconButton label="New note" size="icon-xs" onClick={add}>
                            <Plus />
                        </IconButton>
                    }
                />
                <div className="flex-1 overflow-y-auto p-6">
                    <Markdown
                        content={shown === undefined ? 'No note is open.' : `# ${shown.label}\n\nWhat the note holds.`}
                        scale="document"
                    />
                </div>
            </Stack>
        </TooltipProvider>
    )
}

/** Three notes open, the second with changes not saved yet: its dot turns into the close button as it is pointed at. */
export const Few: StoryObj = { render: () => <Tabs start={FEW} active="export" /> }

/** A dozen notes open, more than the strip has room for: it scrolls sideways, the shown tab kept in view, the new button at its end. */
export const Many: StoryObj = { render: () => <Tabs start={MORE} active="note-6" /> }
