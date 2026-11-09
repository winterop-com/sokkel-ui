import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { Banner } from '@winterop-com/sokkel-ui/Banner'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import type { SearchGroup, SearchSource } from '@winterop-com/sokkel-ui/lib/search'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Toaster } from '@winterop-com/sokkel-ui/primitives/sonner'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { ServerMenu, type ServerState } from '@winterop-com/sokkel-ui/ServerMenu'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { Shell } from '@winterop-com/sokkel-ui/Shell'
import type { ShortcutGroup } from '@winterop-com/sokkel-ui/ShortcutsDialog'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'
import { ThemePicker } from '@winterop-com/sokkel-ui/ThemePicker'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import {
    Braces,
    ClipboardList,
    FileText,
    HeartPulse,
    Inbox,
    LayoutDashboard,
    MapPin,
    Send,
    ServerCog,
    Settings,
    ServerCrash,
    Users,
} from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { resetAll, useCollection } from 'tidevann-shared/backend'
import { useFrame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'

import { forwardAll, households, ME, onServerDownChange, probe, receipts, SERVER, serverDown, setServerDown } from './data/backend'
import { FORMS, KIND } from './data/forms'
import { FormFill } from './pages/FormFill'
import { Forms } from './pages/Forms'
import { Health } from './pages/Health'
import { Household } from './pages/Household'
import { Households } from './pages/Households'
import { Overview } from './pages/Overview'
import { Places } from './pages/Places'
import { Playground } from './pages/Playground'
import { ReceiptPage } from './pages/Receipt'
import { Responses } from './pages/Responses'
import { Server } from './pages/Server'
import { FootContext, RECEIPT_STATUSES, type Foot } from './ui'

/** The themes `app.css` loads, the base theme first. */
const OFFERED = new Set(['tidevann', 'indigo', 'paper', 'contrast', 'terminal', 'steel', 'ember'])
const APP_THEMES = THEMES.filter((theme) => OFFERED.has(theme.value))

/** The place each first part of the route opens. */
const PLACES_BY_ROUTE: Record<string, string> = {
    '': 'overview',
    forms: 'forms',
    responses: 'responses',
    people: 'people',
    places: 'places',
    playground: 'playground',
    server: 'server',
    health: 'health',
}

const TITLES: Record<string, string> = {
    overview: 'Overview',
    forms: 'Forms',
    responses: 'Responses',
    people: 'Households',
    places: 'Places',
    playground: 'Playground',
    server: 'Server',
    health: 'Metadata health',
}

function railGroups(place: string, waiting: number): RailGroup[] {
    const entry = (
        id: string,
        label: string,
        description: string,
        icon: RailGroup['entries'][number]['icon'],
        href: string,
        extra = {},
    ) => ({
        id,
        label,
        description,
        icon,
        href,
        active: place === id,
        ...extra,
    })
    return [
        {
            id: 'records',
            entries: [
                entry('overview', 'Overview', 'What waits for review', LayoutDashboard, '#/'),
                entry('forms', 'Forms', 'Start a record', ClipboardList, '#/forms'),
                entry('responses', 'Responses', 'What was filed', Inbox, '#/responses', waiting > 0 ? { count: waiting } : {}),
                entry('people', 'Households', 'Who the survey follows', Users, '#/people', { keywords: ['people', 'register'] }),
                entry('places', 'Places', 'Regions and sites', MapPin, '#/places', { keywords: ['map', 'hierarchy'] }),
            ],
        },
        {
            id: 'server',
            title: 'Server',
            entries: [
                entry('playground', 'Playground', 'Try the API', Braces, '#/playground'),
                entry('server', 'Server', 'What the server offers', ServerCog, '#/server'),
                entry('health', 'Metadata health', 'Names, codes and translations', HeartPulse, '#/health'),
            ],
        },
    ]
}

const SHORTCUTS: ShortcutGroup[] = [
    {
        title: 'Forms',
        shortcuts: [
            { id: 'form-next', action: 'Move to the next field', keys: ['Tab'] },
            { id: 'form-cell', action: 'Save a count and move down', keys: ['Enter'] },
        ],
    },
]

/** Whether the server answers, asked when the app opens, when the outage is turned on or off, and on Check again. */
function useServerState(): { state: ServerState; check: () => void } {
    const [state, setState] = useState<ServerState>('checking')
    const check = useCallback(() => {
        setState('checking')
        probe().then(
            () => setState('up'),
            () => setState('down'),
        )
    }, [])
    useEffect(() => {
        check()
        return onServerDownChange(check)
    }, [check])
    return { state, check }
}

/** The Records example: forms filled in sections, responses and receipts, households and their visits, places on a map, the API and the metadata's health. */
export function App() {
    const frame = useFrame()
    const route = frame.route
    const place = PLACES_BY_ROUTE[route[0] ?? ''] ?? 'overview'
    const { rows: all } = useCollection(receipts)
    const { rows: homes } = useCollection(households)
    const waiting = all?.filter((receipt) => receipt.state === 'received').length ?? 0
    const groups = railGroups(place, waiting)
    const server = useServerState()
    const [foot, setFoot] = useState<Foot>({})
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [section, setSection] = useState('appearance')
    const [settingsQuery, setSettingsQuery] = useState('')
    const [keepPlace, setKeepPlace] = useStored('keep-place', true)
    const { settings, setSettings } = frame.appearance
    const down = server.state === 'down'

    const openSettings = (at = 'appearance') => {
        setSection(at)
        setSettingsOpen(true)
    }

    const sendOn = () => {
        forwardAll().then(
            ({ taken, refused }) =>
                taken + refused === 0
                    ? toast('Nothing waits to be sent on')
                    : toast.success(`${String(taken + refused)} sent on to the register`, {
                          description: refused === 0 ? 'The register took them all.' : `${String(refused)} refused; each receipt says why.`,
                      }),
            (failure: unknown) =>
                toast.error('Nothing was sent on', { description: failure instanceof Error ? failure.message : String(failure) }),
        )
    }

    const palette: PaletteGroup[] = [
        ...placeCommands(groups, (href) => go(href.slice(1)), { title: 'Pages' }),
        {
            title: 'Forms',
            commands: FORMS.map((form) => ({
                id: `form-${form.id}`,
                label: form.title,
                icon: ClipboardList,
                code: form.id,
                keywords: [KIND[form.kind].label],
                onSelect: () => go(`/forms/${form.id}`),
            })),
        },
        {
            title: 'Actions',
            verb: 'Run',
            commands: [
                { id: 'send-on', label: 'Send on every received response', icon: Send, keywords: ['forward'], onSelect: sendOn },
                { id: 'check-server', label: 'Check the server again', icon: ServerCrash, onSelect: server.check },
                {
                    id: 'settings',
                    label: 'Settings',
                    icon: Settings,
                    verb: 'Open',
                    keywords: ['preferences', 'theme'],
                    onSelect: () => openSettings(),
                },
            ],
        },
        ...frame.palette,
    ]

    const search: SearchSource = useCallback(
        (query: string) => {
            const asked = query.trim().toLowerCase()
            const found: SearchGroup[] = [
                {
                    kind: 'responses',
                    title: 'Responses',
                    results: (all ?? [])
                        .filter((receipt) => receipt.receipt.startsWith(asked))
                        .slice(0, 8)
                        .map((receipt) => ({
                            id: receipt.receipt,
                            title: FORMS.find((form) => form.id === receipt.formId)?.title ?? receipt.formId,
                            meta: receipt.receipt.slice(0, 12),
                            detail: receipt.state,
                            icon: FileText,
                        })),
                },
                {
                    kind: 'households',
                    title: 'Households',
                    results: (homes ?? [])
                        .filter((home) => home.identifier.toLowerCase().includes(asked))
                        .slice(0, 8)
                        .map((home) => ({ id: home.id, title: home.identifier, detail: `${String(home.size)} people`, icon: Users })),
                },
            ]
            return found
        },
        [all, homes],
    )

    const settingsGroups: SettingsGroup[] = [
        {
            id: 'app',
            sections: [
                {
                    id: 'appearance',
                    label: 'Appearance',
                    settings: [
                        {
                            id: 'look',
                            title: 'Theme',
                            description: 'Every theme has a light and a dark scheme.',
                            layout: 'below',
                            keywords: ['dark', 'light', 'scheme', 'density', ...APP_THEMES.map((theme) => theme.label)],
                            control: <ThemePicker value={settings} onChange={setSettings} themes={APP_THEMES} system themeList />,
                        },
                    ],
                },
                {
                    id: 'forms',
                    label: 'Forms',
                    settings: [
                        {
                            id: 'keep-place',
                            title: 'Keep the place chosen',
                            description: 'The next form opens reporting from the place the last one was filed for.',
                            control: <Switch aria-label="Keep the place chosen" checked={keepPlace} onCheckedChange={setKeepPlace} />,
                        },
                    ],
                },
                {
                    id: 'demo',
                    label: 'Demo server',
                    settings: [
                        {
                            id: 'answers',
                            title: 'The server answers',
                            description:
                                'Turn it off to see the app with a server that does not answer: the banner, the top bar and every page say so.',
                            keywords: ['offline', 'outage'],
                            control: (
                                <Switch
                                    aria-label="The server answers"
                                    checked={!serverDown()}
                                    onCheckedChange={(on) => setServerDown(!on)}
                                />
                            ),
                        },
                        {
                            id: 'reset',
                            title: 'Reset the demo data',
                            description: 'Puts back the responses and households the demo starts with.',
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

    const trail: Crumb[] = [{ label: 'juniper', href: '#/', code: true }, { label: TITLES[place] ?? '' }]

    let page: ReactNode
    const [first, second, third, fourth] = route
    if (first === 'forms' && second !== undefined)
        page = (
            <FormFill
                key={`${second}-${fourth ?? ''}`}
                formId={second}
                householdId={third === 'for' ? fourth : undefined}
                keepPlace={keepPlace}
            />
        )
    else if (first === 'forms') page = <Forms />
    else if (first === 'responses' && second !== undefined && second !== 'in') page = <ReceiptPage code={second} />
    else if (first === 'responses') page = <Responses state={second === 'in' ? third : undefined} />
    else if (first === 'people' && second !== undefined) page = <Household id={second} />
    else if (first === 'people') page = <Households />
    else if (first === 'places')
        page = <Places selected={second === undefined ? undefined : decodeURIComponent(route.slice(1).join('/'))} />
    else if (first === 'playground') page = <Playground />
    else if (first === 'server') page = <Server />
    else if (first === 'health') page = <Health />
    else page = <Overview serverState={server.state} />

    return (
        <TooltipProvider>
            <StatusProvider statuses={RECEIPT_STATUSES}>
                <FootContext.Provider value={setFoot}>
                    <Shell
                        palette={palette}
                        paletteSearch={{
                            search,
                            minQuery: 2,
                            onOpen: (result, group) => go(group.kind === 'responses' ? `/responses/${result.id}` : `/people/${result.id}`),
                        }}
                        paletteFoot={{ mark: <TidevannMark />, name: 'Records' }}
                        paletteWords={{ placeholder: 'Go to a page, open a form, find a response' }}
                        shortcuts={SHORTCUTS}
                        desktop={frame.desktop}
                        route={route.join('/')}
                        contentKey={route.slice(0, 2).join('/')}
                        banner={
                            down ? (
                                <Banner
                                    tone="critical"
                                    actions={
                                        <Button size="sm" variant="outline" onClick={server.check}>
                                            Check again
                                        </Button>
                                    }
                                >
                                    The server is not answering. What is shown was read before it stopped; nothing can be filed or sent on.
                                </Banner>
                            ) : undefined
                        }
                        rail={
                            <Rail
                                mark={<TidevannMark />}
                                markHref="#/"
                                name="Records"
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
                                        version={server.state === 'up' ? SERVER.version : undefined}
                                        state={server.state}
                                        facts={[
                                            SERVER.address,
                                            'Serves forms, places, households and responses',
                                            'Keeps every response it receives',
                                        ]}
                                        onCheck={server.check}
                                    >
                                        <DropdownMenuItem onClick={() => go('/server')}>
                                            <ServerCog aria-hidden />
                                            What this server offers
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openSettings('demo')}>
                                            <Settings aria-hidden />
                                            Demo server settings
                                        </DropdownMenuItem>
                                    </ServerMenu>
                                }
                            />
                        }
                        foot={
                            <StatusLine note={foot.note}>
                                {foot.items}
                                {waiting > 0 && place !== 'responses' && <StatusItem label="received">{waiting}</StatusItem>}
                            </StatusLine>
                        }
                    >
                        {page}
                    </Shell>
                    <SettingsDialog
                        open={settingsOpen}
                        onOpenChange={setSettingsOpen}
                        groups={settingsGroups}
                        active={section}
                        onActiveChange={setSection}
                        search={settingsQuery}
                        onSearchChange={setSettingsQuery}
                    />
                    <Toaster position="bottom-right" />
                </FootContext.Provider>
            </StatusProvider>
        </TooltipProvider>
    )
}
