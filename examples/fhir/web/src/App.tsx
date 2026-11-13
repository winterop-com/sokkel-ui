import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { CodeProblem } from '@winterop-com/sokkel-ui/CodeEditor'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import type { SearchGroup, SearchSource } from '@winterop-com/sokkel-ui/lib/search'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Toaster } from '@winterop-com/sokkel-ui/primitives/sonner'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { Shell } from '@winterop-com/sokkel-ui/Shell'
import type { ShortcutGroup } from '@winterop-com/sokkel-ui/ShortcutsDialog'
import { StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'
import { themeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { Braces, Database, FileCode2, LayoutDashboard, Search, Settings } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { resetAll, useCollection } from 'tidevann-shared/backend'
import { useFrame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'
import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'

import { drafts } from './editing'
import { ME, resources, SERVER } from './data/server'
import { TYPE_NAMES } from './data/types'
import { CqlEditor, CqlLibraries } from './pages/Cql'
import { FhirPathPage } from './pages/FhirPath'
import { Overview } from './pages/Overview'
import { ResourcePage } from './pages/Resource'
import { ResourcePanel } from './pages/ResourcePanel'
import { Resources } from './pages/Resources'
import { SearchPage } from './pages/Search'
import { DEFAULT_PREFS, FootContext, STATUSES, titleOf, usePrefs, type Foot } from './ui'

/** The themes `app.css` loads, the base theme first. */
const OFFERED = new Set(['tidevann', 'paper', 'steel', 'contrast'])
const APP_THEMES = THEMES.filter((theme) => OFFERED.has(theme.value))

const TITLES: Record<string, string> = {
    overview: 'Overview',
    resources: 'Resources',
    fhirpath: 'FHIRPath',
    cql: 'CQL',
    search: 'Search',
}

function railGroups(place: string, type: string | undefined, counts: Record<string, number>): RailGroup[] {
    return [
        {
            id: 'server',
            entries: [
                {
                    id: 'overview',
                    label: 'Overview',
                    description: 'What the server holds',
                    icon: LayoutDashboard,
                    href: '#/',
                    active: place === 'overview',
                },
                {
                    id: 'resources',
                    label: 'Resources',
                    description: 'Read and edit as JSON',
                    icon: Database,
                    href: '#/resources/Patient',
                    active: place === 'resources' && type === undefined,
                    entries: TYPE_NAMES.map((name) => ({
                        id: `resources-${name}`,
                        label: name,
                        href: `#/resources/${name}`,
                        active: place === 'resources' && type === name,
                        count: counts[name],
                    })),
                },
            ],
        },
        {
            id: 'tools',
            title: 'Tools',
            entries: [
                {
                    id: 'fhirpath',
                    label: 'FHIRPath',
                    description: 'Evaluate expressions',
                    icon: Braces,
                    href: '#/fhirpath',
                    active: place === 'fhirpath',
                },
                {
                    id: 'cql',
                    label: 'CQL',
                    description: 'Libraries in versions',
                    icon: FileCode2,
                    href: '#/cql',
                    active: place === 'cql',
                    count: counts.Library,
                },
                {
                    id: 'search',
                    label: 'Search',
                    description: 'By search parameters',
                    icon: Search,
                    href: '#/search',
                    active: place === 'search',
                    keywords: ['query', 'find'],
                },
            ],
        },
    ]
}

const SHORTCUTS: ShortcutGroup[] = [
    {
        title: 'Editors',
        shortcuts: [
            { id: 'save', action: 'Save the resource or library', keys: ['Mod', 'S'] },
            { id: 'evaluate', action: 'Evaluate the expression', keys: ['Mod', 'Enter'] },
            { id: 'search', action: 'Run the search', keys: ['Enter'] },
        ],
    },
]

/** The FHIR workbench: a FHIR server's resources edited as JSON, FHIRPath evaluated live, CQL libraries in versions and search by parameters. */
export function App() {
    const frame = useFrame()
    // Settings open as a dialog over the page they were opened from.
    const settingsRoute = useOverlayRoute(frame.route, 'settings')
    const route = settingsRoute.route
    const [first = '', second, third] = route
    const place = TITLES[first] === undefined ? 'overview' : first
    const { rows } = useCollection(resources)
    const counts = Object.fromEntries(TYPE_NAMES.map((name) => [name, (rows ?? []).filter((row) => row.type === name).length]))
    const resourceType =
        place === 'resources' && second !== undefined && TYPE_NAMES.includes(second)
            ? second
            : place === 'resources'
              ? 'Patient'
              : undefined
    const groups = railGroups(place, place === 'resources' ? resourceType : undefined, counts)
    const [foot, setFoot] = useState<Foot>({})
    const [problems, setProblems] = useState<readonly CodeProblem[]>([])
    const [section, setSection] = useState('appearance')
    const [settingsQuery, setSettingsQuery] = useState('')
    const [prefs, setPrefs] = usePrefs()
    const { settings, setSettings } = frame.appearance

    const openSettings = (at = 'appearance') => {
        setSection(at)
        if (!settingsRoute.open) go('/settings')
    }

    const palette: PaletteGroup[] = [
        ...placeCommands(groups, (href) => go(href.slice(1)), { title: 'Pages' }),
        {
            title: 'Actions',
            verb: 'Open',
            commands: [
                ...TYPE_NAMES.map((name) => ({
                    id: `new-${name}`,
                    label: `New ${name}`,
                    icon: Database,
                    verb: 'Make',
                    onSelect: () => go(`/resources/${name}/new`),
                })),
                { id: 'settings', label: 'Settings', icon: Settings, keywords: ['preferences', 'theme'], onSelect: () => openSettings() },
            ],
        },
        ...frame.palette,
    ]

    const search: SearchSource = useCallback(
        (query: string) => {
            const asked = query.trim().toLowerCase()
            const groupsFound: SearchGroup[] = TYPE_NAMES.map((name) => ({
                kind: name,
                title: name,
                results: (rows ?? [])
                    .filter(
                        (row) =>
                            row.type === name && (titleOf(row.resource).toLowerCase().includes(asked) || row.resource.id.includes(asked)),
                    )
                    .slice(0, 6)
                    .map((row) => ({ id: row.id, title: titleOf(row.resource), meta: row.id, icon: Database })),
            }))
            return groupsFound
        },
        [rows],
    )

    const settingsGroups: SettingsGroup[] = [
        {
            id: 'app',
            sections: [
                {
                    id: 'appearance',
                    label: 'Appearance',
                    settings: [
                        ...themeSettings({ value: settings, onChange: setSettings, themes: APP_THEMES, system: true, themeList: true }),
                    ],
                },
                {
                    id: 'editors',
                    label: 'Editors',
                    settings: [
                        {
                            id: 'line-numbers',
                            title: 'Line numbers',
                            description: 'Number the lines of every editor.',
                            control: (
                                <Switch
                                    aria-label="Line numbers"
                                    checked={prefs.lineNumbers}
                                    onCheckedChange={(lineNumbers) => setPrefs({ lineNumbers })}
                                />
                            ),
                        },
                        {
                            id: 'wrap',
                            title: 'Wrap long lines',
                            description: 'Fold long lines at the editor’s edge instead of scrolling sideways.',
                            control: (
                                <Switch aria-label="Wrap long lines" checked={prefs.wrap} onCheckedChange={(wrap) => setPrefs({ wrap })} />
                            ),
                        },
                        {
                            id: 'size',
                            title: 'Text size',
                            description: 'Small fits more of a resource; regular reads easier.',
                            control: (
                                <Segmented
                                    label="Text size"
                                    size="sm"
                                    value={prefs.size}
                                    options={[
                                        { value: 'sm', label: 'Small' },
                                        { value: 'md', label: 'Regular' },
                                    ]}
                                    onValueChange={(size) => setPrefs({ size })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'tools',
                    label: 'FHIRPath and search',
                    settings: [
                        {
                            id: 'live',
                            title: 'Evaluate as typed',
                            description: 'Off, an expression is evaluated only on Evaluate or Mod-Enter.',
                            control: (
                                <Switch
                                    aria-label="Evaluate as typed"
                                    checked={prefs.live}
                                    onCheckedChange={(live) => setPrefs({ live })}
                                />
                            ),
                        },
                        {
                            id: 'page-size',
                            title: 'Matches per page',
                            description: 'How many matches a search returns when the query gives no _count.',
                            control: (
                                <Segmented
                                    label="Matches per page"
                                    size="sm"
                                    value={String(prefs.pageSize)}
                                    options={['10', '20', '50'].map((value) => ({ value, label: value }))}
                                    onValueChange={(value) => setPrefs({ pageSize: Number(value) })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'demo',
                    label: 'Demo server',
                    reset: false,
                    settings: [
                        {
                            id: 'reset',
                            title: 'Reset the demo data',
                            description: 'Puts back the resources and versions the server starts with, and drops unsaved edits.',
                            control: (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        void resetAll().then(() => {
                                            drafts.set({})
                                            window.location.reload()
                                        })
                                    }
                                >
                                    Reset
                                </Button>
                            ),
                        },
                    ],
                },
            ],
        },
    ]

    const trail: Crumb[] = [{ label: SERVER.name, href: '#/', code: true }, { label: TITLES[place] ?? '' }]
    if (place === 'resources' && resourceType !== undefined) {
        trail[1] = { label: 'Resources', href: '#/resources/Patient' }
        trail.push({ label: resourceType, ...(third === undefined ? {} : { href: `#/resources/${resourceType}` }) })
        if (third !== undefined) trail.push({ label: third === 'new' ? 'New' : third, code: third !== 'new' })
    }
    if (place === 'cql' && second !== undefined) {
        trail[1] = { label: 'CQL', href: '#/cql' }
        trail.push({ label: second, code: true })
    }

    let page: ReactNode
    let panel: ReactNode
    if (place === 'resources' && resourceType !== undefined && third !== undefined) {
        page = <ResourcePage key={`${resourceType}/${third}`} type={resourceType} id={third} onProblems={setProblems} />
        panel = <ResourcePanel key={`${resourceType}/${third}`} type={resourceType} id={third} problems={problems} />
    } else if (place === 'resources' && resourceType !== undefined) page = <Resources type={resourceType} />
    else if (place === 'fhirpath')
        page = <FhirPathPage subjectKey={second !== undefined && third !== undefined ? `${second}/${third}` : undefined} />
    else if (place === 'cql' && second !== undefined) page = <CqlEditor key={second} id={second} />
    else if (place === 'cql') page = <CqlLibraries />
    else if (place === 'search') page = <SearchPage />
    else page = <Overview />

    return (
        <TooltipProvider>
            <StatusProvider statuses={STATUSES}>
                <FootContext.Provider value={setFoot}>
                    <Shell
                        palette={palette}
                        paletteSearch={{ search, minQuery: 2, onOpen: (result) => go(`/resources/${result.id}`) }}
                        paletteFoot={{ mark: <TidevannMark />, name: 'FHIR Workbench' }}
                        paletteWords={{ placeholder: 'Go to a page, find a resource' }}
                        shortcuts={SHORTCUTS}
                        desktop={frame.desktop}
                        route={route.join('/')}
                        contentKey={route.slice(0, 3).join('/')}
                        panel={panel}
                        rail={
                            <Rail
                                mark={<TidevannMark />}
                                markHref="#/"
                                name="FHIR Workbench"
                                groups={groups}
                                foot={
                                    <AccountMenu
                                        name={ME}
                                        where={SERVER.address}
                                        local
                                        onSettings={() => openSettings()}
                                        scheme={settings.scheme}
                                        onSchemeChange={(scheme) => setSettings({ ...settings, scheme })}
                                    />
                                }
                            />
                        }
                        top={<TopBar trail={trail} />}
                        foot={<StatusLine note={foot.note}>{foot.items}</StatusLine>}
                    >
                        {page}
                    </Shell>
                    <SettingsDialog
                        open={settingsRoute.open}
                        onOpenChange={(open) => {
                            if (!open) settingsRoute.close()
                        }}
                        groups={settingsGroups}
                        active={section}
                        onActiveChange={setSection}
                        search={settingsQuery}
                        onSearchChange={setSettingsQuery}
                        onReset={(at) => {
                            if (at === 'appearance') setSettings({ ...DEFAULT_APPEARANCE })
                            if (at === 'editors')
                                setPrefs({ lineNumbers: DEFAULT_PREFS.lineNumbers, wrap: DEFAULT_PREFS.wrap, size: DEFAULT_PREFS.size })
                            if (at === 'tools') setPrefs({ live: DEFAULT_PREFS.live, pageSize: DEFAULT_PREFS.pageSize })
                        }}
                    />
                    <Toaster position="bottom-right" />
                </FootContext.Provider>
            </StatusProvider>
        </TooltipProvider>
    )
}
