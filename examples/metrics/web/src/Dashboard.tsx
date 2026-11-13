import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { DashboardArrange, type DashboardWidget } from '@winterop-com/sokkel-ui/dashboard/DashboardArrange'
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
import {
    Check,
    Copy,
    CopyPlus,
    LayoutDashboard,
    LayoutGrid,
    Maximize2,
    MoreHorizontal,
    PencilLine,
    Plus,
    RotateCcw,
    Share2,
    Table2,
    Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { TimeControls, variables } from './controls'
import { dashboards, seedDashboards, widgetCatalog } from './data'
import { DashboardDialog, InspectDialog } from './dialogs'
import { type Dashboard, type Panel, panelId } from './model'
import { KIND_ICONS, PanelView } from './PanelView'
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
    // Arranging holds for the dashboard it began on, and ends on leaving it for another.
    const [arrangingId, setArrangingId] = useState<string | null>(null)
    const arranging = arrangingId === dashboard.id
    const setArranging = (on: boolean) => setArrangingId(on ? dashboard.id : null)
    const grid = useRef<HTMLDivElement>(null)
    // The panels as last arranged here, drawn until the backend has kept them, so a drop never jumps back.
    const [held, setHeld] = useState<{ board: string; panels: Panel[] } | null>(null)
    const writes = useRef(0)
    const panels = held?.board === dashboard.id ? held.panels : dashboard.panels

    useEffect(() => {
        if (focus === null) return
        const index = panels.findIndex((panel) => panel.id === focus)
        const element = grid.current?.querySelector('[class*="@container/dashboard"]')?.children[index]
        element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        patchParams({ focus: null })
    }, [focus, panels])

    const save = (next: Panel[]) => dashboards.update(dashboard.id, { panels: next })
    const arrange = (next: Panel[]) => {
        setHeld({ board: dashboard.id, panels: next })
        writes.current += 1
        const write = writes.current
        void save(next).finally(() => {
            if (writes.current === write) setHeld(null)
        })
    }
    const seeded = useMemo(() => seedDashboards().find((one) => one.id === dashboard.id), [dashboard.id])
    const catalog = useMemo(() => widgetCatalog(), [])
    const titles = new Set(panels.map((panel) => panel.title))
    const palette: DashboardWidget[] = catalog
        .filter((panel) => !titles.has(panel.title))
        .map((panel) => {
            const Icon = KIND_ICONS[panel.kind]
            return { id: panel.id, label: panel.title, span: panel.span, icon: <Icon aria-hidden /> }
        })
    const isSeed =
        seeded !== undefined &&
        seeded.panels.length === panels.length &&
        seeded.panels.every((panel, index) => panel.id === panels[index]?.id && panel.span === panels[index]?.span)
    // Reset layout puts the seeded panels back in their places and widths, each keeping what it was edited to read.
    const resetLayout = () => {
        if (seeded === undefined) return
        arrange(seeded.panels.map((panel) => ({ ...(panels.find((one) => one.id === panel.id) ?? panel), span: panel.span })))
        toast.success('Layout reset')
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
                    arranging ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                reason={
                                    seeded === undefined
                                        ? 'Only the dashboards the demo came with have a layout to go back to.'
                                        : isSeed
                                          ? 'The dashboard is as it comes.'
                                          : undefined
                                }
                                onClick={resetLayout}
                            >
                                <RotateCcw aria-hidden />
                                Reset layout
                            </Button>
                            <Button size="sm" onClick={() => setArranging(false)}>
                                <Check aria-hidden />
                                Done
                            </Button>
                        </>
                    ) : (
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
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={panels.length === 0 && palette.length === 0}
                                onClick={() => setArranging(true)}
                            >
                                <LayoutGrid aria-hidden />
                                Arrange
                            </Button>
                            <Button size="sm" onClick={() => go(`/d/${dashboard.id}/new`, kept)}>
                                <Plus aria-hidden />
                                Add panel
                            </Button>
                        </>
                    )
                }
            />
            <VariablesBar variables={variables(view)} end={<TimeControls view={view} />} />
            {panels.length === 0 && !arranging ? (
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
                        onLayoutChange={arrange}
                        label={(panel) => panel.title}
                        arranging={arranging}
                        dense
                        palette={palette}
                        onAdd={(widget, index) => {
                            const made = catalog.find((panel) => panel.id === widget.id)
                            if (made !== undefined) arrange(insertItem(panels, { ...made, id: panelId() }, index))
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
