import { CheckboxField } from '../../components/CheckboxField'
import { IconButton } from '../../components/IconButton'
import { Field } from '../../components/Field'
import { DialogShell } from '../../components/DialogShell'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Activity,
    CalendarClock,
    FolderGit2,
    LayoutDashboard,
    ListChecks,
    Play,
    Plus,
    RefreshCw,
    Settings,
    Share2,
    Users,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { AccountMenu } from '../../components/AccountMenu'
import { Banner, type BannerTone } from '../../components/Banner'
import { EChart } from '../../components/chart/EChart'
import { Code } from '../../components/Code'
import { DataTable, type DataColumn } from '../../components/DataTable'
import { PageHeader } from '../../components/PageHeader'
import { Rail, type RailGroup } from '../../components/Rail'
import { Segmented } from '../../components/Segmented'
import { Page, Shell } from '../../components/Shell'
import { SidePanel } from '../../components/SidePanel'
import { StatusChip, type Status } from '../../components/StatusChip'
import { ThemePicker, type ThemeSettings } from '../../components/ThemePicker'
import { ThemeToggle } from '../../components/ThemeToggle'
import { TopBar } from '../../components/TopBar'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '../../components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Toaster } from '../../components/ui/sonner'
import { Switch } from '../../components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { TooltipProvider } from '../../components/ui/tooltip'
import { lines, TWO } from '../charts/options'
import { TidevannMark } from '../fixtures/TidevannMark'
import { applyToDocument, CORNERS, fromGlobals, THEMES, toGlobals, TYPEFACES } from './themes'
import { Columns, Row, Stack } from '../../components/Layout'

/**
 * A small Tidevann app that uses a bit of everything, to judge a theme on: the shell, buttons,
 * fields, chips, a listing, cards, a chart, code and banners, with a dialog, a popover, tooltips
 * and toasts that open when pressed. The appearance panel on the right re-themes the whole app as
 * it is changed, setting what the toolbar sets; leaving the story puts the toolbar's look back.
 */
const meta: Meta = { title: 'Themes/Kitchen sink' }
export default meta

const GROUPS: RailGroup[] = [
    {
        id: 'work',
        entries: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '#', active: true },
            { id: 'runs', label: 'Runs', icon: Play, href: '#' },
            { id: 'jobs', label: 'Jobs', icon: ListChecks, href: '#' },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
        ],
    },
    {
        id: 'workspace',
        title: 'Workspace',
        entries: [
            { id: 'projects', label: 'Projects', icon: FolderGit2, href: '#' },
            { id: 'people', label: 'People', icon: Users, href: '#' },
            { id: 'activity', label: 'Activity', icon: Activity, href: '#' },
            { id: 'settings', label: 'Settings', icon: Settings, href: '#' },
        ],
    },
]

interface Run {
    id: string
    job: string
    state: Status
    by: string
    started: string
    duration: string
}

const RUNS: Run[] = [
    { id: 'r1', job: 'import-orders', state: 'running', by: 'schedule', started: '14:02', duration: '1m 12s' },
    { id: 'r2', job: 'nightly-export', state: 'failed', by: 'schedule', started: '02:00', duration: '4.2s' },
    { id: 'r3', job: 'rebuild-index', state: 'succeeded', by: 'ada', started: '01:40', duration: '6m 03s' },
    { id: 'r4', job: 'send-digest', state: 'succeeded', by: 'schedule', started: '01:00', duration: '12.8s' },
    { id: 'r5', job: 'sync-inventory', state: 'queued', by: 'grace', started: '-', duration: '-' },
    { id: 'r6', job: 'sync-inventory', state: 'cancelled', by: 'linus', started: 'yesterday', duration: '38s' },
]

/** A duration such as `1m 12s` in seconds, for sorting; a run not started sorts last. */
const seconds = (duration: string) =>
    duration === '-'
        ? Number.POSITIVE_INFINITY
        : duration.split(' ').reduce((sum, part) => sum + Number.parseFloat(part) * (part.endsWith('m') ? 60 : 1), 0)

const COLUMNS: DataColumn<Run>[] = [
    {
        id: 'job',
        header: 'Job',
        width: 'minmax(0,1fr)',
        cell: (run) => <span className="truncate font-mono">{run.job}</span>,
        sortValue: (run) => run.job,
    },
    { id: 'state', header: 'State', width: '7.5rem', cell: (run) => <StatusChip status={run.state} />, sortValue: (run) => run.state },
    {
        id: 'by',
        header: 'Started by',
        width: '7rem',
        cell: (run) => <span className="text-muted-foreground">{run.by}</span>,
        sortValue: (run) => run.by,
    },
    {
        id: 'started',
        header: 'Started',
        width: '6rem',
        cell: (run) => <span className="tabular-nums">{run.started}</span>,
        sortValue: (run) => run.started,
    },
    {
        id: 'duration',
        header: 'Duration',
        width: '5.5rem',
        align: 'end',
        cell: (run) => <span className="tabular-nums">{run.duration}</span>,
        sortValue: (run) => seconds(run.duration),
    },
]

type View = 'all' | 'failed' | 'running'

const JOBS = ['import-orders', 'nightly-export', 'rebuild-index', 'send-digest', 'sync-inventory'].map((value) => ({ value, label: value }))
const PROJECTS = ['harbor', 'juniper', 'larkspur'].map((value) => ({ value, label: value }))
const STATES: Status[] = ['succeeded', 'failed', 'running', 'queued', 'pending', 'waiting', 'cancelled', 'skipped']

const BANNERS: { tone: BannerTone; text: string }[] = [
    { tone: 'info', text: 'scheduler.example.org restarts on Sunday at 02:00; runs queued then start after it.' },
    { tone: 'good', text: 'Every service in harbor answered its last health check.' },
    { tone: 'warning', text: 'worker is slow: runs wait 40s on average for a slot.' },
    { tone: 'critical', text: 'nightly-export failed three times in a row; margaret is on call.' },
]

const CONFIG = `job: nightly-export
project: harbor
schedule: "0 2 * * *"
steps:
  - fetch: https://api.example.org/orders?since=24h
  - transform: currency
  - validate: { amount: number }
  - upload: s3://harbor-exports/orders/
  - notify: [ada, grace]
`

const CHART = lines(TWO)

function Section({
    title,
    description,
    action,
    children,
}: {
    title: string
    description?: string
    action?: ReactNode
    children: ReactNode
}) {
    return (
        <Card size="sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
                <Stack gap="2xs">
                    <CardTitle>{title}</CardTitle>
                    {description !== undefined && <CardDescription>{description}</CardDescription>}
                </Stack>
                {action}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

function NewRun() {
    const [open, setOpen] = useState(false)
    const [job, setJob] = useState('nightly-export')
    const [notify, setNotify] = useState(true)
    return (
        <>
            <Button size="sm" onClick={() => setOpen(true)}>
                <Plus aria-hidden />
                New run
            </Button>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="New run"
                description="Starts the job now, outside its schedule, in project harbor."
                confirm={{
                    label: 'Start run',
                    onConfirm: () => {
                        setOpen(false)
                        toast.success(`${job} queued`, {
                            description: notify ? 'ada hears when it finishes.' : 'Nobody is told when it finishes.',
                        })
                    },
                }}
            >
                <Stack gap="lg">
                    <Field id="run-job" label="Job">
                        <Select items={JOBS} value={job} onValueChange={(next) => next !== null && setJob(next)}>
                            <SelectTrigger id="run-job" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {JOBS.map((entry) => (
                                    <SelectItem key={entry.value} value={entry.value}>
                                        {entry.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field id="run-reason" label="Reason">
                        <Input id="run-reason" placeholder="Why it runs now" />
                    </Field>
                    <CheckboxField label="Tell ada when it finishes" checked={notify} onCheckedChange={setNotify} />
                </Stack>
            </DialogShell>
        </>
    )
}

function Share() {
    return (
        <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
                <Share2 aria-hidden />
                Share
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
                <PopoverHeader>
                    <PopoverTitle>Share harbor</PopoverTitle>
                    <PopoverDescription>Anyone in the workspace with the link can see this overview.</PopoverDescription>
                </PopoverHeader>
                <Row align="stretch">
                    <Input readOnly value="https://tidevann.example.org/harbor" aria-label="Link" className="font-mono text-xs" />
                    <Button size="sm" onClick={() => toast('Link copied', { description: 'https://tidevann.example.org/harbor' })}>
                        Copy
                    </Button>
                </Row>
            </PopoverContent>
        </Popover>
    )
}

function Controls() {
    return (
        <Section title="Controls" description="Every button variant, badges and the run states.">
            <Stack gap="lg">
                <Row wrap>
                    <Button size="sm" onClick={() => toast('Default pressed')}>
                        Default
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => toast('Secondary pressed')}>
                        Secondary
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast('Outline pressed')}>
                        Outline
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toast('Ghost pressed')}>
                        Ghost
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => toast.error('Destructive pressed')}>
                        Destructive
                    </Button>
                    <Button size="sm" variant="link" onClick={() => toast('Link pressed')}>
                        Link
                    </Button>
                    <Button size="sm" disabled>
                        Disabled
                    </Button>
                </Row>
                <Row gap="xs" wrap>
                    <Badge>default</Badge>
                    <Badge variant="secondary">secondary</Badge>
                    <Badge variant="outline">outline</Badge>
                    <Badge variant="destructive">destructive</Badge>
                </Row>
                <Row gap="xs" wrap>
                    {STATES.map((state) => (
                        <StatusChip key={state} status={state} />
                    ))}
                </Row>
            </Stack>
        </Section>
    )
}

function Schedule() {
    const [project, setProject] = useState('harbor')
    const [every, setEvery] = useState<'hourly' | 'daily' | 'weekly'>('daily')
    const [paused, setPaused] = useState(false)
    const [retry, setRetry] = useState(true)
    return (
        <Section title="Schedule" description="When nightly-export runs.">
            <Stack gap="lg">
                <Columns min="sm" gap="md">
                    <Field id="schedule-name" label="Name">
                        <Input id="schedule-name" defaultValue="Nightly export" />
                    </Field>
                    <Field id="schedule-project" label="Project">
                        <Select items={PROJECTS} value={project} onValueChange={(next) => next !== null && setProject(next)}>
                            <SelectTrigger id="schedule-project" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PROJECTS.map((entry) => (
                                    <SelectItem key={entry.value} value={entry.value}>
                                        {entry.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                </Columns>
                <Segmented
                    label="How often"
                    value={every}
                    options={[
                        { value: 'hourly', label: 'Hourly' },
                        { value: 'daily', label: 'Daily' },
                        { value: 'weekly', label: 'Weekly' },
                    ]}
                    onChoose={setEvery}
                />
                <Row gap="none" wrap className="gap-x-6 gap-y-3">
                    <CheckboxField label="Retry once on failure" checked={retry} onCheckedChange={setRetry} />
                    <Label className="flex items-center gap-2 font-normal">
                        <Switch checked={paused} onCheckedChange={setPaused} />
                        Paused
                    </Label>
                </Row>
                <Row gap="none" align="stretch" justify="end">
                    <Button
                        size="sm"
                        onClick={() =>
                            toast.success('Schedule saved', {
                                description: `nightly-export runs ${every} in ${project}${paused ? ', paused' : ''}.`,
                            })
                        }
                    >
                        Save
                    </Button>
                </Row>
            </Stack>
        </Section>
    )
}

function Banners() {
    const [shown, setShown] = useState(BANNERS.map((banner) => banner.tone))
    return (
        <Section
            title="Banners"
            description="One per tone; each can be dismissed."
            action={
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={shown.length === BANNERS.length}
                    onClick={() => setShown(BANNERS.map((banner) => banner.tone))}
                >
                    Show all
                </Button>
            }
        >
            <Stack gap="none">
                {BANNERS.filter((banner) => shown.includes(banner.tone)).map((banner) => (
                    <Banner key={banner.tone} tone={banner.tone} onDismiss={() => setShown(shown.filter((tone) => tone !== banner.tone))}>
                        {banner.text}
                    </Banner>
                ))}
                {shown.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Every banner is dismissed.</p>}
            </Stack>
        </Section>
    )
}

function App({ globals }: { globals: Record<string, unknown> }) {
    const fromToolbar = fromGlobals(globals)
    const toolbar = toGlobals(fromToolbar)
    const [settings, setSettings] = useState<ThemeSettings>(fromToolbar)
    // A change on the toolbar takes over from what the panel had picked.
    const [synced, setSynced] = useState(toolbar)
    if (synced !== toolbar) {
        setSynced(toolbar)
        setSettings(fromToolbar)
    }
    useEffect(() => applyToDocument(settings), [settings])

    const [collapsed, setCollapsed] = useState(false)
    const [view, setView] = useState<View>('all')
    const [chosen, setChosen] = useState('r2')
    const rows = RUNS.filter((run) => view === 'all' || run.state === view)

    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={GROUPS}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={
                            <AccountMenu
                                name="ada"
                                where="tidevann.example.org"
                                collapsed={collapsed}
                                onSignOut={() => toast('Signed out')}
                            />
                        }
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'Tidevann', href: '#' }, { label: 'harbor', href: '#', code: true }, { label: 'Overview' }]}
                        onSearch={() => toast('Search opens the command palette')}
                        actions={
                            <ThemeToggle
                                dark={settings.scheme === 'dark'}
                                onToggle={() => setSettings({ ...settings, scheme: settings.scheme === 'dark' ? 'light' : 'dark' })}
                            />
                        }
                    />
                }
                panel={
                    <SidePanel
                        width="18rem"
                        tabs={[
                            {
                                id: 'appearance',
                                label: 'Appearance',
                                content: (
                                    <div className="p-4">
                                        <ThemePicker
                                            value={settings}
                                            onChange={setSettings}
                                            themes={THEMES}
                                            corners={CORNERS}
                                            typefaces={TYPEFACES}
                                        />
                                    </div>
                                ),
                            },
                        ]}
                    />
                }
            >
                <Page>
                    <PageHeader
                        title="Overview"
                        count="harbor"
                        actions={
                            <>
                                <Share />
                                <NewRun />
                            </>
                        }
                    />
                    <div className="grid gap-(--density-page-gap) xl:grid-cols-2">
                        <Section
                            title="Runs, today"
                            description="Started and failed, every 15 minutes."
                            action={
                                <IconButton
                                    variant="outline"
                                    label="Refresh"
                                    onClick={() => toast('Refreshed', { description: 'Runs are up to date.' })}
                                >
                                    <RefreshCw aria-hidden />
                                </IconButton>
                            }
                        >
                            <div className="h-44">
                                <EChart option={CHART} label="Runs and failures across the day" />
                            </div>
                        </Section>
                        <Controls />
                    </div>
                    <Stack>
                        <Row justify="between" wrap>
                            <Tabs value={view} onValueChange={(next) => setView(next as View)}>
                                <TabsList>
                                    <TabsTrigger value="all">All</TabsTrigger>
                                    <TabsTrigger value="failed">Failed</TabsTrigger>
                                    <TabsTrigger value="running">Running</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <IconButton
                                variant="outline"
                                label="Run the chosen job now"
                                onClick={() => toast.success(`${RUNS.find((run) => run.id === chosen)?.job ?? 'Job'} queued`)}
                            >
                                <Play aria-hidden />
                            </IconButton>
                        </Row>
                        <DataTable
                            columns={COLUMNS}
                            rows={rows}
                            rowKey={(run) => run.id}
                            opened={(run) => run.id === chosen}
                            onOpen={(run) => setChosen(run.id)}
                            minWidth="32rem"
                            words={{ empty: 'No runs in this view.' }}
                        />
                    </Stack>
                    <div className="grid gap-(--density-page-gap) xl:grid-cols-2">
                        <Schedule />
                        <Section title="Config" description="The job as it is stored.">
                            <Code value={CONFIG} language="yaml" title="nightly-export.yaml" size="sm" />
                        </Section>
                    </div>
                    <Banners />
                </Page>
            </Shell>
            <Toaster />
        </TooltipProvider>
    )
}

/** The whole app, in the toolbar's look until the appearance panel changes it. */
export const KitchenSink: StoryObj = {
    name: 'Kitchen sink',
    render: (_args, context) => <App globals={context.globals} />,
}
