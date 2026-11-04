import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarClock, FileText, FolderGit2, ListChecks, Moon, Play, Plus, Settings, Users } from 'lucide-react'
import { useCallback, useState } from 'react'

import { CommandPalette, usePaletteShortcut, type PaletteGroup } from '../../components/CommandPalette'
import { Button } from '../../components/ui/button'
import { Kbd } from '../../components/ui/kbd'

/** The palette open over an app, with places, actions and recent records. */
const GROUPS: PaletteGroup[] = [
    {
        title: 'Go to',
        commands: [
            { id: 'runs', label: 'Runs', icon: Play, keys: ['G', 'R'], onSelect: () => undefined },
            { id: 'jobs', label: 'Jobs', icon: ListChecks, keys: ['G', 'J'], onSelect: () => undefined },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, onSelect: () => undefined },
            { id: 'projects', label: 'Projects', icon: FolderGit2, onSelect: () => undefined },
            { id: 'people', label: 'People', icon: Users, onSelect: () => undefined },
        ],
    },
    {
        title: 'Create',
        commands: [
            { id: 'new-job', label: 'New job', icon: Plus, keys: ['C'], onSelect: () => undefined },
            { id: 'new-schedule', label: 'New schedule', icon: Plus, onSelect: () => undefined },
        ],
    },
    {
        title: 'Recent',
        commands: [
            { id: 'r-export', label: 'nightly-export', icon: FileText, hint: 'job, failed 02:00', onSelect: () => undefined },
            { id: 'r-import', label: 'import-orders', icon: FileText, hint: 'job, running', onSelect: () => undefined },
        ],
    },
    {
        title: 'App',
        commands: [
            { id: 'theme', label: 'Switch to light', icon: Moon, keywords: ['theme', 'dark', 'scheme'], onSelect: () => undefined },
            { id: 'settings', label: 'Settings', icon: Settings, keys: ['⌘', ','], onSelect: () => undefined },
        ],
    },
]

const SHORT: PaletteGroup[] = [
    {
        title: 'Go to',
        commands: [
            { id: 'runs', label: 'Runs', icon: Play, keys: ['G', 'R'], onSelect: () => undefined },
            { id: 'jobs', label: 'Jobs', icon: ListChecks, keys: ['G', 'J'], onSelect: () => undefined },
            { id: 'settings', label: 'Settings', icon: Settings, keys: ['⌘', ','], onSelect: () => undefined },
        ],
    },
]

function Palette({ initial, groups = GROUPS, query }: { initial: boolean; groups?: PaletteGroup[]; query?: string }) {
    const [open, setOpen] = useState(initial)
    const show = useCallback(() => setOpen(true), [])
    usePaletteShortcut(show)
    return (
        <div className="flex min-h-svh flex-col items-center gap-3 bg-background p-6 text-foreground">
            <Button variant="outline" size="sm" onClick={show}>
                Open the palette <Kbd>⌘K</Kbd>
            </Button>
            <CommandPalette open={open} onOpenChange={setOpen} groups={groups} defaultQuery={query} />
        </div>
    )
}

const meta: Meta = { title: 'Patterns/Command palette' }
export default meta

export const Closed: StoryObj = { render: () => <Palette initial={false} /> }
/** A few commands: the palette is as tall as its rows, with no scrolling. */
export const Short: StoryObj = { render: () => <Palette initial groups={SHORT} /> }
/** Many commands: the list scrolls and fades at its bottom edge. */
export const Open: StoryObj = { name: 'Long', render: () => <Palette initial /> }
/** A search narrowing the long list to what matches. */
export const Searching: StoryObj = { render: () => <Palette initial query="new" /> }
/** A search that matches nothing. */
export const NoMatch: StoryObj = { name: 'No match', render: () => <Palette initial query="invoices" /> }
