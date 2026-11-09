import { CopyButton } from '@winterop-com/sokkel-ui/CopyButton'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { AspectRatio } from '@winterop-com/sokkel-ui/primitives/aspect-ratio'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Tabs, TabsList, TabsTrigger } from '@winterop-com/sokkel-ui/primitives/tabs'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { ChannelRow } from '@winterop-com/sokkel-ui-media/ChannelRow'
import { MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { Play } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { channelById, videosOf, type Video } from '../catalog'
import { follows, setFollowing, useById, watched } from '../data'
import { daysAgo, plural, short } from '../format'
import { VideoCard, viewCount, watchHref } from '../parts'
import { NotFound } from './NotFound'

type Sort = 'latest' | 'popular' | 'oldest'

/** A channel's own page: its banner and name with Follow, then its videos, sorted, or what it is about. */
export function Channel({ id, tab }: { id: string; tab: 'videos' | 'about' }) {
    const channel = channelById(id)
    const followed = useById(follows)
    const history = useById(watched)
    const [sort, setSort] = useState<Sort>('latest')
    if (channel === undefined) return <NotFound what="channel" />
    const following = followed.has(channel.id)
    const videos = videosOf(channel)
    const total = videos.reduce((sum, video) => sum + viewCount(video, history.get(video.id)), 0)
    const order = (left: Video, right: Video) =>
        sort === 'latest' ? left.days - right.days : sort === 'oldest' ? right.days - left.days : right.views - left.views
    const sorted = [...videos].sort(order)
    const link = `${window.location.href.split('#')[0] ?? ''}#/channel/${channel.id}`
    const newest = [...videos].sort((left, right) => left.days - right.days)[0]
    return (
        <Stack gap="lg">
            <AspectRatio ratio={6} className="overflow-hidden rounded-surface">
                <Artwork seed={`${channel.id}-banner`} wide />
            </AspectRatio>
            <ChannelRow
                size="lg"
                name={channel.name}
                color={channel.color}
                detail={`${channel.handle}, ${short(channel.followers + (following ? 1 : 0))} followers, ${plural(videos.length, 'video')}`}
                following={following}
                onFollowingChange={(on) => {
                    void setFollowing(channel.id, on)
                    toast.add({ title: on ? `Following ${channel.name}` : `Stopped following ${channel.name}` })
                }}
            />
            <Tabs value={tab} onValueChange={(value) => go(value === 'about' ? `/channel/${channel.id}/about` : `/channel/${channel.id}`)}>
                <TabsList variant="line">
                    <TabsTrigger value="videos">Videos</TabsTrigger>
                    <TabsTrigger value="about">About</TabsTrigger>
                </TabsList>
            </Tabs>
            {tab === 'videos' ? (
                <Stack gap="lg">
                    <Toolbar
                        end={
                            newest !== undefined && (
                                <Button size="sm" variant="outline" onClick={() => go(watchHref(sorted[0] ?? newest).slice(1))}>
                                    <Play aria-hidden />
                                    Play
                                </Button>
                            )
                        }
                    >
                        <Segmented
                            label="Sort by"
                            value={sort}
                            onValueChange={setSort}
                            options={[
                                { value: 'latest', label: 'Latest' },
                                { value: 'popular', label: 'Popular' },
                                { value: 'oldest', label: 'Oldest' },
                            ]}
                        />
                    </Toolbar>
                    <MediaGrid shape="wide" label={`Videos of ${channel.name}`}>
                        {sorted.map((video) => (
                            <VideoCard key={video.id} video={video} bare />
                        ))}
                    </MediaGrid>
                </Stack>
            ) : (
                <Stack gap="lg">
                    <p className="max-w-prose text-body">{channel.about}</p>
                    <DescriptionList
                        items={[
                            { term: 'Where it films', value: channel.region },
                            { term: 'Started', value: daysAgo(channel.started) },
                            { term: 'Videos', value: String(videos.length) },
                            { term: 'Views', value: `${short(total)} in all` },
                            { term: 'Latest video', value: newest === undefined ? 'None yet' : `${newest.title}, ${daysAgo(newest.days)}` },
                            {
                                term: 'Link',
                                value: (
                                    <Row gap="xs">
                                        <span className="truncate">{channel.handle}</span>
                                        <CopyButton value={link} size="icon-xs" />
                                    </Row>
                                ),
                            },
                        ]}
                    />
                </Stack>
            )}
        </Stack>
    )
}
