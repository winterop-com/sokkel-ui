import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    CalendarClock,
    CircleStop,
    FileText,
    FolderGit2,
    ListChecks,
    ListMusic,
    Moon,
    Play,
    Plus,
    RotateCcw,
    ScrollText,
    Settings,
    Shuffle,
    Users,
    Workflow,
} from 'lucide-react'
import { useCallback, useState } from 'react'

import {
    CommandPalette,
    usePaletteShortcut,
    type PaletteFilter,
    type PaletteFoot,
    type PaletteSearch,
    type PaletteGroup,
} from '@winterop-com/sokkel-ui/CommandPalette'
import { useCommands } from '@winterop-com/sokkel-ui/hooks/use-commands'
import type { Scheme } from '@winterop-com/sokkel-ui/lib/appearance'
import { appearanceCommands, placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Kbd } from '@winterop-com/sokkel-ui/primitives/kbd'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { makeAlbums } from '../fixtures/albums'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { ADA, GRACE, LINUS } from '../fixtures/portraits'
import { searchTidevann } from '../fixtures/search'
import { TidevannMark } from '../fixtures/TidevannMark'

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
            { id: 'new-project', label: 'New project', icon: Plus, disabled: 'Only an owner can make one', onSelect: () => undefined },
        ],
    },
    {
        title: 'Recent',
        commands: [
            { id: 'r-export', label: 'nightly-export', icon: FileText, hint: 'job, failed 02:00', onSelect: () => undefined },
            { id: 'r-import', label: 'import-orders', icon: FileText, hint: 'job, running', onSelect: () => undefined },
            { id: 'r-run', label: 'Last sync-inventory run', icon: FileText, code: '01a1a5c6', onSelect: () => undefined },
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

/** Records as two-line rows: albums with a drawn cover, people with their picture, among one-line commands. */
const TWO_LINES: PaletteGroup[] = [
    {
        title: 'Albums',
        commands: makeAlbums(4).map((album) => ({
            id: album.id,
            label: album.title,
            detail: `${album.artist} · ${String(album.year)}`,
            hint: `${String(album.tracks)} tracks`,
            artwork: <Artwork cover={album.cover} />,
            onSelect: () => undefined,
        })),
    },
    {
        title: 'People',
        commands: [
            {
                id: 'ada',
                label: 'ada',
                detail: 'Owner of nightly-export and import-orders',
                artwork: ADA,
                round: true,
                onSelect: () => undefined,
            },
            { id: 'grace', label: 'grace', detail: 'Owner of rebuild-index', artwork: GRACE, round: true, onSelect: () => undefined },
            { id: 'linus', label: 'linus', detail: 'Owner of sync-inventory', artwork: LINUS, round: true, onSelect: () => undefined },
        ],
    },
    {
        title: 'Jobs',
        commands: [
            {
                id: 'export',
                label: 'nightly-export',
                detail: 'harbor · every night at 02:00 UTC',
                icon: Workflow,
                onSelect: () => undefined,
            },
        ],
    },
    {
        title: 'Play',
        commands: [
            { id: 'shuffle', label: 'Shuffle all', icon: Shuffle, keys: ['S'], onSelect: () => undefined },
            { id: 'queue', label: 'Show the queue', icon: ListMusic, keys: ['Q'], onSelect: () => undefined },
        ],
    },
]

function Palette({
    initial,
    groups = GROUPS,
    query,
    filter,
    foot,
    search,
}: {
    initial: boolean
    groups?: PaletteGroup[]
    query?: string
    filter?: PaletteFilter
    foot?: PaletteFoot
    search?: PaletteSearch
}) {
    const [open, setOpen] = useState(initial)
    const show = useCallback(() => setOpen(true), [])
    usePaletteShortcut(show)
    return (
        <Stack align="center" className="min-h-svh bg-background p-6 text-foreground">
            <Button variant="outline" size="sm" onClick={show}>
                Open the palette <Kbd>⌘K</Kbd>
            </Button>
            <CommandPalette
                open={open}
                onOpenChange={setOpen}
                groups={groups}
                defaultQuery={query}
                filter={filter}
                foot={foot}
                search={search}
            />
        </Stack>
    )
}

const meta: Meta = { title: 'Patterns/Command palette' }
export default meta

export const Closed: StoryObj = { render: () => <Palette initial={false} /> }
/** A few commands: the palette is as tall as its rows, with no scrolling. */
export const Short: StoryObj = { render: () => <Palette initial groups={SHORT} /> }
/** Many commands: the list scrolls and fades at its bottom edge. */
export const Open: StoryObj = { name: 'Long', render: () => <Palette initial /> }
/**
 * A strip at the foot (`foot`): the app's mark and name at its start, and at its end the key that
 * opens the chosen row and the keys that open and close the palette, as the device writes them. On a
 * touch screen the keys give way to Close.
 */
export const Foot: StoryObj = { render: () => <Palette initial foot={{ mark: <TidevannMark />, name: 'Tidevann' }} /> }

/** Rows that do different things and are different things: a verb per group, a kind per row. */
const VERBS: PaletteGroup[] = [
    {
        title: 'Actions',
        verb: 'Run',
        commands: [
            { id: 'rerun', label: 'Rerun nightly-export', icon: RotateCcw, onSelect: () => undefined },
            { id: 'cancel', label: 'Cancel import-orders', icon: CircleStop, onSelect: () => undefined },
        ],
    },
    {
        title: 'Recent',
        commands: [
            { id: 'recent-runs', label: 'Runs', icon: Play, kind: 'Page', onSelect: () => undefined },
            { id: 'recent-export', label: 'nightly-export', icon: Workflow, hint: 'failed 02:00', kind: 'Job', onSelect: () => undefined },
            { id: 'recent-run', label: 'sync-inventory', icon: ScrollText, code: '01a1a5c6', kind: 'Run', onSelect: () => undefined },
            { id: 'recent-harbor', label: 'harbor', icon: FolderGit2, kind: 'Project', onSelect: () => undefined },
        ],
    },
    {
        title: 'Pages',
        kind: 'Page',
        commands: [
            { id: 'jobs', label: 'Jobs', icon: ListChecks, kind: 'Page', keys: ['G', 'J'], onSelect: () => undefined },
            { id: 'people', label: 'People', icon: Users, kind: 'Page', onSelect: () => undefined },
        ],
    },
    {
        title: 'Projects',
        verb: 'Switch',
        commands: [
            { id: 'juniper', label: 'juniper', icon: FolderGit2, onSelect: () => undefined },
            { id: 'larkspur', label: 'larkspur', icon: FolderGit2, onSelect: () => undefined },
        ],
    },
]

/**
 * The foot's verb follows the chosen row: Run on an action, Open on a page or a record, Switch on a
 * project, from `verb` on a row or its group. A row in a mixed group (Recent) ends with its `kind`;
 * a row whose group's `kind` already says it (Pages) does not repeat it.
 */
export const VerbsAndKinds: StoryObj = {
    name: 'Verbs and kinds',
    render: () => <Palette initial groups={VERBS} foot={{ mark: <TidevannMark />, name: 'Tidevann' }} />,
}
/**
 * A search narrowing the long list to what matches. New project cannot be made by this person, so
 * it is listed dimmed with why (`disabled`), and the arrows and Enter pass it over.
 */
export const Searching: StoryObj = { render: () => <Palette initial query="new" /> }
/**
 * Every word typed must match (`filter="terms"`), in a label, a hint or the words a command is found
 * by: "run" lists Runs, whose label starts with it, first, then the labels holding it, then a job
 * found by its hint.
 */
export const EveryWord: StoryObj = { name: 'Every word', render: () => <Palette initial query="run" filter="terms" /> }
/** A search that matches nothing. */
export const NoMatch: StoryObj = { name: 'No match', render: () => <Palette initial query="invoices" /> }
/**
 * A pasted run id no command holds: the app's search (`search`) finds the run, and the first of its
 * results is active as they arrive, so Enter opens it without an arrow pressed first.
 */
export const SearchResults: StoryObj = {
    name: 'Search results',
    render: () => (
        <Palette
            initial
            query="01a1a5b9"
            filter="terms"
            foot={{ mark: <TidevannMark />, name: 'Tidevann' }}
            search={{ search: (query) => searchTidevann(query, 4), onOpen: () => undefined }}
        />
    ),
}
/** Records as two lines, a drawn cover or a picture at the start, a person's round; one-line commands keep their height. */
export const TwoLines: StoryObj = { name: 'Two lines', render: () => <Palette initial groups={TWO_LINES} /> }

const LOOKS = [
    { value: 'paper', label: 'Paper' },
    { value: 'contrast', label: 'Contrast' },
    { value: 'steel', label: 'Steel' },
]

/**
 * The look's commands for an app that keeps its scheme and theme itself, under its own keys:
 * `appearanceCommands` takes each part with its callback, the choice in use hinted, and changes
 * nothing it was not given.
 */
function AppLook() {
    const [open, setOpen] = useState(true)
    const [scheme, setScheme] = useState<Scheme>('dark')
    const [theme, setTheme] = useState('paper')
    const groups = appearanceCommands({ scheme, onSchemeChange: setScheme, theme, onThemeChange: setTheme }, { themes: LOOKS })
    return (
        <Stack align="center" className="min-h-svh bg-background p-6 text-foreground">
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                Open the palette <Kbd>⌘K</Kbd>
            </Button>
            <CommandPalette open={open} onOpenChange={setOpen} groups={groups} />
        </Stack>
    )
}

/** The scheme and theme commands of an app that keeps its look itself, dark and Paper in use. */
export const OwnLook: StoryObj = { name: 'Own look', render: () => <AppLook /> }

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

/** A run's page: while it is shown, the palette offers what can be done with the run, before the app's own places. */
function RunPage() {
    const [state, setState] = useState<'failed' | 'queued' | 'cancelled'>('failed')
    useCommands(
        [
            {
                title: 'This run',
                commands: [
                    { id: 'rerun', label: 'Run again', icon: RotateCcw, keys: ['R'], onSelect: () => setState('queued') },
                    { id: 'log', label: 'Open the log', icon: ScrollText, keys: ['L'], onSelect: () => undefined },
                    ...(state === 'queued'
                        ? [{ id: 'cancel', label: 'Cancel', icon: CircleStop, onSelect: () => setState('cancelled') }]
                        : []),
                ],
            },
        ],
        [state],
    )
    return (
        <Page>
            <PageHeader title="nightly-export" code="01a1a5c2" meta={<StatusChip status={state} />} />
        </Page>
    )
}

/**
 * A screen adds its own commands with `useCommands` while it is mounted, listed before the app's
 * own, and takes them away when it unmounts.
 */
export const ScreenCommands: StoryObj = {
    name: 'Screen commands',
    render: () => (
        <TooltipProvider>
            <Shell
                defaultPaletteOpen
                palette={placeCommands(PLACES, () => undefined)}
                rail={<Rail mark={<TidevannMark />} name="Tidevann" groups={PLACES} />}
                top={
                    <TopBar
                        trail={[
                            { label: 'Runs', href: '#' },
                            { label: '01a1a5c2', code: true },
                        ]}
                    />
                }
            >
                <RunPage />
            </Shell>
        </TooltipProvider>
    ),
}
