import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { DownloadButton } from '@winterop-com/sokkel-ui/DownloadButton'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { CloudDownload, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { ALBUM_BY_ID, artistName, formatBytes, type Album } from '../catalog'
import { downloads, useRows, type Download } from '../data'
import { download, removeAllDownloads, removeDownload } from '../downloads'
import { Nothing, playAlbum } from '../parts/songs'

interface Line {
    row: Download
    album: Album
}

const COLUMNS: DataColumn<Line>[] = [
    {
        id: 'album',
        header: 'Album',
        width: 'minmax(14rem,1.4fr)',
        stack: 'lead',
        cell: ({ album }) => (
            <Row gap="sm" className="min-w-0">
                <span className="block size-8 shrink-0 overflow-hidden rounded-mini">
                    <Artwork cover={album.cover} />
                </span>
                <span className="truncate">{album.title}</span>
            </Row>
        ),
        sortValue: ({ album }) => album.title,
    },
    {
        id: 'artist',
        header: 'Artist',
        width: 'minmax(8rem,1fr)',
        cell: ({ album }) => artistName(album.artist),
        sortValue: ({ album }) => artistName(album.artist),
        stack: 'secondary',
    },
    {
        id: 'size',
        header: 'Size',
        width: '6rem',
        align: 'end',
        cell: ({ row }) => (row.state === 'kept' ? formatBytes(row.bytes) : '…'),
        sortValue: ({ row }) => row.bytes,
        stack: 'secondary',
    },
    {
        id: 'at',
        header: 'Kept',
        width: '8rem',
        cell: ({ row }) => (row.state === 'kept' ? <RelativeTime date={row.at} /> : 'Now'),
        sortValue: ({ row }) => row.at,
        stack: 'secondary',
    },
    {
        id: 'state',
        header: 'State',
        width: '11rem',
        cell: ({ row, album }) => (
            <DownloadButton
                size="sm"
                variant="ghost"
                state={row.state}
                count={row.done}
                total={row.total}
                keptDetail={`On this device, ${formatBytes(row.bytes)}`}
                onDownload={() => download(album.id)}
                onCancel={() => removeDownload(album.id)}
                onRemove={() => removeDownload(album.id)}
            />
        ),
        stack: 'line',
        stackLabel: false,
    },
]

/** The albums kept on this device and those coming in, with their sizes; each removed from its button, or all at once. */
export function Downloads() {
    const rows = useRows(downloads)
    const [clearing, setClearing] = useState(false)
    const lines = rows.flatMap((row): Line[] => {
        const album = ALBUM_BY_ID.get(row.id)
        return album === undefined ? [] : [{ row, album }]
    })
    const kept = lines.filter((line) => line.row.state === 'kept')
    const running = lines.length - kept.length
    const bytes = kept.reduce((sum, line) => sum + line.row.bytes, 0)
    return (
        <Stack gap="page" className="h-full">
            <PageHeader
                title="Downloads"
                count={`${String(kept.length)} albums, ${formatBytes(bytes)}${running > 0 ? `, ${String(running)} coming in` : ''}`}
                description="Albums kept on this device play without the server."
                actions={
                    lines.length > 0 && (
                        <Button size="sm" variant="outline" onClick={() => setClearing(true)}>
                            <Trash2 aria-hidden />
                            Remove all
                        </Button>
                    )
                }
            />
            {lines.length === 0 ? (
                <Nothing
                    icon={CloudDownload}
                    title="Nothing downloaded yet"
                    action={{ label: 'Browse the albums', onClick: () => go('/albums') }}
                >
                    Open an album and press Download to keep it on this device.
                </Nothing>
            ) : (
                <DataTable
                    columns={COLUMNS}
                    rows={lines}
                    rowKey={(line) => line.album.id}
                    onOpen={(line) => go(`/albums/${line.album.id}`)}
                    rowActions={(line) => [
                        { id: 'play', label: 'Play', icon: <Play />, onSelect: () => playAlbum(line.album) },
                        {
                            id: 'remove',
                            label: line.row.state === 'kept' ? 'Remove' : 'Cancel',
                            icon: <Trash2 />,
                            destructive: true,
                            onSelect: () => removeDownload(line.album.id),
                        },
                    ]}
                />
            )}
            <ConfirmDialog
                open={clearing}
                onOpenChange={setClearing}
                question="Remove every download?"
                detail={`${String(lines.length)} albums, ${formatBytes(bytes)}, leave this device. They stay in the library.`}
                confirm={{
                    label: 'Remove all',
                    destructive: true,
                    onConfirm: () => {
                        removeAllDownloads()
                        setClearing(false)
                    },
                }}
            />
        </Stack>
    )
}
