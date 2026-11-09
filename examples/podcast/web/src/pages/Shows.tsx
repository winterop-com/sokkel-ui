import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Compass, Podcast } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { showById } from '../catalog'
import { Nothing, ShowGrid } from '../parts'
import { usePodcasts } from '../state'

/** The shows the listener follows, by title. */
export function Shows() {
    const state = usePodcasts()
    const followed = [...state.shows.values()]
        .filter((show) => show.subscribed)
        .map((show) => show.id)
        .sort((a, b) => (showById.get(a)?.title ?? a).localeCompare(showById.get(b)?.title ?? b))
    const discover = (
        <Button size="sm" variant="outline" onClick={() => go('/discover')}>
            <Compass aria-hidden />
            Discover
        </Button>
    )
    return (
        <Stack gap="section">
            <PageHeader title="Shows" count={`${String(followed.length)} followed`} actions={discover} />
            {followed.length > 0 ? (
                <ShowGrid shows={followed} label="Shows you follow" />
            ) : (
                <Nothing icon={<Podcast aria-hidden />} title="No shows yet" action={discover}>
                    Follow a show from Discover, and its new episodes come to New.
                </Nothing>
            )}
        </Stack>
    )
}
