import type { Meta, StoryObj } from '@storybook/react-vite'
import { RectangleHorizontal } from 'lucide-react'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { TransportButton } from '@winterop-com/sokkel-ui/media/MediaControls'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { VideoPlayer } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { ShowMore } from '@winterop-com/sokkel-ui/ShowMore'
import type { ArtworkCover } from '@winterop-com/sokkel-ui-media/Artwork'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { ChannelRow } from '@winterop-com/sokkel-ui-media/ChannelRow'
import { MediaCard } from '@winterop-com/sokkel-ui-media/MediaCard'
import { WatchLayout } from '@winterop-com/sokkel-ui-media/WatchLayout'
import clip from './fixtures/clip.webm?url'

/**
 * A watch page's layout: the player, what is under it, and what plays next beside them, which moves
 * under the rest on a narrow page.
 */
const meta: Meta = { title: 'Media/Watch layout', parameters: { frame: 'padded' } }
export default meta

const NEXT: { id: string; title: string; channel: string; length: number; cover: ArtworkCover }[] = [
    {
        id: 'n1',
        title: 'How a harbor wakes up',
        channel: 'Harbor Workshop',
        length: 734,
        cover: { motif: 'rings', from: 'teal', to: 'jade' },
    },
    {
        id: 'n2',
        title: 'Crossing the high desert by night train',
        channel: 'Larkspur Rail',
        length: 2214,
        cover: { motif: 'peaks', from: 'coral', to: 'violet' },
    },
    {
        id: 'n3',
        title: 'Northern lights over a still fjord',
        channel: 'Night Watch',
        length: 1458,
        cover: { motif: 'wave', from: 'blue', to: 'teal' },
    },
    {
        id: 'n4',
        title: 'Reading a tide table in one day',
        channel: 'Tidevann Tides',
        length: 921,
        cover: { motif: 'bands', from: 'amber', to: 'coral' },
    },
]

function Watch({ startTheater }: { startTheater: boolean }) {
    const [theater, setTheater] = useState(startTheater)
    const [following, setFollowing] = useState(false)
    return (
        <WatchLayout
            theater={theater}
            player={
                <VideoPlayer
                    src={`${clip}#t=24`}
                    preload="auto"
                    defaultControlsVisible
                    actions={
                        <TransportButton
                            tone="overlay"
                            size="md"
                            label="Theater mode"
                            pressed={theater}
                            onClick={() => setTheater(!theater)}
                        >
                            <RectangleHorizontal aria-hidden />
                        </TransportButton>
                    }
                />
            }
            aside={
                <Stack>
                    {NEXT.map((video) => (
                        <MediaCard
                            key={video.id}
                            layout="row"
                            shape="wide"
                            title={video.title}
                            subtitle={video.channel}
                            cover={<Artwork cover={video.cover} wide />}
                            badge={formatTime(video.length)}
                            href="#"
                        />
                    ))}
                </Stack>
            }
        >
            <Stack gap="lg">
                <h1 className="text-page-title">First light over the northern coast</h1>
                <ChannelRow
                    name="Coastline Atlas"
                    href="#"
                    color="pink"
                    followers={21_400}
                    following={following}
                    onFollowingChange={setFollowing}
                />
                <ShowMore variant="well" head={<MetaLine size="sm" tone="strong" items={['52K views', '3 days ago']} />}>
                    Four mornings on one headland of the northern coast, cut into one: the first light on the water, the sun lifting off the
                    horizon and a single boat crossing the bay.
                </ShowMore>
            </Stack>
        </WatchLayout>
    )
}

/** The player with what is under it, and what plays next beside both; theater mode is a button among the player's controls. */
export const Beside: StoryObj = { render: () => <Watch startTheater={false} /> }

/** Theater mode: the player spans the page, and what plays next starts under it, beside the rest. */
export const Theater: StoryObj = { render: () => <Watch startTheater /> }
