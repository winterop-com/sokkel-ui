import { SliderField } from '../../components/SliderField'
import { Field } from '../../components/Field'
import { TextField } from '../../components/TextField'
import { IconButton } from '../../components/IconButton'
import { PageHeader } from '../../components/PageHeader'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Keyboard, Palette, Search as SearchIcon, Server, Settings2, User } from 'lucide-react'
import { useState } from 'react'

import { NavBar } from '../../components/NavBar'
import { Section } from '../../components/Section'
import { Segmented } from '../../components/Segmented'
import { SettingsDialog, type SettingsGroup } from '../../components/SettingsDialog'
import { SwitchField } from '../../components/SwitchField'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Switch } from '../../components/ui/switch'
import { TooltipProvider } from '../../components/ui/tooltip'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import { PersonAvatar } from '../../components/PersonAvatar'
import { Columns, Stack } from '../../components/Layout'

/** Tidevann's preferences, from the start page to how long the server keeps its runs. */
function usePreferences(): SettingsGroup[] {
    const [start, setStart] = useState<'overview' | 'projects' | 'last'>('overview')
    const [clock, setClock] = useState<'24' | '12'>('24')
    const [newTab, setNewTab] = useState(false)
    const [delay, setDelay] = useState(0)
    const [confirmCancel, setConfirmCancel] = useState(true)
    const [scheme, setScheme] = useState<'system' | 'light' | 'dark'>('system')
    const [density, setDensity] = useState<'regular' | 'compact'>('regular')
    const [motion, setMotion] = useState(false)
    const [codeSize, setCodeSize] = useState(13)
    const [hints, setHints] = useState(true)
    const [singleKey, setSingleKey] = useState(true)
    const [history, setHistory] = useState<'30' | '90' | '365'>('90')
    const [maintenance, setMaintenance] = useState(false)
    return [
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
                            control: (
                                <Segmented
                                    label="Start page"
                                    value={start}
                                    onChoose={setStart}
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
                            control: (
                                <Segmented
                                    label="Time format"
                                    value={clock}
                                    onChoose={setClock}
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
                            control: <Switch aria-label="Open runs in a new tab" checked={newTab} onCheckedChange={setNewTab} />,
                        },
                        {
                            id: 'delay',
                            title: 'Live update delay',
                            description: 'How long a running job waits before its log is redrawn.',
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
                                    onChange={setDelay}
                                />
                            ),
                        },
                        {
                            id: 'confirm-cancel',
                            title: 'Confirm before cancelling a run',
                            description: 'Ask once more before a running job is stopped.',
                            note: 'Runs the scheduler cancels are never asked about.',
                            control: (
                                <Switch
                                    aria-label="Confirm before cancelling a run"
                                    checked={confirmCancel}
                                    onCheckedChange={setConfirmCancel}
                                />
                            ),
                        },
                        {
                            id: 'recent',
                            title: 'Recent searches',
                            description: 'The searches offered when the search box opens.',
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
                            control: (
                                <Segmented
                                    label="Scheme"
                                    value={scheme}
                                    onChoose={setScheme}
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
                            control: (
                                <Segmented
                                    label="Density"
                                    value={density}
                                    onChoose={setDensity}
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
                            control: <Switch aria-label="Reduce motion" checked={motion} onCheckedChange={setMotion} />,
                        },
                        {
                            id: 'code-size',
                            title: 'Code size',
                            description: 'The size of logs and step definitions.',
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
                                    onChange={setCodeSize}
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
                            control: <Switch aria-label="Show key hints" checked={hints} onCheckedChange={setHints} />,
                        },
                        {
                            id: 'single-key',
                            title: 'Single-key shortcuts',
                            description: 'Keys such as / and ? act without a modifier.',
                            control: <Switch aria-label="Single-key shortcuts" checked={singleKey} onCheckedChange={setSingleKey} />,
                        },
                        {
                            id: 'list',
                            title: 'Every shortcut',
                            description: 'The full list, grouped by where it works.',
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
                    settings: [
                        {
                            id: 'name',
                            title: 'Name',
                            description: 'How you appear on runs you start.',
                            control: <Input aria-label="Name" className="w-56" defaultValue="Grace" />,
                        },
                        {
                            id: 'email',
                            title: 'Email',
                            description: 'Where failed-run alerts are sent.',
                            control: <Input aria-label="Email" className="w-56" defaultValue="grace@example.org" />,
                        },
                        {
                            id: 'sessions',
                            title: 'Other sessions',
                            description: 'Sign out everywhere but this browser.',
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
                            control: <span className="font-mono text-sm">https://tidevann.example.org</span>,
                        },
                        {
                            id: 'history',
                            title: 'Run history',
                            description: 'How long a finished run and its logs are kept.',
                            control: (
                                <Segmented
                                    label="Run history"
                                    value={history}
                                    onChoose={setHistory}
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
                            note: 'Running jobs finish first; ada and linus are told by email.',
                            control: <Switch aria-label="Maintenance mode" checked={maintenance} onCheckedChange={setMaintenance} />,
                        },
                    ],
                },
            ],
        },
    ]
}

/** Where the preferences dialog opens, when the story opens it. */
interface Opening {
    active: string
    search?: string
    phoneStart?: 'list' | 'section'
}

/**
 * An app with few places, framed by the navbar along the top instead of a rail: a settings page of
 * boxed sections, each with its fields and the one verb that saves it. The gear in the navbar opens
 * the preferences dialog.
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
    return (
        <TooltipProvider>
            <Stack gap="none" className="h-svh bg-background text-foreground">
                <NavBar
                    mark={<TidevannMark />}
                    name="Tidevann"
                    links={[
                        { id: 'overview', label: 'Overview', href: '#' },
                        { id: 'projects', label: 'Projects', href: '#' },
                        { id: 'people', label: 'People', href: '#' },
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
                                        onChoose={setScheme}
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
                                        onChoose={setDensity}
                                        options={[
                                            { value: 'regular', label: 'Regular' },
                                            { value: 'compact', label: 'Compact' },
                                        ]}
                                    />
                                </Field>
                            </Stack>
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
                                        onChoose={setClock}
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
                    groups={preferences}
                    active={active}
                    onActiveChange={setActive}
                    search={search}
                    onSearchChange={setSearch}
                    phoneStart={opening?.phoneStart}
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
 * the left, General's rows on the right. A phone opens straight into General, with a way back to
 * the list of sections.
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
