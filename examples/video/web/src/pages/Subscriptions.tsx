import { ChipBar } from '@winterop-com/sokkel-ui/ChipBar'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { ChannelRow } from '@winterop-com/sokkel-ui-media/ChannelRow'
import { MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { CHANNELS, VIDEOS, channelById, videosOf, type Channel } from '../catalog'
import { follows, setFollowing, useRows } from '../data'
import { plural } from '../format'
import { VideoCard } from '../parts'

function follow(channel: Channel, on: boolean) {
    void setFollowing(channel.id, on)
    toast.add({ title: on ? `Following ${channel.name}` : `Stopped following ${channel.name}` })
}

/** Every channel, with Follow beside each, for the viewer to choose what lands in Subscriptions. */
function Manage({ open, onOpenChange, following }: { open: boolean; onOpenChange: (open: boolean) => void; following: Set<string> }) {
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title="Channels"
            description="Follow a channel and its videos land in Subscriptions."
            width="md"
            confirm={{ label: 'Done', onConfirm: () => onOpenChange(false) }}
        >
            <Stack gap="md">
                {CHANNELS.map((channel) => (
                    <ChannelRow
                        key={channel.id}
                        name={channel.name}
                        href={`#/channel/${channel.id}`}
                        color={channel.color}
                        detail={`${plural(videosOf(channel).length, 'video')}`}
                        following={following.has(channel.id)}
                        onFollowingChange={(on) => follow(channel, on)}
                    />
                ))}
            </Stack>
        </DialogShell>
    )
}

/** The latest from the channels the viewer follows, newest first, narrowed to one channel by its chip. */
export function Subscriptions() {
    const { rows, ready } = useRows(follows)
    const [chosen, setChosen] = useState('all')
    const [managing, setManaging] = useState(false)
    const following = new Set(rows.map((one) => one.id))
    const channels = rows.map((one) => channelById(one.id)).filter((one): one is Channel => one !== undefined)
    const shown = VIDEOS.filter((video) => following.has(video.channel) && (chosen === 'all' || video.channel === chosen)).sort(
        (left, right) => left.days - right.days,
    )
    const week = shown.filter((video) => video.days < 7)
    const earlier = shown.filter((video) => video.days >= 7)
    const grid = (videos: typeof shown, label: string) => (
        <MediaGrid shape="wide" label={label}>
            {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
            ))}
        </MediaGrid>
    )
    return (
        <Stack gap="lg">
            <PageHeader
                title="Subscriptions"
                count={plural(channels.length, 'channel')}
                actions={
                    <Button size="sm" variant="outline" onClick={() => setManaging(true)}>
                        Manage
                    </Button>
                }
            />
            <PageState loading={!ready}>
                {channels.length === 0 ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>You follow no channels yet</EmptyTitle>
                            <EmptyDescription>Follow a channel and its newest videos land here.</EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button size="sm" onClick={() => setManaging(true)}>
                                Find channels
                            </Button>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <Stack gap="lg">
                        <ChipBar
                            label="Channels"
                            value={following.has(chosen) ? chosen : 'all'}
                            onValueChange={setChosen}
                            chips={[
                                { value: 'all', label: 'All' },
                                ...channels.map((channel) => ({ value: channel.id, label: channel.name })),
                            ]}
                        />
                        {week.length > 0 && <Section title="This week">{grid(week, 'This week')}</Section>}
                        {earlier.length > 0 && <Section title="Earlier">{grid(earlier, 'Earlier')}</Section>}
                        {shown.length === 0 && (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyTitle>No videos yet</EmptyTitle>
                                    <EmptyDescription>This channel has put up nothing yet.</EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <Button size="sm" variant="outline" onClick={() => go(`/channel/${chosen}`)}>
                                        Open the channel
                                    </Button>
                                </EmptyContent>
                            </Empty>
                        )}
                    </Stack>
                )}
            </PageState>
            <Manage open={managing} onOpenChange={setManaging} following={following} />
        </Stack>
    )
}
