import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { DashboardArrange, type DashboardWidget } from '@winterop-com/sokkel-ui/dashboard/DashboardArrange'
import { DashboardEditActions, useDashboardEdit } from '@winterop-com/sokkel-ui/dashboard/DashboardEdit'
import { insertItem } from '@winterop-com/sokkel-ui/lib/reorder'
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
import { Copy, CopyPlus, LayoutDashboard, Maximize2, MoreHorizontal, PencilLine, Plus, Share2, Table2, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { TimeControls, variables } from './controls'
import { dashboards, seedDashboards, widgetCatalog } from './data'
import { DashboardDialog, InspectDialog } from './dialogs'
import { type Dashboard, type Panel, panelId } from './model'
import { KIND_ICONS, PanelView } from './PanelView'
import { go, patchParams, viewParams } from './place'
import type { View } from './view'

/**
 * A dashboard: its title and description, the variables and time controls, and its panels in a grid.
 * Edit holds every move, width, addition, copy and removal in a draft until Done keeps it; Cancel
 * throws it away and Reset puts the panels the demo came with back in their places and widths.
 */
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
    const seeded = useMemo(() => seedDashboards().find((one) => one.id === dashboard.id), [dashboard.id])
    const edit = useDashboardEdit<Panel>({
        layout: dashboard.panels,
        // The seeded panels in their places and widths, each keeping what it was edited to read.
        defaultLayout: seeded?.panels.map((panel) => ({
            ...(dashboard.panels.find((one) => one.id === panel.id) ?? panel),
            span: panel.span,
        })),
        onSave: (next) => dashboards.update(dashboard.id, { panels: next }),
    })
    const editing = edit.editing
    const panels = edit.layout

    useEffect(() => {
        if (focus === null) return
        const index = panels.findIndex((panel) => panel.id === focus)
        const element = grid.current?.querySelector('[class*="@container/dashboard"]')?.children[index]
        element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        patchParams({ focus: null })
    }, [focus, panels])

    /** A change to the panels: into the draft while editing, else kept at once. */
    const change = (next: Panel[], said: string) => {
        if (editing) return edit.change(next)
        void dashboards.update(dashboard.id, { panels: next }).then(() => toast.success(said))
    }
    const catalog = useMemo(() => widgetCatalog(), [])
    const titles = new Set(panels.map((panel) => panel.title))
    const palette: DashboardWidget[] = catalog
        .filter((panel) => !titles.has(panel.title))
        .map((panel) => {
            const Icon = KIND_ICONS[panel.kind]
            return { id: panel.id, label: panel.title, span: panel.span, icon: <Icon aria-hidden /> }
        })
    const duplicate = (panel: Panel, index: number) =>
        change(insertItem(panels, { ...panel, id: panelId(), title: `${panel.title} copy` }, index + 1), `${panel.title} duplicated`)
    const remove = (gone: Panel) =>
        change(
            panels.filter((panel) => panel.id !== gone.id),
            `${gone.title} deleted`,
        )
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
            {/* The panel editor is a page of its own, which would leave the draft behind. */}
            {!editing && (
                <DropdownMenuItem onClick={() => go(`/d/${dashboard.id}/edit/${panel.id}`, kept)}>
                    <PencilLine aria-hidden />
                    Edit
                </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => duplicate(panel, index)}>
                <Copy aria-hidden />
                Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* While editing, Cancel brings a deleted panel back, so it goes without asking. */}
            <DropdownMenuItem variant="destructive" onClick={() => (editing ? remove(panel) : setDeleting(panel))}>
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
                    <DashboardEditActions
                        edit={edit}
                        primary={
                            <Button size="sm" onClick={() => go(`/d/${dashboard.id}/new`, kept)}>
                                <Plus aria-hidden />
                                Add panel
                            </Button>
                        }
                    >
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
                    </DashboardEditActions>
                }
            />
            <VariablesBar variables={variables(view)} end={<TimeControls view={view} />} />
            {panels.length === 0 && !editing ? (
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
                    <DashboardArrange
                        layout={panels}
                        onLayoutChange={edit.change}
                        label={(panel) => panel.title}
                        arranging={editing}
                        dense
                        palette={palette}
                        onAdd={(widget, index) => {
                            const made = catalog.find((panel) => panel.id === widget.id)
                            if (made !== undefined) edit.change(insertItem(panels, { ...made, id: panelId() }, index))
                        }}
                        renderPanel={(panel) => (
                            <PanelView
                                panel={panel}
                                vars={view.vars}
                                range={view.range}
                                at={view.at}
                                zone={view.zone}
                                loading={view.refreshing}
                                menu={menu(panel, panels.indexOf(panel))}
                                expanded={viewing === panel.id}
                                onExpandedChange={(open) => patchParams({ view: open ? panel.id : null })}
                            />
                        )}
                    />
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
                        remove(gone)
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
