import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteCommand, PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { useShortcuts } from '@winterop-com/sokkel-ui/hooks/use-shortcuts'
import type { ShortcutGroup } from '@winterop-com/sokkel-ui/ShortcutsDialog'
import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { ServerMenu, type ServerState } from '@winterop-com/sokkel-ui/ServerMenu'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { ThemeToggle } from '@winterop-com/sokkel-ui/ThemeToggle'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import {
    ArrowDownToLine,
    Boxes,
    Columns3,
    Cpu,
    HardDrive,
    MessageSquare,
    MessageSquarePlus,
    Play,
    Power,
    PowerOff,
    Search,
    Settings,
    SquareTerminal,
    Trash2,
} from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'
import { log } from './data/backend'
import { bytes, counted, uptime } from './data/format'
import { chatWith } from './actions'
import { clearEnded, onPulled } from './engine/downloads'
import { startRunner, stopRunner } from './engine/runner'
import { ChatPage } from './pages/Chat'
import { ChatSettingsPanel } from './pages/ChatSettings'
import { DiscoverPage } from './pages/Discover'
import { DownloadsPage } from './pages/Downloads'
import { LibraryPage } from './pages/Library'
import { ModelPage } from './pages/ModelPage'
import { RunnerPage } from './pages/Runner'
import { SettingsPage } from './pages/Settings'
import { useApp } from './state'

// The pages that draw charts load ECharts the first time one is opened.
const DiskPage = lazy(() => import('./pages/Disk').then((module) => ({ default: module.DiskPage })))
const ComparePage = lazy(() => import('./pages/Compare').then((module) => ({ default: module.ComparePage })))

const PAGES = ['library', 'disk', 'discover', 'downloads', 'chat', 'compare', 'runner', 'settings'] as const
type PageId = (typeof PAGES)[number]

const LABELS: Record<PageId, string> = {
    library: 'Models',
    disk: 'Disk usage',
    discover: 'Discover',
    downloads: 'Downloads',
    chat: 'Chat',
    compare: 'Compare',
    runner: 'Runner',
    settings: 'Settings',
}

/** Keys the composers answer themselves, which the shortcuts dialog lists after the app's own. */
const SHORTCUTS: ShortcutGroup[] = [
    {
        title: 'Chat and compare',
        shortcuts: [
            { id: 'send', action: 'Send the message, or run the comparison', keys: ['Enter'] },
            { id: 'line', action: 'Break the line', keys: ['Shift', 'Enter'] },
        ],
    },
]

/** The app's own keys, bound inside the shell so its shortcuts dialog lists them. */
function AppKeys({ newChat }: { newChat: () => void }) {
    useShortcuts(
        [
            { id: 'new-chat', key: 'n', label: 'New chat', group: 'Chat', run: newChat },
            { id: 'go-library', key: 'l', label: 'Go to the models', group: 'Go to', run: () => go('/library') },
            { id: 'go-chat', key: 'c', label: 'Go to the chat', group: 'Go to', run: () => go('/chat') },
            { id: 'go-discover', key: 'd', label: 'Go to Discover', group: 'Go to', run: () => go('/discover') },
            { id: 'go-runner', key: 'r', label: 'Go to the runner', group: 'Go to', run: () => go('/runner') },
        ],
        [newChat],
    )
    return null
}

/** The runner's status as the server menu says it. */
const SERVER: Record<string, ServerState> = { up: 'up', down: 'down', starting: 'checking', stopping: 'checking' }

/** The Models app: the library, its pulls, the chat, the comparison and the runner, in Tidevann's frame. */
export function ModelsApp({ frame }: { frame: Frame }) {
    const app = useApp()
    const { models, conversations, downloads, runner, loaded, prefs } = app
    const { settings: look, setSettings: setLook, resolved } = frame.appearance
    const dark = resolved === 'dark'
    const [first = 'library', ...rest] = frame.route
    const page: PageId | 'missing' = (PAGES as readonly string[]).includes(first) ? (first as PageId) : 'missing'
    const second = rest.length === 0 ? undefined : rest.join('/')
    const [checking, setChecking] = useState(false)
    // The uptime in the foot and the server menu moves on every half minute.
    const [now, setNow] = useState(Date.now)
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30_000)
        return () => clearInterval(timer)
    }, [])
    const [panelOpen, setPanelOpen] = useStored('models.chat.panel', false)

    useEffect(
        () =>
            onPulled((pulled) =>
                toast.add({
                    type: 'success',
                    title: `${pulled.name} is in the library`,
                    description: `${pulled.quant}, ${bytes(pulled.size)}`,
                    actionProps: { children: 'Open', onClick: () => go(`/library/${`${pulled.name}-${pulled.quant}`.toLowerCase()}`) },
                }),
            ),
        [],
    )

    const pulling = downloads.filter((one) => one.state === 'running' || one.state === 'queued' || one.state === 'paused')
    const status = runner?.status ?? 'down'
    const ready = loaded.filter((one) => one.state === 'ready')
    const entry = (id: PageId, icon: typeof Play, count?: number, keywords?: string[]) => ({
        id,
        label: LABELS[id],
        icon,
        href: `#/${id}`,
        active: page === id,
        keywords,
        ...(count === undefined || count === 0 ? {} : { count }),
    })
    const groups: RailGroup[] = [
        {
            id: 'library',
            title: 'Library',
            entries: [entry('library', Boxes, undefined, ['models', 'library']), entry('disk', HardDrive, undefined, ['storage', 'space'])],
        },
        {
            id: 'get',
            title: 'Get models',
            entries: [
                entry('discover', Search, undefined, ['search', 'pull', 'hub']),
                entry('downloads', ArrowDownToLine, pulling.length, ['pulls']),
            ],
        },
        {
            id: 'use',
            title: 'Use',
            entries: [
                entry('chat', MessageSquare, undefined, ['conversations', 'ask']),
                entry('compare', Columns3, undefined, ['side by side']),
            ],
        },
        { id: 'run', title: 'Run', entries: [entry('runner', Cpu, ready.length, ['memory', 'loaded', 'server'])] },
        { id: 'system', title: 'System', entries: [entry('settings', Settings, undefined, ['preferences', 'root', 'theme'])] },
    ]

    const defaultModel = app.modelOf(prefs.defaultModel) ?? models[0]
    const newChat = useCallback(() => {
        if (defaultModel !== undefined) chatWith(defaultModel)
    }, [defaultModel])
    const toggleRunner = () => void (status === 'up' ? stopRunner() : startRunner())

    const actions: PaletteCommand[] = [
        { id: 'new-chat', label: 'New chat', icon: MessageSquarePlus, hint: defaultModel?.name, onSelect: newChat },
        { id: 'pull', label: 'Pull a model', icon: ArrowDownToLine, keywords: ['download', 'discover'], onSelect: () => go('/discover') },
        { id: 'compare', label: 'Compare models', icon: Columns3, keywords: ['side by side'], onSelect: () => go('/compare/new') },
        status === 'up'
            ? { id: 'runner-stop', label: 'Stop the runner', icon: PowerOff, onSelect: toggleRunner }
            : { id: 'runner-start', label: 'Start the runner', icon: Power, onSelect: toggleRunner },
        ...(downloads.some((one) => one.state === 'done' || one.state === 'cancelled' || one.state === 'failed')
            ? [{ id: 'clear-pulls', label: 'Clear ended downloads', icon: Trash2, onSelect: () => void clearEnded() }]
            : []),
    ]
    const palette: PaletteGroup[] = [
        ...placeCommands(groups, (href) => go(href.slice(1))),
        { title: 'Actions', rank: 4, commands: actions },
        {
            title: 'Models',
            rank: 5,
            commands: models.map((model) => ({
                id: `model-${model.id}`,
                label: model.name,
                code: model.quant,
                icon: Boxes,
                hint: bytes(model.size),
                keywords: [model.family, model.format, model.publisher, ...model.tags],
                onSelect: () => go(`/library/${model.id}`),
            })),
        },
        {
            title: 'Chat with',
            rank: 6,
            commands: models.map((model) => ({
                id: `chat-${model.id}`,
                label: `Chat with ${model.name}`,
                icon: MessageSquarePlus,
                hint: model.quant,
                keywords: ['new chat', model.family],
                onSelect: () => chatWith(model),
            })),
        },
        {
            title: 'Conversations',
            rank: 7,
            commands: [...conversations]
                .sort((a, b) => b.time - a.time)
                .map((one) => ({
                    id: `conversation-${one.id}`,
                    label: one.title,
                    icon: MessageSquare,
                    hint: app.modelOf(one.model)?.name ?? one.model,
                    onSelect: () => go(`/chat/${one.id}`),
                })),
        },
        ...frame.palette,
    ]

    const trail: Crumb[] = []
    if (page === 'missing') trail.push({ label: 'Not found' })
    else if (second === undefined) trail.push({ label: LABELS[page] })
    else {
        trail.push({ label: LABELS[page], href: `#/${page}` })
        const named =
            page === 'library'
                ? app.modelOf(second)?.name
                : page === 'chat'
                  ? conversations.find((one) => one.id === second)?.title
                  : page === 'compare'
                    ? second === 'new'
                        ? 'New'
                        : 'Comparison'
                    : second
        trail.push({ label: named ?? second, code: page === 'library' })
    }

    const talk = page === 'chat' && second !== undefined ? conversations.find((one) => one.id === second) : undefined
    const fills =
        page === 'chat' ||
        page === 'compare' ||
        page === 'settings' ||
        (page !== 'missing' && second === undefined && ['library', 'downloads', 'discover'].includes(page))
    let content
    if (page === 'library') content = second === undefined ? <LibraryPage /> : <ModelPage id={second} />
    else if (page === 'disk') content = <DiskPage />
    else if (page === 'discover') content = <DiscoverPage />
    else if (page === 'downloads') content = <DownloadsPage />
    else if (page === 'runner') content = <RunnerPage />
    else if (page === 'compare') content = <ComparePage id={second} />
    else
        content = (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>Nothing at this address</EmptyTitle>
                    <EmptyDescription>The app has no page at #/{frame.route.join('/')}.</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" variant="outline" onClick={() => go('/library')}>
                    Go to the models
                </Button>
            </Empty>
        )

    return (
        <Shell
            palette={palette}
            paletteFoot={{ mark: <TidevannMark />, name: 'Models' }}
            shortcuts={SHORTCUTS}
            paletteWords={{ placeholder: 'Go to a page, open a model or a conversation' }}
            desktop={frame.desktop}
            route={frame.route.join('/')}
            panel={talk === undefined ? undefined : <ChatSettingsPanel conversation={talk} />}
            panelOpen={talk !== undefined && panelOpen}
            onPanelOpenChange={setPanelOpen}
            rail={
                <Rail
                    mark={<TidevannMark />}
                    markHref="#/library"
                    name="Models"
                    groups={groups}
                    foot={
                        <AccountMenu
                            name="ada"
                            where="tidevann.example.org"
                            local
                            onSettings={() => go('/settings')}
                            scheme={look.scheme}
                            onSchemeChange={(scheme) => setLook({ ...look, scheme })}
                        />
                    }
                />
            }
            top={
                <TopBar
                    trail={trail}
                    actions={
                        <>
                            <ServerMenu
                                name="Local runner"
                                version={runner?.version}
                                state={checking ? 'checking' : (SERVER[status] ?? 'down')}
                                facts={[
                                    'runner.example.org:8400',
                                    status === 'up'
                                        ? `Up for ${uptime(now - (runner?.since ?? now))}, ${counted(ready.length, 'model')} loaded`
                                        : status === 'down'
                                          ? 'Stopped; chats cannot be answered until it starts'
                                          : status === 'starting'
                                            ? 'Starting'
                                            : 'Stopping',
                                ]}
                                onCheck={() => {
                                    setChecking(true)
                                    setTimeout(() => {
                                        setChecking(false)
                                        log(
                                            status === 'up' ? 'info' : 'warn',
                                            'runner',
                                            status === 'up'
                                                ? 'probe: the runner answered in 3 ms'
                                                : 'probe: no answer from runner.example.org:8400',
                                        )
                                    }, 600)
                                }}
                                words={{
                                    up: 'Running',
                                    down: 'Stopped',
                                    checking: status === 'stopping' ? 'Stopping' : 'Starting',
                                    label: 'Runner',
                                }}
                            >
                                {status === 'up' ? (
                                    <DropdownMenuItem onClick={toggleRunner}>
                                        <PowerOff aria-hidden />
                                        Stop the runner
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={toggleRunner} disabled={status !== 'down'}>
                                        <Power aria-hidden />
                                        Start the runner
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => go('/runner')}>
                                    <SquareTerminal aria-hidden />
                                    Open the runner
                                </DropdownMenuItem>
                            </ServerMenu>
                            <ThemeToggle dark={dark} onToggle={() => setLook({ ...look, scheme: dark ? 'light' : 'dark' })} />
                        </>
                    }
                />
            }
            foot={
                <StatusLine
                    live={pulling.some((one) => one.state === 'running')}
                    tone={status === 'down' ? 'warn' : undefined}
                    note={
                        status === 'down'
                            ? 'The runner is stopped'
                            : pulling.length > 0
                              ? `Pulling ${pulling.map((one) => one.name).join(', ')}`
                              : `Runner up for ${uptime(now - (runner?.since ?? now))}`
                    }
                >
                    <StatusItem label="loaded">{ready.length === 0 ? 'none' : ready.map((one) => one.model).join(', ')}</StatusItem>
                    <StatusItem label="on disk">{`${String(models.length)} · ${bytes(models.reduce((sum, model) => sum + model.size, 0))}`}</StatusItem>
                </StatusLine>
            }
        >
            <AppKeys newChat={newChat} />
            {page === 'settings' ? (
                <SettingsPage frame={frame} />
            ) : page === 'chat' ? (
                <ChatPage id={second} />
            ) : (
                <Page className={fills ? 'h-full' : undefined}>
                    <Suspense fallback={null}>{content}</Suspense>
                </Page>
            )}
        </Shell>
    )
}
