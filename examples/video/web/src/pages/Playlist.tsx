import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { InlineEdit } from '@winterop-com/sokkel-ui/InlineEdit'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { ArrowDown, ArrowUp, Play, Shuffle, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { seedOf, videoById, type Video } from '../catalog'
import { playlists, useRows, WATCH_LATER } from '../data'
import { plural } from '../format'
import { RemoveEntry, VideoCard, watchHref } from '../parts'
import { NotFound } from './NotFound'

/** One playlist, or Watch later: play it in order or shuffled, rename it, reorder and remove its videos, or delete it. */
export function Playlist({ id }: { id: string }) {
    const { rows, ready } = useRows(playlists)
    const [deleting, setDeleting] = useState(false)
    const list = rows.find((one) => one.id === id)
    if (!ready)
        return (
            <PageState loading>
                <span />
            </PageState>
        )
    if (list === undefined) return <NotFound what="playlist" />
    const later = list.id === WATCH_LATER
    const videos = list.videos.map((one) => videoById(one)).filter((one): one is Video => one !== undefined)
    const save = (patch: Partial<{ name: string; description: string; videos: string[] }>) =>
        playlists.update(list.id, { ...patch, updated: Date.now() })
    const move = (index: number, by: -1 | 1) => {
        const order = [...list.videos]
        const [taken] = order.splice(index, 1)
        if (taken === undefined) return
        order.splice(index + by, 0, taken)
        void save({ videos: order })
    }
    const shuffled = () => {
        const order = [...videos].sort(
            (left, right) => (seedOf(left.id + String(Date.now() >> 10)) % 101) - (seedOf(right.id + String(Date.now() >> 10)) % 101),
        )
        void save({ videos: order.map((one) => one.id) }).then(() => {
            const first = order[0]
            if (first !== undefined) go(watchHref(first, list.id).slice(1))
        })
    }
    return (
        <Stack gap="lg">
            <PageHeader
                title={
                    later ? (
                        list.name
                    ) : (
                        <InlineEdit
                            label="Playlist name"
                            variant="title"
                            value={list.name}
                            validate={(name) => (name.trim() === '' ? 'A playlist needs a name.' : null)}
                            onSave={(name) => save({ name: name.trim() }).then(() => undefined)}
                        />
                    )
                }
                count={plural(videos.length, 'video')}
                description={
                    later ? (
                        'Videos you saved to watch later.'
                    ) : (
                        <InlineEdit
                            label="Description"
                            value={list.description}
                            placeholder="Add a description"
                            onSave={(description) => save({ description: description.trim() }).then(() => undefined)}
                        />
                    )
                }
                actions={
                    <Row gap="sm" wrap>
                        <Button
                            size="sm"
                            disabled={videos.length === 0}
                            onClick={() => videos[0] !== undefined && go(watchHref(videos[0], list.id).slice(1))}
                        >
                            <Play aria-hidden />
                            Play all
                        </Button>
                        <Button size="sm" variant="outline" disabled={videos.length < 2} onClick={shuffled}>
                            <Shuffle aria-hidden />
                            Shuffle
                        </Button>
                        {!later && (
                            <Button size="sm" variant="outline" onClick={() => setDeleting(true)}>
                                <Trash2 aria-hidden />
                                Delete
                            </Button>
                        )}
                    </Row>
                }
            />
            {videos.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>Nothing here yet</EmptyTitle>
                        <EmptyDescription>Save a video to {list.name} from its menu or from Save on its page.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button size="sm" variant="outline" onClick={() => go('/')}>
                            Find videos
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <Stack gap="md">
                    {videos.map((video, index) => (
                        <VideoCard
                            key={video.id}
                            video={video}
                            layout="row"
                            list={list.id}
                            extra={
                                <>
                                    <DropdownMenuItem disabled={index === 0} onClick={() => move(index, -1)}>
                                        <ArrowUp aria-hidden />
                                        Move up
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={index === videos.length - 1} onClick={() => move(index, 1)}>
                                        <ArrowDown aria-hidden />
                                        Move down
                                    </DropdownMenuItem>
                                    <RemoveEntry
                                        label={`Remove from ${list.name}`}
                                        onRemove={() =>
                                            void save({ videos: list.videos.filter((one) => one !== video.id) }).then(() =>
                                                toast.add({ title: `Removed from ${list.name}` }),
                                            )
                                        }
                                    />
                                </>
                            }
                        />
                    ))}
                </Stack>
            )}
            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                question={`Delete ${list.name}?`}
                detail="The playlist goes; the videos in it stay on the site."
                confirm={{
                    label: 'Delete playlist',
                    destructive: true,
                    onConfirm: () => {
                        void playlists.remove(list.id).then(() => toast.add({ title: `${list.name} deleted` }))
                        setDeleting(false)
                        go('/playlists')
                    },
                }}
            />
        </Stack>
    )
}
