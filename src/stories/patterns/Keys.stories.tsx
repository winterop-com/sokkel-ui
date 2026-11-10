import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarClock, Keyboard, Play, Workflow } from 'lucide-react'
import { useState } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { useShortcuts } from '@winterop-com/sokkel-ui/hooks/use-shortcuts'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { LogView, type LogLine } from '@winterop-com/sokkel-ui/LogView'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page, Shell, useShell } from '@winterop-com/sokkel-ui/Shell'
import type { ShortcutGroup } from '@winterop-com/sokkel-ui/ShortcutsDialog'
import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Kbd } from '@winterop-com/sokkel-ui/primitives/kbd'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * Keys a screen binds with `useShortcuts` while it is mounted, answered by the `Shell` around it:
 * matched by the character typed, so they work on any keyboard layout, quiet while typing in a field
 * and under a dialog, and listed by the shell's shortcuts dialog with the keys the shell binds itself
 * (⌘K or Ctrl+K for the palette, `?` for the dialog) and those the app answers on its own.
 */
const meta: Meta = { title: 'Patterns/Keys' }
export default meta

const PLACES: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#', active: true },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#' },
        ],
    },
]

/**
 * Keys the app answers itself, outside the registry, listed after the bound ones, and the search's
 * bound `/` in the app's own words, which take its place.
 */
const APP_KEYS: ShortcutGroup[] = [
    {
        title: 'General',
        shortcuts: [
            { id: 'search', action: "Search this screen's listing", keys: ['/'] },
            { id: 'close', action: 'Close a dialog or a menu', keys: ['Esc'] },
        ],
    },
]

interface Step {
    step: string
    status: Status
    took: string
}

const STEPS: Step[] = [
    { step: 'fetch', status: 'succeeded', took: '0.8s' },
    { step: 'transform', status: 'succeeded', took: '2.1s' },
    { step: 'validate', status: 'failed', took: '0.3s' },
    { step: 'upload', status: 'skipped', took: '-' },
    { step: 'notify', status: 'skipped', took: '-' },
]

const COLUMNS: DataColumn<Step>[] = [
    { id: 'step', header: 'Step', width: 'minmax(0,1fr)', cell: (row) => <span className="font-mono">{row.step}</span> },
    { id: 'status', header: 'State', width: '8rem', cell: (row) => <StatusChip status={row.status} /> },
    { id: 'took', header: 'Took', width: '4rem', align: 'end', cell: (row) => <span className="font-mono text-xs">{row.took}</span> },
]

const LOG: LogLine[] = [
    { at: '02:00:00', level: 'info', source: 'fetch', text: 'read 1,204 rows from orders' },
    { at: '02:00:02', level: 'info', source: 'transform', text: 'mapped 1,204 rows' },
    { at: '02:00:03', level: 'error', source: 'validate', text: 'row 318: total is negative (-12.50)' },
]

/** A run's page: it binds keys for what can be done with the run while it is shown. */
function RunScreen() {
    const [status, setStatus] = useState<Status>('failed')
    const [log, setLog] = useState(false)
    const [query, setQuery] = useState('')
    const { openShortcuts } = useShell()
    useShortcuts(
        [
            { id: 'rerun', key: 'r', label: 'Run again', group: 'This run', run: () => setStatus('queued') },
            {
                id: 'resume',
                key: 'r',
                shift: true,
                label: 'Run again from the failed step',
                group: 'This run',
                run: () => setStatus('running'),
            },
            { id: 'log', key: 'l', label: log ? 'Hide the log' : 'Show the log', group: 'This run', run: () => setLog(!log) },
        ],
        [log],
    )
    const steps = STEPS.filter((row) => row.step.includes(query.trim()))
    return (
        <Page>
            <PageHeader
                title="nightly-export"
                code="01a1a5c2"
                meta={<StatusChip status={status} />}
                actions={
                    <>
                        <Button size="sm" variant="ghost" onClick={openShortcuts}>
                            Shortcuts <Kbd>?</Kbd>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setLog(!log)}>
                            {log ? 'Hide the log' : 'Show the log'} <Kbd>L</Kbd>
                        </Button>
                        <Button size="sm" onClick={() => setStatus('queued')}>
                            Run again <Kbd>R</Kbd>
                        </Button>
                    </>
                }
            />
            <DataTable
                minWidth="auto"
                columns={COLUMNS}
                rows={steps}
                rowKey={(row) => row.step}
                search={<SearchField value={query} onChange={setQuery} placeholder="Search the steps" />}
            />
            {log && <LogView lines={LOG} />}
        </Page>
    )
}

function KeysFrame({ dialog = false, palette = false }: { dialog?: boolean; palette?: boolean }) {
    const [keysOpen, setKeysOpen] = useState(dialog)
    return (
        <TooltipProvider>
            <Shell
                palette={[
                    ...placeCommands(PLACES, () => undefined),
                    {
                        title: 'Help',
                        commands: [
                            {
                                id: 'shortcuts',
                                label: 'Keyboard shortcuts',
                                icon: Keyboard,
                                keys: ['?'],
                                onSelect: () => setKeysOpen(true),
                            },
                        ],
                    },
                ]}
                defaultPaletteOpen={palette}
                shortcuts={APP_KEYS}
                shortcutsOpen={keysOpen}
                onShortcutsOpenChange={setKeysOpen}
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={PLACES}
                        foot={<AccountMenu name="ada" where="tidevann.example.org" />}
                    />
                }
                top={
                    <TopBar
                        trail={[
                            { label: 'Runs', href: '#' },
                            { label: '01a1a5c2', code: true },
                        ]}
                    />
                }
            >
                <RunScreen />
            </Shell>
        </TooltipProvider>
    )
}

/**
 * A run's page binds R (run again), Shift+R (from the failed step) and L (the log); its search takes
 * `/`. None of them fires while typing in the search. `?` opens the shortcuts, as the account menu's
 * Keyboard shortcuts does, and the page's Shortcuts button through `useShell`.
 */
export const ScreenKeys: StoryObj = { name: 'Screen keys', render: () => <KeysFrame /> }

/**
 * The shell's shortcuts dialog over the page: the screen's keys under its group, the shell's own
 * under General with the keys the app lists itself, each written as this device writes it. The app
 * lists the search's `/` on its id in its own words, which stand in the bound one's place.
 */
export const Dialog: StoryObj = { name: 'Shortcuts dialog', render: () => <KeysFrame dialog /> }

/**
 * The palette's own row for the shortcuts: the app holds the dialog's state with `shortcutsOpen`
 * and `onShortcutsOpenChange`, so a row built beside the shell opens it.
 */
export const FromPalette: StoryObj = { name: 'From the palette', render: () => <KeysFrame palette /> }
