import { DashboardArrange, type DashboardWidget } from '@winterop-com/sokkel-ui/dashboard/DashboardArrange'
import { DashboardEditActions, useDashboardEdit } from '@winterop-com/sokkel-ui/dashboard/DashboardEdit'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { insertItem } from '@winterop-com/sokkel-ui/lib/reorder'
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
import { Copy, LayoutDashboard, MoreHorizontal, Pencil, PencilLine, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { saveWidgets } from './actions'
import { ConfigureDialog } from './Configure'
import { PALETTE, sameWidget, widgetId, type Dashboard, type Prefs, type Widget } from './model'
import { KINDS, PALETTE_ICONS, titleOf, WidgetView } from './widgets'

const PALETTE_WIDGETS: DashboardWidget[] = PALETTE.map((entry) => {
    const Icon = PALETTE_ICONS[entry.id] ?? KINDS[entry.kind].icon
    return { id: entry.id, label: entry.label, span: entry.span, icon: <Icon aria-hidden /> }
})

/**
 * A dashboard of widgets, live. Edit puts it in edit mode: each widget drags by its grip (or moves
 * with the arrows), takes a width, opens its options or comes off, and widgets are dragged in from
 * the palette. Done keeps the edits through the backend, Cancel throws them away, and Reset puts
 * the dashboard as it started in the edits.
 */
export function DashboardPage({
    board,
    prefs,
    onRename,
    onDuplicate,
    onDelete,
}: {
    board: Dashboard
    prefs: Prefs
    onRename: () => void
    onDuplicate: () => void
    onDelete: () => void
}) {
    const edit = useDashboardEdit<Widget>({
        layout: board.widgets,
        defaultLayout: board.base,
        onSave: (widgets) => saveWidgets(board, widgets),
        same: sameWidget,
    })
    const [configuring, setConfiguring] = useState<Widget | null>(null)
    const [leaving, setLeaving] = useState(false)
    const guarded = {
        ...edit,
        cancel: () => {
            if (edit.changed && prefs.confirmCancel) setLeaving(true)
            else edit.cancel()
        },
    }
    const add = (entryId: string, index: number, span?: Widget['span']) => {
        const entry = PALETTE.find((one) => one.id === entryId)
        if (entry === undefined) return
        const made: Widget = { id: widgetId(entry.kind), kind: entry.kind, span: span ?? entry.span, options: { ...entry.options } }
        edit.change(insertItem(edit.layout, made, index))
        if (entry.kind === 'note') setConfiguring(made)
    }

    const more = (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <IconButton label="More" variant="outline" size="icon-sm">
                        <MoreHorizontal aria-hidden />
                    </IconButton>
                }
            />
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={onRename}>
                    <PencilLine aria-hidden />
                    Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                    <Copy aria-hidden />
                    Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                    <Trash2 aria-hidden />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )

    return (
        <Stack gap="page">
            <PageHeader
                title={board.name}
                description={
                    edit.editing
                        ? 'Drag a widget by its grip to move it, set its width, configure or remove it, and drag one in from the palette to add it.'
                        : `${String(board.widgets.length)} ${board.widgets.length === 1 ? 'widget' : 'widgets'}, ${prefs.live ? 'live' : 'paused'}.`
                }
                actions={<DashboardEditActions edit={guarded}>{more}</DashboardEditActions>}
            />
            {edit.layout.length === 0 && !edit.editing ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <LayoutDashboard aria-hidden />
                        </EmptyMedia>
                        <EmptyTitle>Nothing on this dashboard</EmptyTitle>
                        <EmptyDescription>Edit it and drag in the widgets to show.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button size="sm" onClick={edit.edit}>
                            <Pencil aria-hidden />
                            Edit
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <DashboardArrange<Widget>
                    layout={edit.layout}
                    onLayoutChange={edit.change}
                    label={titleOf}
                    renderPanel={(widget) => (
                        <WidgetView
                            widget={widget}
                            context={{ prefs, onConfigure: edit.editing ? () => setConfiguring(widget) : undefined }}
                        />
                    )}
                    arranging={edit.editing}
                    palette={PALETTE_WIDGETS}
                    onAdd={(widget, index) => add(widget.id, index, widget.span)}
                    onConfigure={setConfiguring}
                />
            )}
            <ConfigureDialog
                widget={configuring}
                onClose={() => setConfiguring(null)}
                onApply={(changed) => {
                    edit.change(edit.layout.map((widget) => (widget.id === changed.id ? changed : widget)))
                    setConfiguring(null)
                }}
            />
            <ConfirmDialog
                open={leaving}
                onOpenChange={setLeaving}
                question="Throw the edits away?"
                detail={`${board.name} goes back to how it was before Edit.`}
                confirm={{
                    label: 'Throw away',
                    destructive: true,
                    onConfirm: () => {
                        setLeaving(false)
                        edit.cancel()
                    },
                }}
            />
        </Stack>
    )
}
