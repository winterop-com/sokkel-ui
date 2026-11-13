import { DataTable, type DataAction, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Copy, ExternalLink, PencilLine, Plus, Trash2 } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import type { Dashboard } from './model'
import { KINDS } from './widgets'

const dated = (at: number) => new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const COLUMNS: DataColumn<Dashboard>[] = [
    {
        id: 'name',
        header: 'Name',
        width: 'minmax(10rem,1fr)',
        cell: (board) => <span className="font-medium">{board.name}</span>,
        stack: 'primary',
    },
    {
        id: 'kinds',
        header: 'Holds',
        width: 'minmax(12rem,2fr)',
        cell: (board) => (
            <span className="truncate text-muted-foreground">
                {[...new Set(board.widgets.map((widget) => KINDS[widget.kind].label.toLowerCase()))].join(', ') || 'nothing yet'}
            </span>
        ),
        stack: 'line',
    },
    {
        id: 'widgets',
        header: 'Widgets',
        width: '6rem',
        align: 'end',
        cell: (board) => <span className="tabular-nums">{board.widgets.length}</span>,
        stack: 'secondary',
    },
    {
        id: 'created',
        header: 'Made',
        width: '8rem',
        align: 'end',
        cell: (board) => <span className="text-muted-foreground tabular-nums">{dated(board.created)}</span>,
    },
]

/** Every dashboard, in the order the rail lists them, dragged into another order here as in the rail; each opened, renamed, duplicated or deleted. */
export function DashboardsPage({
    boards,
    onReorder,
    onCreate,
    onRename,
    onDuplicate,
    onDelete,
}: {
    boards: readonly Dashboard[]
    onReorder: (order: string[]) => Promise<unknown>
    onCreate: () => void
    onRename: (board: Dashboard) => void
    onDuplicate: (board: Dashboard) => void
    onDelete: (board: Dashboard) => void
}) {
    const reorder = (from: number, to: number) => void onReorder(moveItem(boards, from, to).map((board) => board.id))
    const actions = (board: Dashboard): DataAction[] => [
        { id: 'open', label: 'Open', icon: <ExternalLink />, onSelect: () => go(`/d/${board.id}`) },
        { id: 'rename', label: 'Rename', icon: <PencilLine />, onSelect: () => onRename(board) },
        { id: 'duplicate', label: 'Duplicate', icon: <Copy />, onSelect: () => onDuplicate(board) },
        { id: 'line', separator: true },
        { id: 'delete', label: 'Delete', icon: <Trash2 />, destructive: true, onSelect: () => onDelete(board) },
    ]
    return (
        <>
            <PageHeader
                title="Dashboards"
                count={`${String(boards.length)} ${boards.length === 1 ? 'dashboard' : 'dashboards'}`}
                description="Drag a dashboard by its grip, here or in the rail, to change the order the rail lists them in."
                actions={
                    <Button size="sm" onClick={onCreate}>
                        <Plus aria-hidden />
                        New
                    </Button>
                }
            />
            <DataTable
                className="min-h-0 flex-1"
                variant="list"
                minWidth="auto"
                columns={COLUMNS}
                rows={boards}
                rowKey={(board) => board.id}
                rowLabel={(board) => board.name}
                onReorder={reorder}
                onOpen={(board) => go(`/d/${board.id}`)}
                rowActions={actions}
            />
        </>
    )
}
