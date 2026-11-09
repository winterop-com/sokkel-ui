import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { videoById, type Video } from '../catalog'
import { setPrefs, usePrefs, useRows, watched, type Watched } from '../data'
import { plural } from '../format'
import { RemoveEntry, VideoCard } from '../parts'
import { videoText } from '../Site'

const DAY = 24 * 60 * 60 * 1000

/** Which day a watch falls in, said as a person says it. */
function dayOf(at: number, now: Date): string {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    if (at >= midnight) return 'Today'
    if (at >= midnight - DAY) return 'Yesterday'
    if (at >= midnight - 6 * DAY) return 'This week'
    return 'Earlier'
}

/** What the viewer watched, newest first by day, each where they stopped; searched, removed one by one, cleared, or paused. */
export function History({ clearing = false }: { clearing?: boolean }) {
    const prefs = usePrefs()
    const { rows, ready } = useRows(watched)
    const [search, setSearch] = useState('')
    const [confirming, setConfirming] = useState(clearing)
    const now = new Date()
    const entries = rows
        .map((row) => ({ row, video: videoById(row.id) }))
        .filter((one): one is { row: Watched; video: Video } => one.video !== undefined)
        .filter(({ video }) => search.trim() === '' || videoText(video).toLowerCase().includes(search.trim().toLowerCase()))
        .sort((left, right) => right.row.at - left.row.at)
    const days: { label: string; entries: typeof entries }[] = []
    for (const entry of entries) {
        const label = dayOf(entry.row.at, now)
        const day = days.find((one) => one.label === label)
        if (day === undefined) days.push({ label, entries: [entry] })
        else day.entries.push(entry)
    }
    const clear = () => {
        void Promise.all(rows.map((row) => watched.remove(row.id))).then(() => toast.add({ title: 'Watch history cleared' }))
        setConfirming(false)
        if (clearing) go('/history')
    }
    return (
        <Stack gap="lg">
            <PageHeader
                title="History"
                count={plural(rows.length, 'video')}
                actions={
                    <Button size="sm" variant="outline" disabled={rows.length === 0} onClick={() => setConfirming(true)}>
                        <Trash2 aria-hidden />
                        Clear all
                    </Button>
                }
            />
            <Toolbar
                search={<SearchField value={search} onChange={setSearch} placeholder="Search" />}
                end={
                    <SwitchField
                        id="keep-history"
                        label="Keep history"
                        explain="Remembers what you watch and where you stopped"
                        checked={prefs.history}
                        onCheckedChange={(history) => setPrefs({ history })}
                    />
                }
            />
            <PageState loading={!ready}>
                {entries.length === 0 ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>{search === '' ? 'Nothing watched yet' : 'Nothing found'}</EmptyTitle>
                            <EmptyDescription>
                                {search !== ''
                                    ? `Nothing in your history matches "${search}".`
                                    : prefs.history
                                      ? 'Videos you watch land here, with where you stopped.'
                                      : 'History is paused: turn Keep history on to remember what you watch.'}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <Stack gap="xl">
                        {days.map((day) => (
                            <Section key={day.label} title={day.label}>
                                <Stack gap="md">
                                    {day.entries.map(({ video }) => (
                                        <VideoCard
                                            key={video.id}
                                            video={video}
                                            layout="row"
                                            extra={
                                                <RemoveEntry
                                                    label="Remove from history"
                                                    onRemove={() =>
                                                        void watched
                                                            .remove(video.id)
                                                            .then(() => toast.add({ title: 'Removed from history' }))
                                                    }
                                                />
                                            }
                                        />
                                    ))}
                                </Stack>
                            </Section>
                        ))}
                    </Stack>
                )}
            </PageState>
            <ConfirmDialog
                open={confirming}
                onOpenChange={(open) => {
                    setConfirming(open)
                    if (!open && clearing) go('/history')
                }}
                question="Clear watch history?"
                detail="Every video you watched and where you stopped is forgotten. Your playlists and likes stay."
                confirm={{ label: 'Clear history', onConfirm: clear, destructive: true }}
            />
        </Stack>
    )
}
