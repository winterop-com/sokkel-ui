import { SliderField } from '@winterop-com/sokkel-ui/SliderField'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Keyboard, Palette, Search as SearchIcon, Server, Settings2, User } from 'lucide-react'
import { useState } from 'react'

import { ListRow } from '@winterop-com/sokkel-ui/ListRow'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { NavBar } from '@winterop-com/sokkel-ui/NavBar'
import { SortableList } from '@winterop-com/sokkel-ui/Sortable'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { ThemeToggle } from '@winterop-com/sokkel-ui/ThemeToggle'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'

/** Tidevann's preferences as a new account has them. */
const DEFAULTS = {
    start: 'overview' as 'overview' | 'projects' | 'last',
    clock: '24' as '24' | '12',
    newTab: false,
    delay: 0,
    confirmCancel: true,
    scheme: 'system' as 'system' | 'light' | 'dark',
    density: 'regular' as 'regular' | 'compact',
    motion: false,
    codeSize: 13,
    hints: true,
    singleKey: true,
    name: 'Grace',
    email: 'grace@example.org',
    history: '90' as '30' | '90' | '365',
    maintenance: false,
}

type Preferences = typeof DEFAULTS

/** The preferences each section holds, so a section can be put back to its defaults on its own. */
const HELD: Record<string, readonly (keyof Preferences)[]> = {
    general: ['start', 'clock', 'newTab', 'delay', 'confirmCancel'],
    theme: ['scheme', 'density', 'motion', 'codeSize'],
    shortcuts: ['hints', 'singleKey'],
    server: ['history', 'maintenance'],
}

/**
 * Tidevann's preferences, from the start page to how long the server keeps its runs, and a reset
 * that puts one section back to its defaults, or every one when given no section.
 */
function usePreferences(): { groups: SettingsGroup[]; reset: (section?: string) => void } {
    const [values, setValues] = useState(DEFAULTS)
    const set = (change: Partial<Preferences>) => setValues((now) => ({ ...now, ...change }))
    const reset = (section?: string) => {
        const keys = section === undefined ? Object.values(HELD).flat() : (HELD[section] ?? [])
        setValues((now) => ({ ...now, ...Object.fromEntries(keys.map((key) => [key, DEFAULTS[key]])) }))
    }
    const {
        start,
        clock,
        newTab,
        delay,
        confirmCancel,
        scheme,
        density,
        motion,
        codeSize,
        hints,
        singleKey,
        name,
        email,
        history,
        maintenance,
    } = values
    const groups: SettingsGroup[] = [
        {
            id: 'preferences',
            title: 'Preferences',
            sections: [
                {
                    id: 'general',
                    label: 'General',
                    icon: Settings2,
                    settings: [
                        {
                            id: 'start',
                            title: 'Start page',
                            description: 'What Tidevann opens on after you sign in.',
                            keywords: ['home', 'landing'],
                            control: (
                                <Segmented
                                    label="Start page"
                                    value={start}
                                    onValueChange={(start) => set({ start })}
                                    options={[
                                        { value: 'overview', label: 'Overview' },
                                        { value: 'projects', label: 'Projects' },
                                        { value: 'last', label: 'Last visited' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'clock',
                            title: 'Time format',
                            description: 'How times are written in run lists and logs.',
                            keywords: ['12-hour', '24-hour', 'clock', 'am', 'pm'],
                            control: (
                                <Segmented
                                    label="Time format"
                                    value={clock}
                                    onValueChange={(clock) => set({ clock })}
                                    options={[
                                        { value: '24', label: '24-hour' },
                                        { value: '12', label: '12-hour' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'new-tab',
                            title: 'Open runs in a new tab',
                            description: 'A run opened from a list keeps the list where it was.',
                            keywords: ['window', 'link'],
                            layout: 'trailing',
                            control: (
                                <Switch
                                    aria-label="Open runs in a new tab"
                                    checked={newTab}
                                    onCheckedChange={(newTab) => set({ newTab })}
                                />
                            ),
                        },
                        {
                            id: 'delay',
                            title: 'Live update delay',
                            description: 'How long a running job waits before its log is redrawn.',
                            keywords: ['refresh', 'slow', 'latency'],
                            note: 'Raise it on a slow connection; the log still arrives whole.',
                            control: (
                                <SliderField
                                    id="live-update-delay"
                                    label="Live update delay"
                                    inline
                                    value={delay}
                                    min={0}
                                    max={2000}
                                    step={100}
                                    unit="ms"
                                    onChange={(delay) => set({ delay })}
                                />
                            ),
                        },
                        {
                            id: 'confirm-cancel',
                            title: 'Confirm before cancelling a run',
                            description: 'Ask once more before a running job is stopped.',
                            keywords: ['stop', 'ask', 'prompt'],
                            note: 'Runs the scheduler cancels are never asked about.',
                            layout: 'trailing',
                            control: (
                                <Switch
                                    aria-label="Confirm before cancelling a run"
                                    checked={confirmCancel}
                                    onCheckedChange={(confirmCancel) => set({ confirmCancel })}
                                />
                            ),
                        },
                        {
                            id: 'recent',
                            title: 'Recent searches',
                            description: 'The searches offered when the search box opens.',
                            keywords: ['clear', 'forget', 'privacy'],
                            layout: 'trailing',
                            control: (
                                <Button variant="outline" size="sm">
                                    Clear
                                </Button>
                            ),
                        },
                    ],
                },
                {
                    id: 'theme',
                    label: 'Theme',
                    icon: Palette,
                    settings: [
                        {
                            id: 'scheme',
                            title: 'Scheme',
                            description: 'Light, dark, or whichever the system uses.',
                            keywords: ['dark mode', 'light mode', 'night', 'appearance', 'color'],
                            control: (
                                <Segmented
                                    label="Scheme"
                                    value={scheme}
                                    onValueChange={(scheme) => set({ scheme })}
                                    options={[
                                        { value: 'system', label: 'System' },
                                        { value: 'light', label: 'Light' },
                                        { value: 'dark', label: 'Dark' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'density',
                            title: 'Density',
                            description: 'Compact fits more rows in a table.',
                            keywords: ['compact', 'spacing', 'tight'],
                            control: (
                                <Segmented
                                    label="Density"
                                    value={density}
                                    onValueChange={(density) => set({ density })}
                                    options={[
                                        { value: 'regular', label: 'Regular' },
                                        { value: 'compact', label: 'Compact' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'motion',
                            title: 'Reduce motion',
                            description: 'Panels and dialogs appear without moving.',
                            keywords: ['animation', 'transitions'],
                            layout: 'trailing',
                            control: <Switch aria-label="Reduce motion" checked={motion} onCheckedChange={(motion) => set({ motion })} />,
                        },
                        {
                            id: 'code-size',
                            title: 'Code size',
                            description: 'The size of logs and step definitions.',
                            keywords: ['font', 'text size', 'zoom', 'monospace'],
                            control: (
                                <SliderField
                                    id="code-size"
                                    label="Code size"
                                    inline
                                    value={codeSize}
                                    min={11}
                                    max={16}
                                    step={1}
                                    unit="px"
                                    onChange={(codeSize) => set({ codeSize })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'shortcuts',
                    label: 'Shortcuts',
                    icon: Keyboard,
                    settings: [
                        {
                            id: 'hints',
                            title: 'Show key hints',
                            description: 'Buttons name their shortcut on hover.',
                            keywords: ['tooltip', 'keyboard'],
                            layout: 'trailing',
                            control: <Switch aria-label="Show key hints" checked={hints} onCheckedChange={(hints) => set({ hints })} />,
                        },
                        {
                            id: 'single-key',
                            title: 'Single-key shortcuts',
                            description: 'Keys such as / and ? act without a modifier.',
                            keywords: ['hotkeys', 'keyboard', 'modifier'],
                            layout: 'trailing',
                            control: (
                                <Switch
                                    aria-label="Single-key shortcuts"
                                    checked={singleKey}
                                    onCheckedChange={(singleKey) => set({ singleKey })}
                                />
                            ),
                        },
                        {
                            id: 'list',
                            title: 'Every shortcut',
                            description: 'The full list, grouped by where it works.',
                            keywords: ['keyboard', 'hotkeys', 'cheat sheet'],
                            layout: 'trailing',
                            control: (
                                <Button variant="outline" size="sm">
                                    Show
                                </Button>
                            ),
                        },
                    ],
                },
            ],
        },
        {
            id: 'you',
            title: 'You',
            sections: [
                {
                    id: 'account',
                    label: 'Account',
                    icon: User,
                    reset: false,
                    settings: [
                        {
                            id: 'name',
                            title: 'Name',
                            description: 'How you appear on runs you start.',
                            keywords: ['display name', 'profile'],
                            control: (
                                <Input
                                    aria-label="Name"
                                    className="w-56"
                                    value={name}
                                    onChange={(event) => set({ name: event.target.value })}
                                />
                            ),
                        },
                        {
                            id: 'email',
                            title: 'Email',
                            description: 'Where failed-run alerts are sent.',
                            keywords: ['mail', 'alerts', 'notifications'],
                            control: (
                                <Input
                                    aria-label="Email"
                                    className="w-56"
                                    value={email}
                                    onChange={(event) => set({ email: event.target.value })}
                                />
                            ),
                        },
                        {
                            id: 'sessions',
                            title: 'Other sessions',
                            description: 'Sign out everywhere but this browser.',
                            keywords: ['logout', 'log out', 'devices', 'browsers'],
                            layout: 'trailing',
                            control: (
                                <Button variant="outline" size="sm">
                                    Sign out
                                </Button>
                            ),
                        },
                    ],
                },
            ],
        },
        {
            id: 'server',
            title: 'This server',
            sections: [
                {
                    id: 'server',
                    label: 'Server',
                    icon: Server,
                    settings: [
                        {
                            id: 'address',
                            title: 'Address',
                            description: 'The address links in emails point at.',
                            keywords: ['url', 'host', 'domain'],
                            control: <span className="font-mono text-sm">https://tidevann.example.org</span>,
                        },
                        {
                            id: 'history',
                            title: 'Run history',
                            description: 'How long a finished run and its logs are kept.',
                            keywords: ['retention', 'logs', 'delete'],
                            control: (
                                <Segmented
                                    label="Run history"
                                    value={history}
                                    onValueChange={(history) => set({ history })}
                                    options={[
                                        { value: '30', label: '30 days' },
                                        { value: '90', label: '90 days' },
                                        { value: '365', label: 'A year' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'maintenance',
                            title: 'Maintenance mode',
                            description: 'Queued jobs wait and no new run starts.',
                            keywords: ['pause', 'downtime'],
                            note: 'Running jobs finish first; ada and linus are told by email.',
                            layout: 'trailing',
                            control: (
                                <Switch
                                    aria-label="Maintenance mode"
                                    checked={maintenance}
                                    onCheckedChange={(maintenance) => set({ maintenance })}
                                />
                            ),
                        },
                    ],
                },
            ],
        },
    ]
    return { groups, reset }
}

/** The navbar's links before Settings, which stays last. */
const LINKS = [
    { id: 'overview', label: 'Overview', detail: 'The runs of the day and what failed' },
    { id: 'projects', label: 'Projects', detail: 'harbor, juniper and larkspur' },
    { id: 'people', label: 'People', detail: 'Who works in Tidevann' },
]

/** Where the preferences dialog opens, when the story opens it. */
interface Opening {
    active: string
    search?: string
    phoneStart?: 'list' | 'section'
    /** The app's own note in the footer, and a reset of every setting rather than the shown section. */
    synced?: boolean
}

/**
 * An app with few places, framed by the navbar along the top instead of a rail: a settings page of
 * boxed sections, each with its fields and the one verb that saves it, and the navbar's links put
 * in order by drag, the navbar following. The gear in the navbar opens
 * the preferences dialog, whose footer says changes are kept as they are made, resets the shown
 * section and closes with Done.
 */
function SettingsApp({ opening }: { opening?: Opening }) {
    const preferences = usePreferences()
    const [preferencesOpen, setPreferencesOpen] = useState(opening !== undefined)
    const [active, setActive] = useState(opening?.active ?? 'general')
    const [search, setSearch] = useState(opening?.search ?? '')
    const [dark, setDark] = useState(true)
    const [scheme, setScheme] = useState<'system' | 'light' | 'dark'>('system')
    const [clock, setClock] = useState<'utc' | 'local'>('utc')
    const [density, setDensity] = useState<'regular' | 'compact'>('regular')
    const [links, setLinks] = useState(LINKS)
    return (
        <TooltipProvider>
            <Stack gap="none" className="h-svh bg-background text-foreground">
                <NavBar
                    mark={<TidevannMark />}
                    name="Tidevann"
                    links={[
                        ...links.map((link) => ({ id: link.id, label: link.label, href: '#' })),
                        { id: 'settings', label: 'Settings', href: '#', active: true },
                    ]}
                    end={
                        <>
                            <IconButton label="Search">
                                <SearchIcon aria-hidden />
                            </IconButton>
                            <IconButton label="Preferences" onClick={() => setPreferencesOpen(true)}>
                                <Settings2 aria-hidden />
                            </IconButton>
                            <ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />
                            <PersonAvatar name="grace" image={pictureOf('grace')} size="md" className="ml-1" />
                        </>
                    }
                />
                <main className="min-h-0 flex-1 overflow-y-auto">
                    <Stack gap="xl" className="mx-auto max-w-3xl px-4 py-6">
                        <PageHeader title="Settings" />
                        <Section title="Appearance">
                            <Stack gap="lg">
                                <Field id="scheme" label="Scheme" className="w-full max-w-80">
                                    <Segmented
                                        id="scheme"
                                        fill
                                        label="Scheme"
                                        value={scheme}
                                        onValueChange={setScheme}
                                        options={[
                                            { value: 'system', label: 'System' },
                                            { value: 'light', label: 'Light' },
                                            { value: 'dark', label: 'Dark' },
                                        ]}
                                    />
                                </Field>
                                <Field id="density" label="Density" className="w-full max-w-80">
                                    <Segmented
                                        id="density"
                                        fill
                                        label="Density"
                                        value={density}
                                        onValueChange={setDensity}
                                        options={[
                                            { value: 'regular', label: 'Regular' },
                                            { value: 'compact', label: 'Compact' },
                                        ]}
                                    />
                                </Field>
                            </Stack>
                        </Section>
                        <Section title="Navigation" description="The order of the links along the top. Drag one to move it.">
                            <SortableList
                                label="Links"
                                items={links}
                                itemKey={(link) => link.id}
                                itemLabel={(link) => link.label}
                                onMove={(from, to) => setLinks(moveItem(links, from, to))}
                                renderItem={(link) => <ListRow title={link.label} detail={link.detail} />}
                            />
                        </Section>
                        <Section title="Workspace" actions={<Button size="sm">Save</Button>}>
                            <Columns gap="lg">
                                <TextField id="name" label="Name" defaultValue="Tidevann" />
                                <TextField
                                    id="url"
                                    label="Address"
                                    hint="base_url"
                                    keyHint
                                    mono
                                    defaultValue="https://tidevann.example.org"
                                />
                                <Field id="schedule-clock" label="Schedule clock" className="w-full">
                                    <Segmented
                                        id="schedule-clock"
                                        fill
                                        label="Schedule clock"
                                        value={clock}
                                        onValueChange={setClock}
                                        options={[
                                            { value: 'utc', label: 'UTC' },
                                            { value: 'local', label: 'Server time' },
                                        ]}
                                    />
                                </Field>
                            </Columns>
                        </Section>
                        <Section title="Notifications">
                            <Stack>
                                <SwitchField
                                    id="failures"
                                    label="Email me when a job fails"
                                    explain="One email per failed run, sent to your address."
                                    defaultChecked
                                />
                                <SwitchField
                                    id="digest"
                                    label="Weekly digest"
                                    explain="A summary of the week's runs every Monday morning."
                                />
                            </Stack>
                        </Section>
                    </Stack>
                </main>
                <SettingsDialog
                    open={preferencesOpen}
                    onOpenChange={setPreferencesOpen}
                    groups={preferences.groups}
                    active={active}
                    onActiveChange={setActive}
                    search={search}
                    onSearchChange={setSearch}
                    phoneStart={opening?.phoneStart}
                    footer={opening?.synced === true ? 'Synced to your account at 09:52' : undefined}
                    onReset={preferences.reset}
                    resetScope={opening?.synced === true ? 'all' : 'section'}
                />
            </Stack>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Settings' }
export default meta

export const WithNavBar: StoryObj = { name: 'Navbar', render: () => <SettingsApp /> }

/**
 * The preferences dialog open on General: the navigation with its search and grouped sections on
 * the left, General's rows on the right, and the footer under both with Reset to defaults for
 * General, the note that changes are kept as they are made, and Done. A phone opens straight into
 * General, with a way back to the list of sections and the footer at the foot of the screen.
 */
export const Dialog: StoryObj = {
    render: () => <SettingsApp opening={{ active: 'general', phoneStart: 'section' }} />,
}

/**
 * The preferences dialog with "run" typed into its search: the navigation keeps only the sections
 * with a matching setting, and General shows only its matching rows. A phone shows the narrowed
 * list of sections.
 */
export const Search: StoryObj = {
    render: () => <SettingsApp opening={{ active: 'general', search: 'run' }} />,
}

/**
 * The preferences dialog with "logout" typed into its search: no setting says it, but Other sessions
 * lists it among its keywords, so Account is shown with that row alone.
 */
export const KeywordSearch: StoryObj = {
    name: 'Keyword search',
    render: () => <SettingsApp opening={{ active: 'general', search: 'logout', phoneStart: 'section' }} />,
}

/**
 * The preferences dialog with the app's own note in its footer, when the preferences last synced,
 * and a reset that puts back every setting rather than the shown section, so it shows on a phone's
 * list of sections too.
 */
export const Synced: StoryObj = {
    render: () => <SettingsApp opening={{ active: 'theme', synced: true }} />,
}

/**
 * The preferences dialog open on Account, a section with nothing to put back (`reset: false` on the
 * section): its footer leaves Reset to defaults out and keeps the note and Done.
 */
export const NoReset: StoryObj = { name: 'No reset', render: () => <SettingsApp opening={{ active: 'account', phoneStart: 'section' }} /> }
