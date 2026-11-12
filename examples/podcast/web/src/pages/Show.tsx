import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { Check, Filter, Pause, Play, Plus } from 'lucide-react'
import { useState } from 'react'

import { categoryLabel, episodesOf, hostsOf, showById } from '../catalog'
import { EpisodeList, Nothing } from '../parts'
import { usePodcasts } from '../state'

type Shown = 'all' | 'unplayed' | 'downloaded' | 'starred'

/** A show's page: what it is, following it, and its episodes, filtered. */
export function ShowPage({ id }: { id: string }) {
    const state = usePodcasts()
    const [shown, setShown] = useState<Shown>('all')
    const [leaving, setLeaving] = useState(false)
    const show = showById.get(id)
    if (show === undefined) return null
    const followed = state.shows.get(id)?.subscribed === true
    const out = episodesOf(id).filter((episode) => state.episodes.get(episode.id)?.out === true)
    const listed = out.filter((episode) => {
        const row = state.episodes.get(episode.id)
        if (row === undefined) return false
        if (shown === 'unplayed') return !row.played
        if (shown === 'downloaded') return row.download === 'kept'
        if (shown === 'starred') return row.starred
        return true
    })
    const unplayed = out.filter((episode) => state.episodes.get(episode.id)?.played === false)
    // An episode started and not finished, else the newest not played.
    const next =
        out.find((episode) => {
            const row = state.episodes.get(episode.id)
            return row !== undefined && row.position > 0 && !row.played
        }) ?? unplayed[0]
    const playingHere = state.playing && next !== undefined && state.current === next.id
    return (
        <Stack gap="section">
            <PageHeader
                title={show.title}
                meta={<MetaLine size="sm" items={[hostsOf(show), categoryLabel(show.category), `${String(out.length)} episodes`]} />}
                actions={
                    <>
                        {next !== undefined && (
                            <Button size="sm" onClick={() => state.play(next.id)}>
                                {playingHere ? (
                                    <Pause aria-hidden className="fill-current" />
                                ) : (
                                    <Play aria-hidden className="fill-current" />
                                )}
                                {playingHere ? 'Pause' : (state.episodes.get(next.id)?.position ?? 0) > 0 ? 'Resume' : 'Play latest'}
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => (followed ? setLeaving(true) : state.subscribe(id))}>
                            {followed ? <Check aria-hidden /> : <Plus aria-hidden />}
                            {followed ? 'Following' : 'Follow'}
                        </Button>
                    </>
                }
            />
            <Row gap="xl" align="start" stackBelow="sm">
                <span className="block size-32 shrink-0 overflow-hidden rounded-surface ring-1 ring-border">
                    <Artwork cover={show.cover} />
                </span>
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{show.about}</p>
            </Row>
            <Stack gap="md">
                <Toolbar
                    search={
                        <Segmented<Shown>
                            size="sm"
                            label="Show"
                            value={shown}
                            onValueChange={setShown}
                            options={[
                                { value: 'all', label: 'All' },
                                { value: 'unplayed', label: 'Unplayed' },
                                { value: 'downloaded', label: 'Downloaded' },
                                { value: 'starred', label: 'Starred' },
                            ]}
                        />
                    }
                    end={
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={unplayed.length === 0}
                            onClick={() => {
                                for (const episode of unplayed) state.markPlayed(episode.id, true)
                            }}
                        >
                            <Check aria-hidden />
                            Mark all played
                        </Button>
                    }
                />
                {listed.length > 0 ? (
                    <EpisodeList episodes={listed} withShow={false} />
                ) : (
                    <Nothing
                        icon={<Filter aria-hidden />}
                        title="No episodes here"
                        action={
                            <Button size="sm" variant="outline" onClick={() => setShown('all')}>
                                Show all
                            </Button>
                        }
                    >
                        None of the episodes of {show.title} is {shown === 'unplayed' ? 'unplayed' : shown}.
                    </Nothing>
                )}
            </Stack>
            <ConfirmDialog
                open={leaving}
                onOpenChange={setLeaving}
                question={`Unfollow ${show.title}?`}
                detail="Its episodes leave New and new ones stop coming. What is downloaded, starred or queued stays."
                confirm={{
                    label: 'Unfollow',
                    destructive: true,
                    onConfirm: () => {
                        state.unsubscribe(id)
                        setLeaving(false)
                    },
                }}
            />
        </Stack>
    )
}
