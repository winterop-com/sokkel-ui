import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Star } from 'lucide-react'

import { EPISODES } from '../catalog'
import { EpisodeList, Nothing } from '../parts'
import { usePodcasts } from '../state'

/** The episodes the listener starred, newest first. */
export function Starred() {
    const state = usePodcasts()
    const starred = EPISODES.filter((episode) => state.episodes.get(episode.id)?.starred === true).sort(
        (a, b) => (state.episodes.get(b.id)?.outAt ?? 0) - (state.episodes.get(a.id)?.outAt ?? 0),
    )
    return (
        <Stack gap="section">
            <PageHeader title="Starred" count={`${String(starred.length)} ${starred.length === 1 ? 'episode' : 'episodes'}`} />
            {starred.length > 0 ? (
                <EpisodeList episodes={starred} />
            ) : (
                <Nothing icon={<Star aria-hidden />} title="Nothing starred">
                    Star an episode from its row or its page, and it is kept here.
                </Nothing>
            )}
        </Stack>
    )
}
