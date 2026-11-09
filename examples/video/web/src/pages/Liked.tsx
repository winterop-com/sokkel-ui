import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Play } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { videoById, type Video } from '../catalog'
import { ratings, useRows } from '../data'
import { plural } from '../format'
import { RemoveEntry, VideoCard, watchHref } from '../parts'

/** The videos the viewer liked, the latest liked first, each one a press away from being unliked. */
export function Liked() {
    const { rows, ready } = useRows(ratings)
    const videos = rows
        .filter((one) => one.rating === 'like')
        .map((one) => videoById(one.id))
        .filter((one): one is Video => one !== undefined)
    return (
        <Stack gap="lg">
            <PageHeader
                title="Liked videos"
                count={plural(videos.length, 'video')}
                actions={
                    <Button
                        size="sm"
                        disabled={videos.length === 0}
                        onClick={() => videos[0] !== undefined && go(watchHref(videos[0]).slice(1))}
                    >
                        <Play aria-hidden />
                        Play the latest
                    </Button>
                }
            />
            <PageState loading={!ready}>
                {videos.length === 0 ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>No liked videos</EmptyTitle>
                            <EmptyDescription>Videos you like land here, so they are easy to find again.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <Stack gap="md">
                        {videos.map((video) => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                layout="row"
                                extra={
                                    <RemoveEntry
                                        label="Remove from Liked videos"
                                        onRemove={() =>
                                            void ratings.remove(video.id).then(() => toast.add({ title: 'Removed from Liked videos' }))
                                        }
                                    />
                                }
                            />
                        ))}
                    </Stack>
                )}
            </PageState>
        </Stack>
    )
}
