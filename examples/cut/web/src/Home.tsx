import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { NotFound } from '@winterop-com/sokkel-ui/NotFound'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { Clapperboard, Copy, Film, PencilLine, Plus, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { savingNote, useCollection, useSaving } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'
import { byUpdated, createProject, deleteProject, duplicateProject, renameProject } from './actions'
import { prefs as prefsStore, projects } from './collections'
import { EditorPage } from './editor/EditorPage'
import { DEFAULT_PREFS, lengthOf, lengthText, type Prefs, type Project } from './model'
import { ProjectDialog } from './ProjectDialog'
import { ProjectsPage } from './ProjectsPage'
import { Settings } from './Settings'

type Asking = { kind: 'new' } | { kind: 'rename'; project: Project } | { kind: 'delete'; project: Project } | null

/** How many projects the rail lists under Recent. */
const RECENT = 5

/** Tidevann's editor: the projects, the one the address opens in the editor, and the settings over any page. */
export function Home({ frame }: { frame: Frame }) {
    const settings = useOverlayRoute(frame.route, 'settings')
    const route = settings.route
    const rows = useCollection(projects)
    const prefsRows = useCollection(prefsStore)
    const prefs: Prefs = prefsRows.rows?.[0] ?? { id: 'prefs', ...DEFAULT_PREFS }
    const saving = savingNote(useSaving())
    const all = byUpdated(rows.rows ?? [])
    const [asking, setAsking] = useState<Asking>(null)

    const [section, id] = route
    const project = section === 'p' ? all.find((one) => one.id === id) : undefined
    // A bare address opens the projects.
    useEffect(() => {
        if (section === undefined && !settings.open) window.location.replace('#/projects')
    }, [section, settings.open])

    const groups: RailGroup[] = [
        {
            id: 'home',
            entries: [
                {
                    id: 'projects',
                    label: 'Projects',
                    icon: Clapperboard,
                    href: '#/projects',
                    active: section === 'projects',
                    keywords: ['edits', 'list'],
                },
            ],
        },
        {
            id: 'recent',
            title: 'Recent',
            entries: all.slice(0, RECENT).map((one) => ({
                id: one.id,
                label: one.name,
                icon: Film,
                href: `#/p/${one.id}`,
                active: project?.id === one.id,
            })),
        },
        { id: 'system', title: 'System', entries: [{ id: 'settings', label: 'Settings', icon: Settings2, href: '#/settings' }] },
    ]
    const palette: PaletteGroup[] = [
        ...placeCommands(groups, (href) => {
            window.location.hash = href
        }),
        {
            title: 'Projects',
            rank: 5,
            commands: [
                { id: 'new', label: 'New project', icon: Plus, onSelect: () => setAsking({ kind: 'new' }) },
                ...(project === undefined
                    ? []
                    : [
                          {
                              id: 'rename',
                              label: 'Rename this project',
                              icon: PencilLine,
                              onSelect: () => setAsking({ kind: 'rename', project }),
                          },
                          { id: 'duplicate', label: 'Duplicate this project', icon: Copy, onSelect: () => void duplicateProject(project) },
                      ]),
            ],
        },
        ...frame.palette,
    ]

    const home: Crumb = { label: 'Tidevann', href: '#/' }
    const trail: Crumb[] =
        project !== undefined ? [home, { label: 'Projects', href: '#/projects' }, { label: project.name }] : [home, { label: 'Projects' }]

    let content
    if (rows.rows === undefined || prefsRows.rows === undefined)
        content = (
            <PageState loading={rows.error === undefined} error={rows.error}>
                {null}
            </PageState>
        )
    else if (section === 'projects' || section === undefined)
        content = (
            <ProjectsPage
                projects={all}
                onCreate={() => setAsking({ kind: 'new' })}
                onRename={(one) => setAsking({ kind: 'rename', project: one })}
                onDuplicate={(one) => void duplicateProject(one)}
                onDelete={(one) => setAsking({ kind: 'delete', project: one })}
            />
        )
    else if (project !== undefined)
        content = (
            <EditorPage
                key={project.id}
                project={project}
                prefs={prefs}
                onRename={() => setAsking({ kind: 'rename', project })}
                onDuplicate={() => void duplicateProject(project)}
                onDelete={() => setAsking({ kind: 'delete', project })}
            />
        )
    else content = <NotFound address={`#/${route.join('/')}`} homeHref="#/projects" />

    const editing = project !== undefined
    return (
        <Shell
            palette={palette}
            desktop={frame.desktop}
            route={route.join('/')}
            shortcuts={[]}
            rail={
                <Rail
                    mark={<TidevannMark />}
                    markHref="#/"
                    name="Tidevann"
                    groups={groups}
                    foot={
                        <AccountMenu
                            name="ada"
                            where="tidevann.example.org"
                            local
                            onSettings={() => go('/settings')}
                            scheme={frame.appearance.settings.scheme}
                            onSchemeChange={(scheme) => frame.appearance.setSettings({ ...frame.appearance.settings, scheme })}
                        />
                    }
                />
            }
            top={
                <TopBar
                    trail={trail}
                    actions={
                        <IconButton label="New project" variant="ghost" size="icon-sm" onClick={() => setAsking({ kind: 'new' })}>
                            <Plus aria-hidden />
                        </IconButton>
                    }
                />
            }
            foot={
                <StatusLine note={saving.note} tone={saving.tone} live={saving.live}>
                    {editing ? (
                        <StatusItem label="length">{lengthText(lengthOf(project))}</StatusItem>
                    ) : (
                        <StatusItem label={all.length === 1 ? 'project' : 'projects'}>{all.length}</StatusItem>
                    )}
                </StatusLine>
            }
        >
            <Page className="h-full">{content}</Page>
            {settings.open && prefsRows.rows !== undefined && <Settings prefs={prefs} frame={frame} onClose={settings.close} />}
            {(asking?.kind === 'new' || asking?.kind === 'rename') && (
                <ProjectDialog
                    renaming={asking.kind === 'rename' ? asking.project : undefined}
                    taken={all.map((one) => one.name)}
                    onClose={() => setAsking(null)}
                    onCreate={createProject}
                    onRename={renameProject}
                />
            )}
            <ConfirmDialog
                open={asking?.kind === 'delete'}
                onOpenChange={(open) => {
                    if (!open) setAsking(null)
                }}
                question={`Delete ${asking?.kind === 'delete' ? asking.project.name : 'the project'}?`}
                detail={
                    asking?.kind === 'delete'
                        ? `Its ${String(asking.project.clips.length)} clips go with it; the media in the bin stays. This cannot be undone.`
                        : undefined
                }
                confirm={{
                    label: 'Delete',
                    destructive: true,
                    onConfirm: () => {
                        if (asking?.kind !== 'delete') return
                        const gone = asking.project
                        setAsking(null)
                        if (project?.id === gone.id) go('/projects')
                        void deleteProject(gone)
                    },
                }}
            />
        </Shell>
    )
}
