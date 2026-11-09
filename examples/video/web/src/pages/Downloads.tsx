import { type DataAction, type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Download as Save, Play, Trash2 } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { channelOf, videoById, type Video } from '../catalog'
import { downloadedFile, letDownloadGo, renditionOf } from '../clips'
import { downloads, useRows, type Download } from '../data'
import { bytesOf, plural } from '../format'
import { Poster, watchHref } from '../parts'

interface Kept {
    download: Download
    video: Video
}

/** Writes a downloaded clip to a file of the viewer's, named by its title. */
async function saveFile({ download, video }: Kept) {
    const blob = await downloadedFile(video, renditionOf(download.rendition))
    if (blob === undefined) {
        toast.add({ type: 'error', title: 'The file is gone', description: 'Remove the download and download it again.' })
        return
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${video.title}.webm`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function remove({ video }: Kept) {
    void letDownloadGo(video)
        .then(() => downloads.remove(video.id))
        .then(() => toast.add({ title: 'Download removed' }))
}

const COLUMNS: DataColumn<Kept>[] = [
    {
        id: 'video',
        header: 'Video',
        width: 'minmax(16rem,1fr)',
        stack: 'lead',
        cell: ({ video }) => (
            <Row gap="sm">
                <span className="w-20 shrink-0 overflow-hidden rounded-mini">
                    <Poster video={video} />
                </span>
                <Stack gap="none">
                    <span className="truncate font-medium">{video.title}</span>
                    <span className="truncate text-help text-muted-foreground">{channelOf(video).name}</span>
                </Stack>
            </Row>
        ),
        sortValue: ({ video }) => video.title,
    },
    {
        id: 'length',
        header: 'Length',
        width: '6rem',
        cell: ({ video }) => formatTime(video.duration),
        sortValue: ({ video }) => video.duration,
    },
    {
        id: 'quality',
        header: 'Quality',
        width: '6rem',
        cell: ({ download }) => renditionOf(download.rendition).label,
        sortValue: ({ download }) => Number(download.rendition),
    },
    {
        id: 'size',
        header: 'Size',
        width: '6rem',
        cell: ({ download }) => bytesOf(download.bytes),
        sortValue: ({ download }) => download.bytes,
    },
    {
        id: 'at',
        header: 'Downloaded',
        width: '9rem',
        cell: ({ download }) => <RelativeTime date={new Date(download.at)} />,
        sortValue: ({ download }) => download.at,
    },
]

/** The videos kept on this device: play one, save its file, or remove it. */
export function Downloads() {
    const { rows, ready } = useRows(downloads)
    const kept = rows.map((download) => ({ download, video: videoById(download.id) })).filter((one): one is Kept => one.video !== undefined)
    const actions = (one: Kept): DataAction[] => [
        { id: 'play', label: 'Play', icon: <Play />, onSelect: () => go(watchHref(one.video).slice(1)) },
        { id: 'save', label: 'Save the file', icon: <Save />, onSelect: () => void saveFile(one) },
        { id: 'line', separator: true },
        { id: 'remove', label: 'Remove the download', icon: <Trash2 />, destructive: true, onSelect: () => remove(one) },
    ]
    return (
        <Stack gap="lg" className="h-full">
            <PageHeader
                title="Downloads"
                count={`${plural(kept.length, 'video')}, ${bytesOf(kept.reduce((sum, one) => sum + one.download.bytes, 0))}`}
            />
            <PageState loading={!ready}>
                <DataTable
                    className="min-h-0 flex-1"
                    columns={COLUMNS}
                    rows={kept}
                    rowKey={(one) => one.video.id}
                    rowActions={actions}
                    onOpen={(one) => go(watchHref(one.video).slice(1))}
                    defaultSort={{ column: 'at', direction: 'desc' }}
                    stackLayout="compact"
                    empty={
                        <Empty>
                            <EmptyHeader>
                                <EmptyTitle>No downloads</EmptyTitle>
                                <EmptyDescription>
                                    Download a video from its page, and it is kept on this device to watch without the site.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    }
                />
            </PageState>
        </Stack>
    )
}
