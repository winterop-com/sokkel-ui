import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { registerPlugins } from '@winterop-com/sokkel-ui/lib/plugins'
import type { SearchGroup, SearchSource } from '@winterop-com/sokkel-ui/lib/search'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Toaster } from '@winterop-com/sokkel-ui/primitives/sonner'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { ServerMenu } from '@winterop-com/sokkel-ui/ServerMenu'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusLine, StatusItem } from '@winterop-com/sokkel-ui/StatusLine'
import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'
import { themeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { dhis2Plugin } from '@winterop-com/sokkel-ui-dhis2/plugin'
import { Calculator, Database, FunctionSquare, GitBranch, ListChecks, Network, Settings, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { resetAll, useCollection } from 'tidevann-shared/backend'
import { useFrame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go, useOverlayRoute } from 'tidevann-shared/router'

import { indicators, ME, programRules, SERVER, validationRules } from './data/backend'
import { DATA_ELEMENTS, ORG_UNITS } from './data/metadata'
import { LATEST, namesOf, VERSIONS, type Version } from './data/versions'
import { DataElements } from './pages/DataElements'
import { Functions } from './pages/Functions'
import { IndicatorPage } from './pages/Indicator'
import { Indicators } from './pages/Indicators'
import { OrgUnits } from './pages/OrgUnits'
import { ProgramRules } from './pages/ProgramRules'
import { ValidationRulePage } from './pages/ValidationRule'
import { ValidationRules } from './pages/ValidationRules'
import { FootContext, STATUSES, VersionContext, type Foot } from './ui'

/** The themes `app.css` loads, the base theme first. */
const OFFERED = new Set(['tidevann', 'indigo', 'paper', 'contrast', 'steel'])
const APP_THEMES = THEMES.filter((theme) => OFFERED.has(theme.value))

const PLACES_BY_ROUTE: Record<string, string> = {
    '': 'indicators',
    indicators: 'indicators',
    'validation-rules': 'validation-rules',
    'program-rules': 'program-rules',
    'data-elements': 'data-elements',
    'org-units': 'org-units',
    functions: 'functions',
}

const TITLES: Record<string, string> = {
    indicators: 'Indicators',
    'validation-rules': 'Validation rules',
    'program-rules': 'Program rules',
    'data-elements': 'Data elements',
    'org-units': 'Organization units',
    functions: 'Functions',
}

function railGroups(place: string): RailGroup[] {
    const entry = (
        id: string,
        label: string,
        description: string,
        icon: RailGroup['entries'][number]['icon'],
        keywords: string[] = [],
    ) => ({
        id,
        label,
        description,
        icon,
        href: `#/${id}`,
        active: place === id,
        keywords,
    })
    return [
        {
            id: 'expressions',
            entries: [
                entry('indicators', 'Indicators', 'Numerators over denominators', Calculator, ['expression']),
                entry('validation-rules', 'Validation rules', 'What the data must hold to', ShieldCheck, ['violations']),
                entry('program-rules', 'Program rules', 'How a form reacts as it is filled', GitBranch, ['condition', 'action']),
            ],
        },
        {
            id: 'metadata',
            title: 'Metadata',
            entries: [
                entry('data-elements', 'Data elements', 'What is reported', Database),
                entry('org-units', 'Organization units', 'Where it is reported from', Network, ['hierarchy', 'places']),
                entry('functions', 'Functions', 'What the server version knows', FunctionSquare, ['variables', 'version']),
            ],
        },
    ]
}

/** The Workbench example: indicators, validation rules and program rules in DHIS2's expression languages, on a simulated server. */
export function App() {
    const frame = useFrame()
    const settingsRoute = useOverlayRoute(frame.route, 'settings')
    const route = settingsRoute.route
    const place = PLACES_BY_ROUTE[route[0] ?? ''] ?? 'indicators'
    const groups = railGroups(place)
    const [foot, setFoot] = useState<Foot>({})
    const [section, setSection] = useState('appearance')
    const [settingsQuery, setSettingsQuery] = useState('')
    const [stored, setVersion] = useStored<Version>('server-version', LATEST)
    const version: Version = (VERSIONS as readonly string[]).includes(stored) ? stored : LATEST
    const { settings, setSettings } = frame.appearance
    const { rows: allIndicators } = useCollection(indicators)
    const { rows: allRules } = useCollection(validationRules)
    const { rows: allProgramRules } = useCollection(programRules)

    // The plugin learns the names the server's version knows, and every open editor takes them.
    useEffect(() => {
        registerPlugins([dhis2Plugin(namesOf(version))])
    }, [version])

    const openSettings = (at = 'appearance') => {
        setSection(at)
        if (!settingsRoute.open) go('/settings')
    }

    const palette: PaletteGroup[] = [
        ...placeCommands(groups, (href) => go(href.slice(1)), { title: 'Pages' }),
        {
            title: 'Server version',
            verb: 'Switch',
            commands: VERSIONS.map((one) => ({
                id: `version-${one}`,
                label: `Run as ${one}`,
                icon: FunctionSquare,
                code: one,
                keywords: ['version', 'server'],
                onSelect: () => setVersion(one),
            })),
        },
        {
            title: 'Actions',
            commands: [
                {
                    id: 'settings',
                    label: 'Settings',
                    icon: Settings,
                    verb: 'Open',
                    keywords: ['preferences', 'theme', 'version'],
                    onSelect: () => openSettings(),
                },
            ],
        },
        ...frame.palette,
    ]

    const search: SearchSource = useCallback(
        (query: string) => {
            const asked = query.trim().toLowerCase()
            const matches = (...texts: string[]) => texts.some((one) => one.toLowerCase().includes(asked))
            const found: SearchGroup[] = [
                {
                    kind: 'indicators',
                    title: 'Indicators',
                    results: (allIndicators ?? [])
                        .filter((one) => matches(one.name, one.id, one.code))
                        .slice(0, 6)
                        .map((one) => ({ id: one.id, title: one.name, meta: one.id, icon: Calculator })),
                },
                {
                    kind: 'validation-rules',
                    title: 'Validation rules',
                    results: (allRules ?? [])
                        .filter((one) => matches(one.name, one.id, one.code))
                        .slice(0, 6)
                        .map((one) => ({ id: one.id, title: one.name, meta: one.id, icon: ShieldCheck })),
                },
                {
                    kind: 'program-rules',
                    title: 'Program rules',
                    results: (allProgramRules ?? [])
                        .filter((one) => matches(one.name, one.id))
                        .slice(0, 6)
                        .map((one) => ({ id: one.id, title: one.name, meta: one.id, icon: GitBranch })),
                },
                {
                    kind: 'data-elements',
                    title: 'Data elements',
                    results: DATA_ELEMENTS.filter((one) => matches(one.name, one.id, one.code))
                        .slice(0, 6)
                        .map((one) => ({ id: one.id, title: one.name, meta: one.id, icon: Database })),
                },
                {
                    kind: 'org-units',
                    title: 'Organization units',
                    results: ORG_UNITS.filter((one) => matches(one.name, one.id, one.code))
                        .slice(0, 6)
                        .map((one) => ({ id: one.id, title: one.name, meta: one.id, icon: Network })),
                },
            ]
            return found
        },
        [allIndicators, allRules, allProgramRules],
    )

    const settingsGroups: SettingsGroup[] = [
        {
            id: 'app',
            sections: [
                {
                    id: 'appearance',
                    label: 'Appearance',
                    settings: [
                        ...themeSettings({
                            value: settings,
                            onChange: setSettings,
                            themes: APP_THEMES,
                            system: true,
                            themeList: true,
                        }),
                    ],
                },
                {
                    id: 'server',
                    label: 'Server',
                    settings: [
                        {
                            id: 'version',
                            title: 'Server version',
                            description:
                                'The version the simulated server runs. Each knows its own functions and variables: the editors color, offer and check only those.',
                            layout: 'below',
                            keywords: ['version', 'functions', 'variables', ...VERSIONS],
                            control: (
                                <Segmented
                                    label="Server version"
                                    value={version}
                                    onValueChange={setVersion}
                                    options={VERSIONS.map((one) => ({ value: one, label: one }))}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'demo',
                    label: 'Demo data',
                    reset: false,
                    settings: [
                        {
                            id: 'reset',
                            title: 'Reset the demo data',
                            description: 'Puts back the indicators, validation rules and program rules the demo starts with.',
                            control: (
                                <Button variant="outline" size="sm" onClick={() => void resetAll().then(() => window.location.reload())}>
                                    Reset
                                </Button>
                            ),
                        },
                    ],
                },
            ],
        },
    ]

    const [first, second] = route
    const opened =
        second === undefined
            ? undefined
            : first === 'indicators'
              ? allIndicators?.find((one) => one.id === second)?.name
              : first === 'validation-rules'
                ? allRules?.find((one) => one.id === second)?.name
                : undefined
    const trail: Crumb[] = [
        { label: 'larkspur', href: '#/', code: true },
        { label: TITLES[place] ?? '', href: opened === undefined ? undefined : `#/${place}` },
        ...(opened === undefined ? [] : [{ label: opened }]),
    ]

    let page: ReactNode
    if (first === 'indicators' && second !== undefined) page = <IndicatorPage key={second} id={second} />
    else if (first === 'validation-rules' && second !== undefined) page = <ValidationRulePage key={second} id={second} />
    else if (first === 'validation-rules') page = <ValidationRules />
    else if (first === 'program-rules') page = <ProgramRules selected={second} />
    else if (first === 'data-elements') page = <DataElements selected={second} />
    else if (first === 'org-units') page = <OrgUnits selected={second} />
    else if (first === 'functions') page = <Functions />
    else page = <Indicators />

    return (
        <TooltipProvider>
            <VersionContext.Provider value={version}>
                <StatusProvider statuses={STATUSES}>
                    <FootContext.Provider value={setFoot}>
                        <Shell
                            palette={palette}
                            paletteSearch={{
                                search,
                                minQuery: 2,
                                onOpen: (result, group) => go(`/${group.kind}/${result.id}`),
                            }}
                            paletteFoot={{ mark: <TidevannMark />, name: 'Workbench' }}
                            paletteWords={{ placeholder: 'Go to a page, find an indicator, a rule or a data element' }}
                            desktop={frame.desktop}
                            route={route.join('/')}
                            contentKey={route.slice(0, 2).join('/')}
                            rail={
                                <Rail
                                    mark={<TidevannMark />}
                                    markHref="#/"
                                    name="Workbench"
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
                            top={
                                <TopBar
                                    trail={trail}
                                    actions={
                                        <ServerMenu
                                            name={SERVER.name}
                                            version={version}
                                            state="up"
                                            facts={[
                                                SERVER.address,
                                                `Knows ${String(namesOf(version).functions.length)} functions and ${String(namesOf(version).variables.length)} program variables`,
                                                'Simulated: every value is made in the page',
                                            ]}
                                        >
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    <ListChecks aria-hidden />
                                                    Server version
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                    <DropdownMenuRadioGroup
                                                        value={version}
                                                        onValueChange={(one) => setVersion(one as Version)}
                                                    >
                                                        {VERSIONS.map((one) => (
                                                            <DropdownMenuRadioItem key={one} value={one}>
                                                                {one}
                                                            </DropdownMenuRadioItem>
                                                        ))}
                                                    </DropdownMenuRadioGroup>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                            <DropdownMenuItem onClick={() => go('/functions')}>
                                                <FunctionSquare aria-hidden />
                                                What this version knows
                                            </DropdownMenuItem>
                                        </ServerMenu>
                                    }
                                />
                            }
                            foot={
                                <StatusLine note={foot.note}>
                                    {foot.items}
                                    <StatusItem label="server">{version}</StatusItem>
                                </StatusLine>
                            }
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
                                if (at === 'server') setVersion(LATEST)
                            }}
                        />
                        <Toaster position="bottom-right" />
                    </FootContext.Provider>
                </StatusProvider>
            </VersionContext.Provider>
        </TooltipProvider>
    )
}
