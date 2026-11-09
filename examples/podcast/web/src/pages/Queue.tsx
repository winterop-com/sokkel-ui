import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { ListOrdered, ListX, SkipForward } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { episodeById } from '../catalog'
import { EpisodeList, Nothing, spoken, useWide } from '../parts'
import { lengthOf } from '../script'
import { usePodcasts } from '../state'

/** The queue: what plays now, and what plays after it, in an order the listener sets. */
export function Queue() {
    const state = usePodcasts()
    const wide = useWide()
    const [clearing, setClearing] = useState(false)
    const queue = state.player.queue.flatMap((id) => episodeById.get(id) ?? [])
    const now = state.current === null ? undefined : episodeById.get(state.current)
    const left = queue.reduce((sum, episode) => {
        const row = state.episodes.get(episode.id)
        return sum + lengthOf(episode.id) - (row?.played === true ? 0 : (row?.position ?? 0))
    }, 0)
    return (
        <Stack gap="section">
            <PageHeader
                title="Queue"
                count={queue.length === 0 ? 'Empty' : `${String(queue.length)} up next, ${spoken(left)}`}
                actions={
                    <>
                        <Button size="sm" variant="outline" onClick={state.playNext} disabled={queue.length === 0}>
                            <SkipForward aria-hidden />
                            Play next
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setClearing(true)} disabled={queue.length === 0}>
                            <ListX aria-hidden />
                            Clear
                        </Button>
                    </>
                }
            />
            {now !== undefined && (
                <Section flush title={state.playing ? 'Now playing' : 'Paused'}>
                    <EpisodeList variant="plain" episodes={[now]} />
                </Section>
            )}
            <Section flush title="Up next">
                {queue.length > 0 ? (
                    <EpisodeList
                        variant="plain"
                        episodes={queue}
                        onMove={state.queueMove}
                        actions={(episode) =>
                            wide && (
                                <IconButton label={`Remove ${episode.title} from the queue`} onClick={() => state.queueRemove(episode.id)}>
                                    <ListX aria-hidden />
                                </IconButton>
                            )
                        }
                    />
                ) : (
                    <Nothing
                        icon={<ListOrdered aria-hidden />}
                        title="Nothing up next"
                        action={
                            <Button size="sm" variant="outline" onClick={() => go('/inbox')}>
                                New episodes
                            </Button>
                        }
                    >
                        Add episodes from their menu, with Play next or Add to queue, and they play here in the order you drag them into.
                    </Nothing>
                )}
            </Section>
            <ConfirmDialog
                open={clearing}
                onOpenChange={setClearing}
                question="Clear the queue?"
                detail={`${String(queue.length)} episodes leave the queue. They stay in their shows, and nothing is marked played.`}
                confirm={{
                    label: 'Clear',
                    destructive: true,
                    onConfirm: () => {
                        state.queueClear()
                        setClearing(false)
                    },
                }}
            />
        </Stack>
    )
}
