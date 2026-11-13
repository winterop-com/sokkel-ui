import { type DataAction, type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { dashboards } from './data'
import type { Dashboard } from './model'
import { go } from './place'

const COLUMNS: DataColumn<Dashboard>[] = [
    {
        id: 'title',
        header: 'Title',
        width: 'minmax(12rem,1fr)',
        cell: (board) => <span className="font-medium">{board.title}</span>,
        sortValue: (board) => board.title,
        stack: 'primary',
    },
    {
        id: 'description',
        header: 'Description',
        width: 'minmax(16rem,2fr)',
        cell: (board) => <span className="text-muted-foreground">{board.description}</span>,
        stack: 'line',
    },
    {
        id: 'panels',
        header: 'Panels',
        width: '6rem',
        align: 'end',
        cell: (board) => <span className="tabular-nums">{board.panels.length}</span>,
        sortValue: (board) => board.panels.length,
        stack: 'secondary',
    },
]

/** Every dashboard, to open one, make one, put them in the order the rail lists them, or delete one. */
export function DashboardsPage({
    dashboards: all,
    kept,
    onCreate,
    onReorder,
}: {
    dashboards: readonly Dashboard[]
    kept: URLSearchParams
    onCreate: () => void
    /** Keeps the dashboards in a new order, by id. */
    onReorder: (order: string[]) => Promise<unknown>
}) {
    const [deleting, setDeleting] = useState<Dashboard | null>(null)
    const reorder = (from: number, to: number) => void onReorder(moveItem(all, from, to).map((board) => board.id))
    const open = (board: Dashboard) => go(`/d/${board.id}`, kept)
    const actions = (board: Dashboard): DataAction[] => [
        { id: 'open', label: 'Open', icon: <ExternalLink />, onSelect: () => open(board) },
        { id: 'line', separator: true },
        { id: 'delete', label: 'Delete', icon: <Trash2 />, destructive: true, onSelect: () => setDeleting(board) },
    ]
    return (
        <Page className="h-full">
            <PageHeader
                title="Dashboards"
                count={`${String(all.length)} ${all.length === 1 ? 'dashboard' : 'dashboards'}`}
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
                rows={all}
                rowLabel={(board) => board.title}
                onReorder={reorder}
                rowKey={(board) => board.id}
                onOpen={open}
                rowActions={actions}
            />
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(next) => !next && setDeleting(null)}
                question={`Delete ${deleting?.title ?? 'the dashboard'}?`}
                detail={deleting === null ? undefined : `Its ${String(deleting.panels.length)} panels go with it.`}
                confirm={{
                    label: 'Delete',
                    destructive: true,
                    onConfirm: () => {
                        if (deleting === null) return
                        const gone = deleting
                        setDeleting(null)
                        void dashboards.remove(gone.id).then(() => toast.success(`${gone.title} deleted`))
                    },
                }}
            />
        </Page>
    )
}
