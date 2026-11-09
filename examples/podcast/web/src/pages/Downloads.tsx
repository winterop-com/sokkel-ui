import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Download, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { sizeOf } from '../backend'
import { EPISODES } from '../catalog'
import { EpisodeList, megabytes, Nothing } from '../parts'
import { usePodcasts } from '../state'

/** Downloads: the episodes kept on this device and those on their way, with the room they take. */
export function Downloads() {
    const state = usePodcasts()
    const [clearing, setClearing] = useState(false)
    const byOut = (a: { id: string }, b: { id: string }) => (state.episodes.get(b.id)?.outAt ?? 0) - (state.episodes.get(a.id)?.outAt ?? 0)
    const running = EPISODES.filter((episode) => state.episodes.get(episode.id)?.download === 'running').sort(byOut)
    const kept = EPISODES.filter((episode) => state.episodes.get(episode.id)?.download === 'kept').sort(byOut)
    const size = kept.reduce((sum, episode) => sum + sizeOf(episode.id), 0)
    return (
        <Stack gap="section">
            <PageHeader
                title="Downloads"
                count={`${String(kept.length)} kept, ${megabytes(size)}`}
                actions={
                    <Button size="sm" variant="outline" onClick={() => setClearing(true)} disabled={kept.length + running.length === 0}>
                        <Trash2 aria-hidden />
                        Remove all
                    </Button>
                }
            />
            {running.length > 0 && (
                <Section flush title="Downloading" meta={String(running.length)}>
                    <EpisodeList variant="plain" episodes={running} />
                </Section>
            )}
            {kept.length > 0 && (
                <Section flush title="On this device" meta={megabytes(size)}>
                    <EpisodeList variant="plain" episodes={kept} />
                </Section>
            )}
            {kept.length + running.length === 0 && (
                <Nothing
                    icon={<Download aria-hidden />}
                    title="No downloads"
                    action={
                        <Button size="sm" variant="outline" onClick={() => go('/settings')}>
                            Settings
                        </Button>
                    }
                >
                    Download an episode from its row to keep it on this device, or turn on automatic downloads in Settings.
                </Nothing>
            )}
            <ConfirmDialog
                open={clearing}
                onOpenChange={setClearing}
                question="Remove every download?"
                detail={`${String(kept.length)} episodes, ${megabytes(size)}, leave this device, and downloads under way stop. The episodes stay in their shows.`}
                confirm={{
                    label: 'Remove all',
                    destructive: true,
                    onConfirm: () => {
                        state.removeAllDownloads()
                        setClearing(false)
                    },
                }}
            />
        </Stack>
    )
}
