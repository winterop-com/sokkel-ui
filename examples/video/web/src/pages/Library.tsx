import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'

import { go } from 'tidevann-shared/router'
import { videoById, type Video } from '../catalog'
import { downloads, playlists, ratings, useRows, watched, WATCH_LATER } from '../data'
import { plural } from '../format'
import { VideoCard } from '../parts'
import { PlaylistCard } from './Playlists'

/** How many cards each part of the library shows before See all. */
const SHOWN = 4

const videosOf = (ids: readonly string[]) => ids.map((id) => videoById(id)).filter((one): one is Video => one !== undefined)

/** Everything the viewer keeps on one page: the latest of their history, Watch later, their playlists, likes and downloads, each with See all. */
export function Library() {
    const history = useRows(watched)
    const lists = useRows(playlists)
    const liked = useRows(ratings)
    const kept = useRows(downloads)
    const recent = videosOf([...history.rows].sort((left, right) => right.at - left.at).map((one) => one.id))
    const later = videosOf(lists.rows.find((one) => one.id === WATCH_LATER)?.videos ?? [])
    const likes = videosOf(liked.rows.filter((one) => one.rating === 'like').map((one) => one.id))
    const own = lists.rows.filter((one) => one.id !== WATCH_LATER)
    const offline = videosOf(kept.rows.map((one) => one.id))
    const all = (path: string) => (
        <Button size="sm" variant="ghost" onClick={() => go(path)}>
            See all
        </Button>
    )
    const grid = (videos: readonly Video[], label: string, empty: string) =>
        videos.length === 0 ? (
            <p className="text-help text-muted-foreground">{empty}</p>
        ) : (
            <MediaGrid shape="wide" label={label}>
                {videos.slice(0, SHOWN).map((video) => (
                    <VideoCard key={video.id} video={video} />
                ))}
            </MediaGrid>
        )
    return (
        <Stack gap="xl">
            <PageHeader title="Library" />
            <PageState loading={!history.ready || !lists.ready}>
                <Stack gap="xl">
                    <Section title="History" meta={plural(recent.length, 'video')} actions={all('/history')}>
                        {grid(recent, 'History', 'Videos you watch land here.')}
                    </Section>
                    <Section title="Watch later" meta={plural(later.length, 'video')} actions={all('/later')}>
                        {grid(later, 'Watch later', 'Save a video for later from its menu.')}
                    </Section>
                    <Section title="Playlists" meta={plural(own.length, 'playlist')} actions={all('/playlists')}>
                        {own.length === 0 ? (
                            <p className="text-help text-muted-foreground">Make a playlist from Save on any video.</p>
                        ) : (
                            <MediaGrid shape="wide" label="Playlists">
                                {own.slice(0, SHOWN).map((list) => (
                                    <PlaylistCard key={list.id} list={list} />
                                ))}
                            </MediaGrid>
                        )}
                    </Section>
                    <Section title="Liked videos" meta={plural(likes.length, 'video')} actions={all('/liked')}>
                        {grid(likes, 'Liked videos', 'Videos you like land here.')}
                    </Section>
                    <Section title="Downloads" meta={plural(offline.length, 'video')} actions={all('/downloads')}>
                        {grid(offline, 'Downloads', 'Download a video from its page to keep it on this device.')}
                    </Section>
                </Stack>
            </PageState>
        </Stack>
    )
}
