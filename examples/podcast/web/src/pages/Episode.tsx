import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Markdown } from '@winterop-com/sokkel-ui/Markdown'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { SpeakButton } from '@winterop-com/sokkel-ui/media/SpeakButton'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StarButton } from '@winterop-com/sokkel-ui/StarButton'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { ChapterList } from '@winterop-com/sokkel-ui-media/ChapterList'
import { Transcript } from '@winterop-com/sokkel-ui-media/Transcript'
import { Pause, Play } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { episodeById, episodesOf, hostsOf, showById, type Episode, type Show } from '../catalog'
import { ago, EpisodeDownload, EpisodeMenu, spoken, STAR, standing } from '../parts'
import { scriptOf, spokenScript, type Script } from '../script'
import { usePodcasts } from '../state'
import { render, wavOf } from '../voice'

/** An episode's notes in markdown: what it is about, its chapters as times that seek, and where to go next. */
function notesOf(episode: Episode, show: Show, script: Script): string {
    const before = episodesOf(show.id).find((other) => other.number === episode.number - 1)
    return [
        '### Chapters',
        '',
        ...script.chapters.map((chapter) => `- [${formatTime(chapter.start)}](#t=${String(chapter.start)}) ${String(chapter.title)}`),
        '',
        '### In this episode',
        '',
        `With ${hostsOf(show)}, recorded at ${episode.place}. Each line of the transcript plays from where it is said.`,
        '',
        `More from [${show.title}](#/show/${show.id})${before === undefined ? '.' : `, or the episode before this one, [${before.title}](#/episode/${before.id}).`}`,
    ].join('\n')
}

/** An episode's page: what it is, its notes with times that seek, its chapters, and its transcript following the player. */
export function EpisodePage({ id }: { id: string }) {
    const state = usePodcasts()
    const episode = episodeById.get(id)
    const show = episode === undefined ? undefined : showById.get(episode.show)
    const row = state.episodes.get(id)
    if (episode === undefined || show === undefined || row === undefined) return null
    const script = scriptOf(id)
    const here = state.current === id
    const position = here ? state.position : row.played ? 0 : row.position
    const playingHere = here && state.playing
    const seek = (seconds: number) => (here ? state.seek(seconds) : state.play(id, seconds))
    const status = standing(id)(state)

    return (
        <Stack gap="section">
            <PageHeader
                title={episode.title}
                meta={<MetaLine size="sm" items={[`Episode ${String(episode.number)}`, ago(row.outAt), spoken(script.duration), status]} />}
                actions={
                    <>
                        <Button size="sm" onClick={() => state.play(id)}>
                            {playingHere ? <Pause aria-hidden className="fill-current" /> : <Play aria-hidden className="fill-current" />}
                            {playingHere ? 'Pause' : position > 0 ? `Resume at ${formatTime(position)}` : 'Play'}
                        </Button>
                        <StarButton variant="outline" starred={row.starred} onStarredChange={(on) => state.star(id, on)} words={STAR} />
                        <EpisodeDownload id={id} />
                        <EpisodeMenu id={id} />
                    </>
                }
            />
            <Row gap="2xl" align="start" stackBelow="lg">
                <Stack gap="section" className="min-w-0 flex-1">
                    <Row gap="lg" align="start">
                        <span className="block size-20 shrink-0 overflow-hidden rounded-surface ring-1 ring-border">
                            <Artwork cover={show.cover} />
                        </span>
                        <Stack gap="sm" className="min-w-0">
                            <p className="max-w-prose text-sm leading-relaxed">{episode.summary}</p>
                            <span>
                                <SpeakButton
                                    variant="labeled"
                                    load={() => Promise.resolve(wavOf(render(spokenScript(episode.summary, show.hosts[0] ?? 'ada', id))))}
                                    words={{ speak: 'Hear the summary' }}
                                />
                            </span>
                        </Stack>
                    </Row>
                    <Section title="Show notes">
                        <Markdown
                            content={notesOf(episode, show, script)}
                            onLink={(href) => {
                                const time = /^#t=([\d.]+)$/.exec(href)
                                if (time !== null) seek(Number(time[1]))
                                else if (href.startsWith('#/')) go(href.slice(1))
                                else return false
                                return true
                            }}
                        />
                    </Section>
                    <Section title="Chapters" meta={String(script.chapters.length)} flush>
                        <ChapterList
                            chapters={script.chapters}
                            duration={script.duration}
                            position={position}
                            playing={playingHere}
                            progress="left"
                            onSeek={seek}
                            follow={false}
                            variant="plain"
                        />
                    </Section>
                </Stack>
                <Section title="Transcript" flush className="w-full min-w-0 lg:w-md xl:w-lg">
                    <div className="h-112 max-h-[70svh]">
                        <Transcript lines={script.lines} position={position} onSeek={seek} />
                    </div>
                </Section>
            </Row>
        </Stack>
    )
}
