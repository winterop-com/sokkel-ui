import { ChipBar } from '@winterop-com/sokkel-ui/ChipBar'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { useState } from 'react'

import { TOPICS, VIDEOS, seedOf, type Topic, type Video } from '../catalog'
import { follows, useById, useRows, watched } from '../data'
import { VideoCard } from '../parts'

type Chip = 'all' | 'following' | 'continue' | 'recent' | Topic

const CHIPS: { value: Chip; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'following', label: 'Following' },
    { value: 'continue', label: 'Continue watching' },
    { value: 'recent', label: 'Recently uploaded' },
    ...(Object.keys(TOPICS) as Topic[]).map((topic) => ({ value: topic, label: TOPICS[topic] })),
]

/** The home grid's order: newer first, stirred by a fixed seed so channels mix. */
const ORDER = [...VIDEOS].sort((left, right) => left.days - right.days + ((seedOf(left.id) % 9) - (seedOf(right.id) % 9)) * 4)

const SAYS: Record<Chip, string> = {
    all: 'Nothing here yet.',
    following: 'Follow a channel and its videos land here.',
    continue: 'Videos you started and did not finish land here, ready to pick up where you stopped.',
    recent: 'Nothing was put up in the last two weeks.',
    coasts: '',
    harbors: '',
    rail: '',
    mountains: '',
    night: '',
    tides: '',
    islands: '',
    weather: '',
    countryside: '',
}

/** Videos picked for the viewer, under chips that narrow them to a topic, the channels they follow, or what they left halfway. */
export function Home() {
    const [chip, setChip] = useState<Chip>('all')
    const followed = useById(follows)
    const history = useById(watched)
    const { ready } = useRows(watched)
    const holds = (video: Video) => {
        if (chip === 'all') return true
        if (chip === 'following') return followed.has(video.channel)
        if (chip === 'continue') {
            const seen = history.get(video.id)
            return seen !== undefined && !seen.finished && seen.position > 0
        }
        if (chip === 'recent') return video.days <= 14
        return video.topic === chip
    }
    const shown = ORDER.filter(holds)
    return (
        <Stack gap="lg">
            <ChipBar label="Topics" chips={CHIPS} value={chip} onValueChange={setChip} />
            <PageState loading={!ready}>
                {shown.length === 0 ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>Nothing to show</EmptyTitle>
                            <EmptyDescription>{SAYS[chip] === '' ? 'No videos on this topic yet.' : SAYS[chip]}</EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button variant="outline" size="sm" onClick={() => setChip('all')}>
                                Show all
                            </Button>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <MediaGrid shape="wide" label="Videos">
                        {shown.map((video) => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </MediaGrid>
                )}
            </PageState>
        </Stack>
    )
}
