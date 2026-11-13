import type { Meta, StoryObj } from '@storybook/react-vite'
import { Play, Settings2, Workflow } from 'lucide-react'
import { useState } from 'react'

import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'
import { LinkProvider } from '@winterop-com/sokkel-ui/Link'
import { ListRow, ListRows } from '@winterop-com/sokkel-ui/ListRow'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { routerLink } from '../fixtures/router'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * `useOverlayRoute` puts an app's Settings on a route of its own (`#/settings`) while the page stays
 * the one it was opened from: the dialog opens over that page, Done goes back to it, and Back closes
 * it. Here the app's router is held in memory, handed to the hook as `back` and `replace`, so the
 * story never moves the page's own address; an app on the hash passes neither.
 */
const meta: Meta = { title: 'Patterns/Overlay route', parameters: { frame: 'none' } }
export default meta

const RUNS = [
    { id: 'run-4182', job: 'nightly-export', state: 'succeeded' },
    { id: 'run-4181', job: 'sync-inventory', state: 'failed' },
    { id: 'run-4180', job: 'rebuild-index', state: 'running' },
] as const

const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders'] as const

/** The route of a path, as its parts: `/jobs/nightly-export` is `['jobs', 'nightly-export']`. */
const partsOf = (path: string) => path.split('/').filter((part) => part !== '')

/** A router held in memory: the paths visited, the newest last. */
function useMemoryHistory(first: string) {
    const [paths, setPaths] = useState([first])
    return {
        route: partsOf(paths[paths.length - 1] ?? '/'),
        go: (path: string) => setPaths((now) => [...now, path]),
        back: () => setPaths((now) => (now.length > 1 ? now.slice(0, -1) : now)),
        replace: (route: readonly string[]) => setPaths((now) => [...now.slice(0, -1), `/${route.join('/')}`]),
    }
}

function RunsApp({ start }: { start: string }) {
    const history = useMemoryHistory(start)
    const settings = useOverlayRoute(history.route, 'settings', { fallback: ['runs'], back: history.back, replace: history.replace })
    const [place = 'runs'] = settings.route
    const [active, setActive] = useState('general')
    const [search, setSearch] = useState('')
    const [newTab, setNewTab] = useState(false)
    const [confirm, setConfirm] = useState(true)
    const places: RailGroup[] = [
        {
            id: 'operate',
            title: 'Operate',
            entries: [
                { id: 'runs', label: 'Runs', icon: Play, href: '/runs', active: place === 'runs' },
                { id: 'jobs', label: 'Jobs', icon: Workflow, href: '/jobs', active: place === 'jobs' },
            ],
        },
        { id: 'system', title: 'System', entries: [{ id: 'settings', label: 'Settings', icon: Settings2, href: '/settings' }] },
    ]
    const groups: SettingsGroup[] = [
        {
            id: 'preferences',
            sections: [
                {
                    id: 'general',
                    label: 'General',
                    settings: [
                        {
                            id: 'new-tab',
                            title: 'Open runs in a new tab',
                            control: <Switch aria-label="Open runs in a new tab" checked={newTab} onCheckedChange={setNewTab} />,
                        },
                        {
                            id: 'confirm',
                            title: 'Confirm before cancelling a run',
                            control: <Switch aria-label="Confirm before cancelling a run" checked={confirm} onCheckedChange={setConfirm} />,
                        },
                    ],
                },
            ],
        },
    ]
    return (
        <LinkProvider render={routerLink(history.go)}>
            <TooltipProvider>
                <Shell
                    rail={<Rail mark={<TidevannMark />} name="Tidevann" groups={places} />}
                    top={<TopBar trail={[{ label: place === 'jobs' ? 'Jobs' : 'Runs' }]} palette={false} />}
                >
                    <Page>
                        {place === 'jobs' ? (
                            <>
                                <PageHeader title="Jobs" count={JOBS.length} />
                                <ListRows label="Runs">
                                    {JOBS.map((job) => (
                                        <ListRow key={job} title={job} mono />
                                    ))}
                                </ListRows>
                            </>
                        ) : (
                            <>
                                <PageHeader title="Runs" count={RUNS.length} />
                                <ListRows>
                                    {RUNS.map((run) => (
                                        <ListRow key={run.id} title={run.job} detail={run.id} aside={<StatusChip status={run.state} />} />
                                    ))}
                                </ListRows>
                            </>
                        )}
                    </Page>
                </Shell>
                <SettingsDialog
                    open={settings.open}
                    onOpenChange={(open) => {
                        if (!open) settings.close()
                    }}
                    groups={groups}
                    active={active}
                    onActiveChange={setActive}
                    search={search}
                    onSearchChange={setSearch}
                />
            </TooltipProvider>
        </LinkProvider>
    )
}

/**
 * On Runs with Settings closed: Settings in the rail opens the dialog over Runs on its own route,
 * and Done or Back goes back to Runs. Going to Jobs first opens it over Jobs.
 */
export const Closed: StoryObj = { render: () => <RunsApp start="/runs" /> }

/**
 * Opened by a link to `/settings`, the app's first page: the dialog stands over the `fallback`
 * page, Runs, and Done puts Runs in its place in the history rather than going back out of the app.
 */
export const Linked: StoryObj = { render: () => <RunsApp start="/settings" /> }
