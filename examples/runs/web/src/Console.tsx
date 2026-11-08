import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { ThemeToggle } from '@winterop-com/sokkel-ui/ThemeToggle'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { CalendarClock, LayoutDashboard, ListChecks, LogOut, Play, Settings, Workflow } from 'lucide-react'
import { lazy, Suspense, useEffect } from 'react'

import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'
import { useActions } from './actions'
import { clock, dayOf } from './model'
import { Jobs } from './pages/Jobs'
import { Overview } from './pages/Overview'
import { Runs } from './pages/Runs'
import { Schedules } from './pages/Schedules'
import { Settings as SettingsPage } from './pages/Settings'
import { RunPanel } from './RunPanel'
import { nextFire } from './schedule'
import { useConsole } from './state'
import { isLive } from './timeline'

const PAGES = ['overview', 'runs', 'schedules', 'jobs', 'settings'] as const

// The pages that draw a graph load React Flow and elk the first time one is opened.
const RunPage = lazy(() => import('./pages/RunPage').then((module) => ({ default: module.RunPage })))
const JobPage = lazy(() => import('./pages/JobPage').then((module) => ({ default: module.JobPage })))

/** Tidevann's jobs console: the rail of its pages, the palette, the page the route names, and a run beside it. */
export function Console({ frame }: { frame: Frame }) {
    const { runs, jobs, prefs, setPrefs, me, now, runOf, jobOf } = useConsole()
    const actions = useActions()
    const { settings: look, setSettings: setLook, resolved } = frame.appearance
    const dark = resolved === 'dark'
    const [first = 'overview', second] = frame.route
    const page = (PAGES as readonly string[]).includes(first) ? first : 'missing'

    // A run shown on its own page is not shown beside it as well.
    const { close, opened } = actions
    useEffect(() => {
        if (first === 'runs' && second !== undefined && second === opened) close()
    }, [first, second, opened, close])

    const live = runs.filter((run) => isLive(run.at.state))
    const today = dayOf(now)
    const failedToday = runs.filter((run) => run.at.state === 'failed' && dayOf(run.created) === today).length
    const entry = (id: string, label: string, icon: typeof Play, href: string, count?: number) => ({
        id,
        label,
        icon,
        href,
        active: page === id,
        ...(count === undefined || count === 0 ? {} : { count }),
    })
    const groups: RailGroup[] = [
        { id: 'home', entries: [entry('overview', 'Overview', LayoutDashboard, '#/')] },
        {
            id: 'operate',
            title: 'Operate',
            entries: [entry('runs', 'Runs', Play, '#/runs', live.length), entry('schedules', 'Schedules', CalendarClock, '#/schedules')],
        },
        { id: 'build', title: 'Build', entries: [entry('jobs', 'Jobs', Workflow, '#/jobs')] },
        { id: 'system', title: 'System', entries: [entry('settings', 'Settings', Settings, '#/settings')] },
    ]

    const palette: PaletteGroup[] = [
        ...placeCommands(groups, (href) => go(href.slice(1))),
        {
            title: 'Jobs',
            rank: 5,
            commands: jobs.map((job) => ({
                id: `job-${job.id}`,
                label: job.name,
                code: job.id,
                icon: ListChecks,
                hint: job.project,
                onSelect: () => go(`/jobs/${job.id}`),
            })),
        },
        {
            title: 'Run a job',
            rank: 6,
            commands: jobs.map((job) => ({
                id: `run-${job.id}`,
                label: `Run ${job.id} now`,
                icon: Play,
                keywords: ['start', 'run now', job.name],
                onSelect: () => actions.runNow(job),
            })),
        },
        ...frame.palette,
        {
            title: 'Account',
            rank: 40,
            commands: [{ id: 'sign-out', label: 'Sign out', icon: LogOut, onSelect: () => void setPrefs({ user: null }) }],
        },
    ]

    const runPage = first === 'runs' && second !== undefined ? runOf(second) : undefined
    const jobPage = first === 'jobs' && second !== undefined ? jobOf(second) : undefined
    const label =
        { overview: 'Overview', runs: 'Runs', schedules: 'Schedules', jobs: 'Jobs', settings: 'Settings', missing: 'Not found' }[page] ?? ''
    const trail: Crumb[] = [{ label: 'Tidevann', href: '#/' }]
    if (second !== undefined && (first === 'runs' || first === 'jobs')) {
        trail.push({ label, href: `#/${first}` }, { label: first === 'runs' ? (runPage?.id ?? second) : (jobPage?.name ?? second) })
    } else trail.push({ label })

    const nextUp = jobs
        .filter((job) => job.schedule !== null && !job.paused)
        .map((job) => ({ job, at: job.schedule === null ? Infinity : nextFire(job.schedule, now) }))
        .sort((left, right) => left.at - right.at)[0]
    const shown = actions.opened === null ? undefined : runOf(actions.opened)

    let content
    if (page === 'overview') content = <Overview />
    else if (page === 'runs') content = second === undefined ? <Runs /> : <RunPage id={second} />
    else if (page === 'jobs') content = second === undefined ? <Jobs /> : <JobPage id={second} />
    else if (page === 'schedules') content = <Schedules />
    else if (page === 'settings') content = null
    else
        content = (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>Nothing at this address</EmptyTitle>
                    <EmptyDescription>The console has no page at #/{frame.route.join('/')}.</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" variant="outline" onClick={() => go('/')}>
                    Go to the overview
                </Button>
            </Empty>
        )
    const fills = second === undefined && (page === 'runs' || page === 'jobs' || page === 'schedules')

    return (
        <Shell
            palette={palette}
            desktop={frame.desktop}
            route={frame.route.join('/')}
            rail={
                <Rail
                    mark={<TidevannMark />}
                    markHref="#/"
                    name="Tidevann"
                    groups={groups}
                    foot={
                        <AccountMenu
                            name={me}
                            where="tidevann.example.org"
                            onSettings={() => go('/settings')}
                            scheme={look.scheme}
                            onSchemeChange={(scheme) => setLook({ ...look, scheme })}
                            onSignOut={() => void setPrefs({ user: null })}
                        />
                    }
                />
            }
            top={
                <TopBar
                    trail={trail}
                    actions={
                        <>
                            <ThemeToggle dark={dark} onToggle={() => setLook({ ...look, scheme: dark ? 'light' : 'dark' })} />
                            <Button variant="ghost" size="icon-sm" aria-label="Settings" onClick={() => go('/settings')}>
                                <Settings aria-hidden />
                            </Button>
                        </>
                    }
                />
            }
            foot={
                <StatusLine
                    live={live.some((run) => run.at.state === 'running')}
                    tone={prefs.scheduler ? undefined : 'warn'}
                    note={
                        !prefs.scheduler
                            ? 'The scheduler is off'
                            : nextUp === undefined
                              ? 'No schedule is on'
                              : `Next: ${nextUp.job.id} at ${clock(nextUp.at)} UTC`
                    }
                >
                    <StatusItem label="going">{live.length}</StatusItem>
                    <StatusItem label="failed today">{failedToday}</StatusItem>
                </StatusLine>
            }
            panelOpen={shown !== undefined}
            onPanelOpenChange={(open) => !open && actions.close()}
            panel={shown === undefined ? undefined : <RunPanel key={shown.id} run={shown} />}
        >
            {page === 'settings' ? (
                <SettingsPage frame={frame} />
            ) : (
                <Page className={fills ? 'h-full' : undefined}>
                    <Suspense fallback={null}>{content}</Suspense>
                </Page>
            )}
        </Shell>
    )
}
