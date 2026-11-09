import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { DashboardGrid } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { VariablesBar } from '@winterop-com/sokkel-ui/dashboard/VariablesBar'
import { InlineEdit } from '@winterop-com/sokkel-ui/InlineEdit'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import {
    ArrowLeft,
    ArrowRight,
    Copy,
    CopyPlus,
    LayoutDashboard,
    Maximize2,
    MoreHorizontal,
    PencilLine,
    Plus,
    Share2,
    Table2,
    Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { TimeControls, variables } from './controls'
import { dashboards } from './data'
import { DashboardDialog, InspectDialog } from './dialogs'
import { type Dashboard, type Panel, panelId } from './model'
import { PanelView } from './PanelView'
import { go, patchParams, viewParams } from './place'
import type { View } from './view'

/** A dashboard: its title and description, the variables and time controls, and its panels in a grid. */
export function DashboardPage({
    dashboard,
    view,
    params,
    all,
    onShare,
}: {
    dashboard: Dashboard
    view: View
    params: URLSearchParams
    all: readonly Dashboard[]
    onShare: () => void
}) {
    const viewing = params.get('view')
    const focus = params.get('focus')
    const kept = viewParams(params)
    const [inspecting, setInspecting] = useState<Panel | null>(null)
    const [deleting, setDeleting] = useState<Panel | null>(null)
    const [deletingBoard, setDeletingBoard] = useState(false)
    const [details, setDetails] = useState(false)
    const grid = useRef<HTMLDivElement>(null)
    const { panels } = dashboard

    useEffect(() => {
        if (focus === null) return
        const index = panels.findIndex((panel) => panel.id === focus)
        const element = grid.current?.firstElementChild?.children[index]
        element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        patchParams({ focus: null })
    }, [focus, panels])

    const save = (next: Panel[]) => dashboards.update(dashboard.id, { panels: next })
    const move = (index: number, by: number) => {
        const next = [...panels]
        const [moved] = next.splice(index, 1)
        if (moved === undefined) return
        next.splice(index + by, 0, moved)
        void save(next)
    }
    const duplicate = (panel: Panel, index: number) => {
        const next = [...panels]
        next.splice(index + 1, 0, { ...panel, id: panelId(), title: `${panel.title} copy` })
        void save(next).then(() => toast.success(`${panel.title} duplicated`))
    }
    const duplicateBoard = () => {
        void dashboards
            .create({
                title: `${dashboard.title} copy`,
                description: dashboard.description,
                panels: panels.map((panel) => ({ ...panel, id: panelId() })),
            })
            .then((made) => {
                toast.success(`${made.title} made`)
                go(`/d/${made.id}`, kept)
            })
    }

    const menu = (panel: Panel, index: number) => (
        <>
            {panel.kind !== 'stat' && (
                <DropdownMenuItem onClick={() => patchParams({ view: panel.id })}>
                    <Maximize2 aria-hidden />
                    View
                </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setInspecting(panel)}>
                <Table2 aria-hidden />
                Inspect data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => go(`/d/${dashboard.id}/edit/${panel.id}`, kept)}>
                <PencilLine aria-hidden />
                Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicate(panel, index)}>
                <Copy aria-hidden />
                Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowLeft aria-hidden />
                Move earlier
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === panels.length - 1} onClick={() => move(index, 1)}>
                <ArrowRight aria-hidden />
                Move later
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(panel)}>
                <Trash2 aria-hidden />
                Delete
            </DropdownMenuItem>
        </>
    )

    return (
        <Page>
            <PageHeader
                title={
                    <InlineEdit
                        variant="title"
                        label="Title"
                        value={dashboard.title}
                        validate={(value) => (value.trim() === '' ? 'A dashboard needs a title.' : null)}
                        onSave={(value) => dashboards.update(dashboard.id, { title: value.trim() }).then(() => undefined)}
                    />
                }
                description={dashboard.description === '' ? undefined : dashboard.description}
                actions={
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label="More" title="More" />}>
                                <MoreHorizontal aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => setDetails(true)}>
                                    <PencilLine aria-hidden />
                                    Edit details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={duplicateBoard}>
                                    <CopyPlus aria-hidden />
                                    Duplicate dashboard
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => setDeletingBoard(true)}>
                                    <Trash2 aria-hidden />
                                    Delete dashboard
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm" onClick={onShare}>
                            <Share2 aria-hidden />
                            Share
                        </Button>
                        <Button size="sm" onClick={() => go(`/d/${dashboard.id}/new`, kept)}>
                            <Plus aria-hidden />
                            Add panel
                        </Button>
                    </>
                }
            />
            <VariablesBar variables={variables(view)} end={<TimeControls view={view} />} />
            {panels.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <LayoutDashboard aria-hidden />
                        </EmptyMedia>
                        <EmptyTitle>No panels yet</EmptyTitle>
                        <EmptyDescription>Add a panel, pick what it reads and how it draws it, and it lands here.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button size="sm" onClick={() => go(`/d/${dashboard.id}/new`, kept)}>
                            <Plus aria-hidden />
                            Add panel
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <div ref={grid}>
                    <DashboardGrid dense>
                        {panels.map((panel, index) => (
                            <PanelView
                                key={panel.id}
                                panel={panel}
                                vars={view.vars}
                                range={view.range}
                                at={view.at}
                                zone={view.zone}
                                loading={view.refreshing}
                                menu={menu(panel, index)}
                                expanded={viewing === panel.id}
                                onExpandedChange={(open) => patchParams({ view: open ? panel.id : null })}
                            />
                        ))}
                    </DashboardGrid>
                </div>
            )}
            <InspectDialog panel={inspecting} onOpenChange={(open) => !open && setInspecting(null)} view={view} />
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                question={`Delete ${deleting?.title ?? 'the panel'}?`}
                detail="The panel leaves this dashboard for good. What it read stays in the source."
                confirm={{
                    label: 'Delete',
                    destructive: true,
                    onConfirm: () => {
                        if (deleting === null) return
                        const gone = deleting
                        setDeleting(null)
                        void save(panels.filter((panel) => panel.id !== gone.id)).then(() => toast.success(`${gone.title} deleted`))
                    },
                }}
            />
            <ConfirmDialog
                open={deletingBoard}
                onOpenChange={setDeletingBoard}
                question={`Delete ${dashboard.title}?`}
                detail={`Its ${String(panels.length)} ${panels.length === 1 ? 'panel goes' : 'panels go'} with it.`}
                confirm={{
                    label: 'Delete',
                    destructive: true,
                    onConfirm: () => {
                        setDeletingBoard(false)
                        void dashboards.remove(dashboard.id).then(() => {
                            toast.success(`${dashboard.title} deleted`)
                            go('/dashboards')
                        })
                    },
                }}
            />
            <DashboardDialog open={details} onOpenChange={setDetails} dashboards={all} kept={kept} editing={dashboard} />
        </Page>
    )
}
