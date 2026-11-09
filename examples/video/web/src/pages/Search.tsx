import { ChipBar } from '@winterop-com/sokkel-ui/ChipBar'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { ChannelRow } from '@winterop-com/sokkel-ui-media/ChannelRow'
import { useEffect, useState } from 'react'

import { go } from 'tidevann-shared/router'
import { CHANNELS, VIDEOS, videosOf, type Channel, type Video } from '../catalog'
import { follows, setFollowing, useById } from '../data'
import { plural, short } from '../format'
import { VideoCard } from '../parts'
import { videoText } from '../Site'

type Kind = 'all' | 'videos' | 'channels'
type Sort = 'relevance' | 'date' | 'views'

const wordsOf = (query: string) =>
    query
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word !== '')

/** How well a text answers the words: each word found counts, more in the title. */
function score(title: string, rest: string, words: readonly string[]): number {
    const head = title.toLowerCase()
    const body = rest.toLowerCase()
    let total = 0
    for (const word of words) {
        if (head.includes(word)) total += 3
        else if (body.includes(word)) total += 1
        else return 0
    }
    return total
}

/** What a search finds: channels with Follow, and videos, narrowed to one kind and sorted by relevance, date or views. */
export function Search({ query }: { query: string }) {
    const [text, setText] = useState(query)
    const [kind, setKind] = useState<Kind>('all')
    const [sort, setSort] = useState<Sort>('relevance')
    const followed = useById(follows)
    useEffect(() => setText(query), [query])
    const words = wordsOf(query)
    const videos = VIDEOS.map((video) => ({ video, score: score(video.title, videoText(video), words) }))
        .filter((one) => one.score > 0)
        .sort((left, right) =>
            sort === 'date'
                ? left.video.days - right.video.days
                : sort === 'views'
                  ? right.video.views - left.video.views
                  : right.score - left.score,
        )
        .map((one) => one.video)
    const channels = CHANNELS.filter((channel) => score(channel.name, `${channel.handle} ${channel.about} ${channel.region}`, words) > 0)
    const follow = (channel: Channel, on: boolean) => {
        void setFollowing(channel.id, on)
        toast.add({ title: on ? `Following ${channel.name}` : `Stopped following ${channel.name}` })
    }
    const submit = () => {
        if (text.trim() !== '') go(`/search/${encodeURIComponent(text.trim())}`)
    }
    const showChannels = kind !== 'videos' && channels.length > 0
    const showVideos = kind !== 'channels' && videos.length > 0
    return (
        <Stack gap="lg">
            <PageHeader
                title={query === '' ? 'Search' : `Results for "${query}"`}
                count={plural(videos.length + channels.length, 'result')}
            />
            <Toolbar
                search={
                    <SearchField
                        value={text}
                        onChange={setText}
                        placeholder="Search videos and channels"
                        inputProps={{
                            onKeyDown: (event) => {
                                if (event.key === 'Enter') submit()
                            },
                        }}
                    />
                }
                end={
                    <Segmented
                        label="Sort by"
                        size="sm"
                        value={sort}
                        onValueChange={setSort}
                        options={[
                            { value: 'relevance', label: 'Relevance' },
                            { value: 'date', label: 'Upload date' },
                            { value: 'views', label: 'Views' },
                        ]}
                    />
                }
            />
            <ChipBar
                label="Show"
                value={kind}
                onValueChange={setKind}
                chips={[
                    { value: 'all', label: 'All' },
                    { value: 'videos', label: `Videos ${String(videos.length)}` },
                    { value: 'channels', label: `Channels ${String(channels.length)}` },
                ]}
            />
            {!showChannels && !showVideos ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>{query === '' ? 'Search the site' : 'Nothing found'}</EmptyTitle>
                        <EmptyDescription>
                            {query === ''
                                ? 'Type a few words above and press Enter.'
                                : `No ${kind === 'all' ? 'videos or channels' : kind} match "${query}". Try fewer or other words.`}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Stack gap="xl">
                    {showChannels && (
                        <Section title="Channels">
                            <Stack gap="md">
                                {channels.map((channel) => (
                                    <ChannelRow
                                        key={channel.id}
                                        name={channel.name}
                                        href={`#/channel/${channel.id}`}
                                        color={channel.color}
                                        detail={`${channel.handle}, ${short(channel.followers)} followers, ${plural(videosOf(channel).length, 'video')}`}
                                        following={followed.has(channel.id)}
                                        onFollowingChange={(on) => follow(channel, on)}
                                    />
                                ))}
                            </Stack>
                        </Section>
                    )}
                    {showVideos && (
                        <Section title="Videos">
                            <Stack gap="md">
                                {videos.map((video: Video) => (
                                    <VideoCard key={video.id} video={video} layout="row" />
                                ))}
                            </Stack>
                        </Section>
                    )}
                </Stack>
            )}
        </Stack>
    )
}
