import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { PencilLine, Plus, Presentation, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { go } from 'tidevann-shared/router'

import { boards as boardStore } from '../backend'
import { BoardDialog } from '../dialogs'
import { type Board, counted } from '../model'

/** Deletes a board after asking; its charts stay saved. */
export function useDeleteBoard() {
    const [deleting, setDeleting] = useState<Board | null>(null)
    const dialog = (
        <ConfirmDialog
            open={deleting !== null}
            onOpenChange={(open) => !open && setDeleting(null)}
            question={`Delete ${deleting?.name ?? 'the board'}?`}
            detail="The board goes; the charts on it stay saved."
            confirm={{
                label: 'Delete',
                destructive: true,
                onConfirm: () => {
                    if (deleting === null) return
                    const gone = deleting
                    setDeleting(null)
                    void boardStore.remove(gone.id).then(() => {
                        toast.success(`${gone.name} deleted`)
                        go('/boards')
                    })
                },
            }}
        />
    )
    return { ask: setDeleting, dialog }
}

/** Every board, with how many charts it holds; one opens, or is presented full screen. */
export function BoardsPage({ boards, loading, onCreate }: { boards: readonly Board[]; loading: boolean; onCreate: () => void }) {
    const [editing, setEditing] = useState<Board | undefined>(undefined)
    const remove = useDeleteBoard()
    const columns: DataColumn<Board>[] = [
        {
            id: 'name',
            header: 'Name',
            width: 'minmax(12rem,1fr)',
            cell: (board) => board.name,
            sortValue: (board) => board.name.toLowerCase(),
            stack: 'primary',
        },
        {
            id: 'description',
            header: 'Description',
            width: 'minmax(14rem,2fr)',
            cell: (board) => <span className="truncate text-muted-foreground">{board.description}</span>,
        },
        {
            id: 'charts',
            header: 'Charts',
            width: '6rem',
            align: 'end',
            cell: (board) => <span className="tabular-nums">{board.items.length}</span>,
            sortValue: (board) => board.items.length,
            stack: 'secondary',
        },
        {
            id: 'updated',
            header: 'Changed',
            width: '8rem',
            cell: (board) => <RelativeTime date={board.updatedAt} />,
            sortValue: (board) => board.updatedAt,
            stack: 'secondary',
        },
    ]
    return (
        <Page className="h-full">
            <PageHeader
                title="Boards"
                count={counted(boards.length, 'board')}
                description="Saved charts arranged on a page, filtered together and presented full screen."
                actions={
                    <Button size="sm" onClick={onCreate}>
                        <Plus aria-hidden />
                        New
                    </Button>
                }
            />
            <DataTable
                className="min-h-0 flex-1"
                columns={columns}
                rows={boards}
                rowKey={(board) => board.id}
                loading={loading}
                defaultSort={{ column: 'name', direction: 'asc' }}
                onOpen={(board) => go(`/boards/${board.id}`)}
                chevron
                rowActions={(board) => [
                    {
                        id: 'present',
                        label: 'Present',
                        icon: <Presentation aria-hidden />,
                        inline: true,
                        onSelect: () => go(`/boards/${board.id}/present`),
                    },
                    { id: 'edit', label: 'Edit details', icon: <PencilLine aria-hidden />, onSelect: () => setEditing(board) },
                    { id: 'sep', separator: true },
                    { id: 'delete', label: 'Delete', icon: <Trash2 aria-hidden />, destructive: true, onSelect: () => remove.ask(board) },
                ]}
                words={{ rows: (count: number) => counted(count, 'board') }}
                minWidth="40rem"
                empty="No boards yet. Make one and add saved charts to it."
            />
            <BoardDialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)} editing={editing} />
            {remove.dialog}
        </Page>
    )
}
