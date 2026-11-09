import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Archive, Inbox as InboxIcon, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { EPISODES } from '../catalog'
import { EpisodeList, Nothing, useWide } from '../parts'
import { usePodcasts } from '../state'

/** New: the episodes of followed shows not yet heard or archived, newest first. */
export function Inbox() {
    const state = usePodcasts()
    const wide = useWide()
    const [checking, setChecking] = useState(false)
    const waiting = EPISODES.filter((episode) => state.episodes.get(episode.id)?.inbox === true).sort(
        (a, b) => (state.episodes.get(b.id)?.outAt ?? 0) - (state.episodes.get(a.id)?.outAt ?? 0),
    )
    const check = () => {
        setChecking(true)
        void state.checkForNew().then((count) => {
            setChecking(false)
            toast.add({
                title: count === 0 ? 'No new episodes' : `${String(count)} new ${count === 1 ? 'episode' : 'episodes'}`,
                description:
                    count === 0
                        ? 'Every show you follow is up to date.'
                        : state.prefs.autoDownload
                          ? 'They are downloading now.'
                          : undefined,
            })
        })
    }
    const checkButton = (
        <Button size="sm" variant="outline" onClick={check} disabled={checking}>
            <RefreshCw aria-hidden className={checking ? 'animate-spin' : undefined} />
            {checking ? 'Checking' : 'Check for new'}
        </Button>
    )
    return (
        <Stack gap="section">
            <PageHeader
                title="New"
                count={`${String(waiting.length)} ${waiting.length === 1 ? 'episode' : 'episodes'}`}
                actions={
                    <>
                        {checkButton}
                        <Button size="sm" variant="outline" onClick={state.archiveAll} disabled={waiting.length === 0}>
                            <Archive aria-hidden />
                            Archive all
                        </Button>
                    </>
                }
            />
            {waiting.length > 0 ? (
                <EpisodeList
                    episodes={waiting}
                    actions={(episode) =>
                        wide && (
                            <IconButton label={`Archive ${episode.title}`} onClick={() => state.archive(episode.id)}>
                                <Archive aria-hidden />
                            </IconButton>
                        )
                    }
                />
            ) : (
                <Nothing icon={<InboxIcon aria-hidden />} title="All caught up" action={checkButton}>
                    New episodes of the shows you follow land here until you play or archive them.
                </Nothing>
            )}
        </Stack>
    )
}
