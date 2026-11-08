import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { type DataAction, type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { LogView } from '@winterop-com/sokkel-ui/LogView'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { ThemeToggle } from '@winterop-com/sokkel-ui/ThemeToggle'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import {
    Activity,
    Boxes,
    CalendarClock,
    CopyIcon,
    ExternalLinkIcon,
    FolderGit2,
    ListChecks,
    Palette,
    Play,
    Plus,
    RotateCcwIcon,
    Settings,
    Settings2,
    XIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type { Frame } from '../../frame'
import { TidevannMark } from '../../TidevannMark'
import { RUNS, type Run, runLog, startedAt, took } from './data'

const GROUPS: RailGroup[] = [
    {
        id: 'work',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#/runs', active: true },
            { id: 'jobs', label: 'Jobs', icon: ListChecks, href: '#/runs' },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#/runs' },
        ],
    },
    {
        id: 'workspace',
        title: 'Workspace',
        entries: [
            { id: 'projects', label: 'Projects', icon: FolderGit2, href: '#/runs' },
            { id: 'services', label: 'Services', icon: Boxes, href: '#/runs' },
        ],
    },
    {
        id: 'system',
        title: 'System',
        entries: [
            { id: 'activity', label: 'Activity', icon: Activity, href: '#/runs' },
            { id: 'settings', label: 'Settings', icon: Settings, href: '#/runs' },
        ],
    },
]

const COLUMNS: DataColumn<Run>[] = [
    { id: 'id', header: 'Run', width: '8.5rem', cell: (run) => <span className="font-mono">{run.id}</span>, sortValue: (run) => run.id },
    {
        id: 'job',
        header: 'Job',
        width: 'minmax(10rem,1fr)',
        cell: (run) => <span className="font-mono">{run.job}</span>,
        sortValue: (run) => run.job,
    },
    { id: 'project', header: 'Project', width: '7rem', cell: (run) => run.project, sortValue: (run) => run.project },
    { id: 'state', header: 'State', width: '7.5rem', cell: (run) => <StatusChip status={run.state} />, sortValue: (run) => run.state },
    {
        id: 'by',
        header: 'Started by',
        width: '7rem',
        cell: (run) => <span className="text-muted-foreground">{run.by}</span>,
        sortValue: (run) => run.by,
    },
    { id: 'started', header: 'Started', width: '8rem', cell: (run) => startedAt(run.ago), sortValue: (run) => -run.ago },
    {
        id: 'duration',
        header: 'Duration',
        width: '6rem',
        align: 'end',
        cell: (run) => took(run.duration),
        sortValue: (run) => run.duration,
    },
]

function RunDetails({ run }: { run: Run }) {
    return (
        <PanelSection title="Run">
            <DescriptionList
                termWidth="6rem"
                items={[
                    { term: 'Run', value: run.id, code: true },
                    { term: 'Job', value: run.job, code: true },
                    { term: 'Project', value: run.project },
                    { term: 'State', value: <StatusChip status={run.state} /> },
                    { term: 'Step', value: run.step, code: true },
                    { term: 'Started by', value: run.by },
                    { term: 'Started', value: startedAt(run.ago) },
                    { term: 'Duration', value: took(run.duration) },
                    { term: 'Records', value: run.records.toLocaleString('en-US') },
                ]}
            />
        </PanelSection>
    )
}

/** The runs page: job runs in a table, a run opened in the side panel, and the settings dialog. */
export function RunsDemo({ frame }: { frame: Frame }) {
    const { settings: look, setSettings: setLook, resolved } = frame.appearance
    const scheme = look.scheme
    const setScheme = (next: typeof scheme) => setLook({ ...look, scheme: next })
    const dark = resolved === 'dark'

    const [query, setQuery] = useState('')
    const [opened, setOpened] = useState<Run | undefined>(undefined)
    const [panelOpen, setPanelOpen] = useState(false)
    const [tab, setTab] = useState('details')
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [section, setSection] = useState('general')
    const [settingsSearch, setSettingsSearch] = useState('')
    const [confirmCancel, setConfirmCancel] = useState(true)
    const [newTab, setNewTab] = useState(false)

    const rows = useMemo(() => {
        const wanted = query.trim().toLowerCase()
        if (wanted === '') return RUNS
        return RUNS.filter((run) => run.id.includes(wanted) || run.job.includes(wanted) || run.project.includes(wanted))
    }, [query])

    const open = (run: Run) => {
        setOpened(run)
        setPanelOpen(true)
    }

    const actions = (run: Run): DataAction[] => [
        { id: 'open', label: 'Open', icon: <ExternalLinkIcon />, onSelect: () => open(run) },
        {
            id: 'retry',
            label: 'Retry',
            icon: <RotateCcwIcon />,
            disabled: run.state === 'running' || run.state === 'queued',
            onSelect: () => undefined,
        },
        { id: 'copy', label: 'Copy run ID', icon: <CopyIcon />, onSelect: () => void navigator.clipboard.writeText(run.id) },
        { id: 'line', separator: true },
        {
            id: 'cancel',
            label: 'Cancel run',
            icon: <XIcon />,
            destructive: true,
            disabled: run.state !== 'running' && run.state !== 'queued',
            onSelect: () => undefined,
        },
    ]

    const settings: SettingsGroup[] = [
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
                            id: 'new-tab',
                            title: 'Open runs in a new tab',
                            description: 'A run opened from a list keeps the list where it was.',
                            control: <Switch aria-label="Open runs in a new tab" checked={newTab} onCheckedChange={setNewTab} />,
                        },
                        {
                            id: 'confirm-cancel',
                            title: 'Confirm before cancelling a run',
                            description: 'Ask once more before a running job is stopped.',
                            control: (
                                <Switch
                                    aria-label="Confirm before cancelling a run"
                                    checked={confirmCancel}
                                    onCheckedChange={setConfirmCancel}
                                />
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
                                    onValueChange={setScheme}
                                    options={[
                                        { value: 'system', label: 'System' },
                                        { value: 'light', label: 'Light' },
                                        { value: 'dark', label: 'Dark' },
                                    ]}
                                />
                            ),
                        },
                    ],
                },
            ],
        },
    ]

    const failed = RUNS.filter((run) => run.state === 'failed').length

    return (
        <>
            <Shell
                palette={frame.palette}
                desktop={frame.desktop}
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        markHref="#/"
                        name="Tidevann"
                        groups={GROUPS}
                        foot={
                            <AccountMenu
                                name="ada"
                                where="tidevann.example.org"
                                onSettings={() => setSettingsOpen(true)}
                                onSignOut={() => undefined}
                            />
                        }
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'Tidevann', href: '#/' }, { label: 'Runs' }]}
                        actions={
                            <>
                                <ThemeToggle dark={dark} onToggle={() => setScheme(dark ? 'light' : 'dark')} />
                                <Button variant="ghost" size="icon-sm" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
                                    <Settings aria-hidden />
                                </Button>
                            </>
                        }
                    />
                }
                foot={
                    <StatusLine note={`${String(failed)} failed today`}>
                        <StatusItem label="runs today">{RUNS.length}</StatusItem>
                    </StatusLine>
                }
                panelOpen={panelOpen}
                onPanelOpenChange={setPanelOpen}
                panel={
                    opened === undefined ? undefined : (
                        <SidePanel
                            tabs={[
                                { id: 'details', label: 'Details', content: <RunDetails run={opened} /> },
                                {
                                    id: 'log',
                                    label: 'Log',
                                    content: <LogView lines={runLog(opened)} wrap numbered={false} className="m-3" />,
                                },
                            ]}
                            active={tab}
                            onActiveChange={setTab}
                        />
                    )
                }
            >
                <Page className="h-full">
                    <PageHeader
                        title="Runs"
                        count={`${String(RUNS.length)} today`}
                        actions={
                            <Button size="sm">
                                <Plus aria-hidden />
                                New
                            </Button>
                        }
                    />
                    <DataTable
                        className="min-h-0 flex-1"
                        columns={COLUMNS}
                        rows={rows}
                        rowKey={(run) => run.id}
                        selectable
                        rowActions={actions}
                        onOpen={open}
                        opened={(run) => run.id === opened?.id}
                        search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                    />
                </Page>
            </Shell>
            <SettingsDialog
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                groups={settings}
                active={section}
                onActiveChange={setSection}
                search={settingsSearch}
                onSearchChange={setSettingsSearch}
            />
        </>
    )
}
