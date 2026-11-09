import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { MediaCard, MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { Compass } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { EPISODES, episodeById, showById } from '../catalog'
import { EpisodeList, Nothing } from '../parts'
import { lengthOf } from '../script'
import { usePodcasts } from '../state'

/** Listen now: what was left halfway, what plays next, and the latest from the shows followed. */
export function Home() {
    const state = usePodcasts()
    const followed = new Set([...state.shows.values()].filter((show) => show.subscribed).map((show) => show.id))
    const started = [...state.episodes.values()]
        .filter((row) => row.position > 0 && !row.played)
        .sort((a, b) => (b.heard ?? 0) - (a.heard ?? 0))
        .slice(0, 6)
    const next = state.player.queue.flatMap((id) => episodeById.get(id) ?? []).slice(0, 4)
    const latest = EPISODES.filter((episode) => {
        const row = state.episodes.get(episode.id)
        return followed.has(episode.show) && row?.out === true && !row.played
    })
        .sort((a, b) => (state.episodes.get(b.id)?.outAt ?? 0) - (state.episodes.get(a.id)?.outAt ?? 0))
        .slice(0, 8)

    return (
        <Stack gap="section">
            <PageHeader title="Listen now" description="Pick up where you left off, or start something new." />
            {started.length > 0 && (
                <Section title="Continue listening">
                    <MediaGrid label="Continue listening">
                        {started.map((row) => {
                            const episode = episodeById.get(row.id)
                            const show = episode === undefined ? undefined : showById.get(episode.show)
                            if (episode === undefined || show === undefined) return null
                            const length = lengthOf(row.id)
                            return (
                                <MediaCard
                                    key={row.id}
                                    title={episode.title}
                                    subtitle={`${show.title} · ${formatTime(length - row.position)} left`}
                                    cover={<Artwork cover={show.cover} />}
                                    href={`#/episode/${row.id}`}
                                    onPlay={() => state.play(row.id)}
                                    playing={state.playing && state.current === row.id}
                                    progress={row.position / length}
                                />
                            )
                        })}
                    </MediaGrid>
                </Section>
            )}
            {next.length > 0 && (
                <Section
                    flush
                    title="Up next"
                    actions={
                        <Button size="sm" variant="outline" onClick={() => go('/queue')}>
                            Queue
                        </Button>
                    }
                >
                    <EpisodeList variant="plain" episodes={next} />
                </Section>
            )}
            <Section flush title="Latest from your shows">
                {latest.length > 0 ? (
                    <EpisodeList variant="plain" episodes={latest} />
                ) : (
                    <Nothing
                        icon={<Compass aria-hidden />}
                        title="Nothing new to play"
                        action={
                            <Button size="sm" variant="outline" onClick={() => go('/discover')}>
                                Discover
                            </Button>
                        }
                    >
                        Follow a few shows and their latest episodes are listed here.
                    </Nothing>
                )}
            </Section>
        </Stack>
    )
}
