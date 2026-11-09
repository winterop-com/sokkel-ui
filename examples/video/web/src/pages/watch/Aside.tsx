import { ChipBar } from '@winterop-com/sokkel-ui/ChipBar'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { Toolbar, ToolbarTitle } from '@winterop-com/sokkel-ui/Toolbar'
import { useState } from 'react'

import { TOPICS, VIDEOS, channelOf, seedOf, videoById, type Video } from '../../catalog'
import { setPrefs, usePrefs, type Playlist, type Watched } from '../../data'
import { VideoCard } from '../../parts'

type Filter = 'all' | 'channel' | 'topic' | 'unwatched'

/** What plays after `video`: its channel's first, then its topic's, then the rest, the same order every time. */
export function upNextFor(video: Video): Video[] {
    const score = (one: Video) => (one.channel === video.channel ? 2 : 0) + (one.topic === video.topic ? 1 : 0)
    return VIDEOS.filter((one) => one.id !== video.id).sort(
        (left, right) => score(right) - score(left) || (seedOf(left.id + video.id) % 997) - (seedOf(right.id + video.id) % 997),
    )
}

/** The next video: the playlist's next while playing a playlist, else the first of what plays next. */
export function nextOf(video: Video, list: Playlist | undefined, shown: readonly Video[]): Video | undefined {
    if (list !== undefined) {
        const at = list.videos.indexOf(video.id)
        return at < 0 ? undefined : videoById(list.videos[at + 1])
    }
    return shown[0]
}

/** What plays next beside the player, with Autoplay and chips that narrow it, or the playlist being played. */
export function Aside({ video, list, history }: { video: Video; list: Playlist | undefined; history: Map<string, Watched> }) {
    const prefs = usePrefs()
    const [filter, setFilter] = useState<Filter>('all')
    const channel = channelOf(video)
    const all = upNextFor(video)
    const shown = all.filter((one) =>
        filter === 'channel'
            ? one.channel === video.channel
            : filter === 'topic'
              ? one.topic === video.topic
              : filter === 'unwatched'
                ? history.get(one.id)?.finished !== true
                : true,
    )
    const autoplay = (
        <SwitchField
            id="autoplay"
            label="Autoplay"
            explain="Plays what is next when this video ends"
            checked={prefs.autoplay}
            onCheckedChange={(autoplay) => setPrefs({ autoplay })}
        />
    )
    if (list !== undefined) {
        const videos = list.videos.map((id) => videoById(id)).filter((one): one is Video => one !== undefined)
        const at = videos.findIndex((one) => one.id === video.id)
        return (
            <Stack gap="md">
                <Stack gap="2xs">
                    <Toolbar end={autoplay}>
                        <ToolbarTitle as="h2">{list.name}</ToolbarTitle>
                    </Toolbar>
                    <MetaLine items={['Playlist', `${String(at + 1)} of ${String(videos.length)}`]} />
                </Stack>
                <Stack gap="md">
                    {videos.map((one) => (
                        <VideoCard key={one.id} video={one} layout="row" list={list.id} playing={one.id === video.id} />
                    ))}
                </Stack>
            </Stack>
        )
    }
    return (
        <Stack gap="md">
            <Toolbar end={autoplay}>
                <ToolbarTitle as="h2">Up next</ToolbarTitle>
            </Toolbar>
            <ChipBar
                label="Narrow what plays next"
                value={filter}
                onValueChange={setFilter}
                chips={[
                    { value: 'all', label: 'All' },
                    { value: 'channel', label: `From ${channel.name}` },
                    { value: 'topic', label: TOPICS[video.topic] },
                    { value: 'unwatched', label: 'Not watched' },
                ]}
            />
            <Stack gap="md">
                {shown.map((one) => (
                    <VideoCard key={one.id} video={one} layout="row" />
                ))}
            </Stack>
        </Stack>
    )
}
