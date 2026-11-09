import { CheckboxField } from '@winterop-com/sokkel-ui/CheckboxField'
import { CopyButton } from '@winterop-com/sokkel-ui/CopyButton'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { QuickAdd } from '@winterop-com/sokkel-ui/QuickAdd'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import type { Video } from './catalog'
import { playlists, useRows, WATCH_LATER, type Playlist } from './data'
import { clockOf } from './format'

interface Dialogs {
    /** Opens Save to, for adding a video to Watch later and the viewer's playlists. */
    save: (video: Video) => void
    /** Opens Share with the video's link, starting at `at` seconds when given. */
    share: (video: Video, at?: number) => void
}

const DialogsContext = createContext<Dialogs>({ save: () => undefined, share: () => undefined })

export const useDialogs = () => useContext(DialogsContext)

/** The video's own address on the site, starting at a second when given. */
export function linkOf(video: Video, at?: number): string {
    const base = `${window.location.href.split('#')[0] ?? ''}#/watch/${video.id}`
    return at === undefined || at < 1 ? base : `${base}/at/${String(Math.floor(at))}`
}

/** Adds a video to a playlist, or takes it out, kept by the backend. */
export function toggleIn(list: Playlist, video: Video, on: boolean): Promise<unknown> {
    const videos = on ? [...list.videos.filter((id) => id !== video.id), video.id] : list.videos.filter((id) => id !== video.id)
    return playlists.update(list.id, { videos, updated: Date.now() })
}

/** Makes a playlist, with a video in it when given. */
export function newPlaylist(name: string, video?: Video): Promise<Playlist> {
    const now = Date.now()
    return playlists.create({
        name: name.trim(),
        description: '',
        videos: video === undefined ? [] : [video.id],
        created: now,
        updated: now,
    })
}

function SaveDialog({ video, onClose }: { video: Video | undefined; onClose: () => void }) {
    const { rows } = useRows(playlists)
    const ordered = [...rows].sort(
        (left, right) => Number(right.id === WATCH_LATER) - Number(left.id === WATCH_LATER) || left.created - right.created,
    )
    return (
        <DialogShell
            open={video !== undefined}
            onOpenChange={(open) => {
                if (!open) onClose()
            }}
            title="Save to"
            description={video?.title}
            width="sm"
            confirm={{ label: 'Done', onConfirm: onClose }}
        >
            {video !== undefined && (
                <Stack gap="sm">
                    <Stack gap="2xs">
                        {ordered.map((list) => (
                            <CheckboxField
                                key={list.id}
                                label={list.name}
                                description={`${String(list.videos.length)} ${list.videos.length === 1 ? 'video' : 'videos'}`}
                                checked={list.videos.includes(video.id)}
                                onCheckedChange={(on) => {
                                    void toggleIn(list, video, on).then(() =>
                                        toast.add({ title: on ? `Saved to ${list.name}` : `Removed from ${list.name}` }),
                                    )
                                }}
                            />
                        ))}
                    </Stack>
                    <QuickAdd
                        placeholder="New playlist"
                        validate={(name) =>
                            name.trim() === ''
                                ? 'A playlist needs a name.'
                                : rows.some((list) => list.name === name.trim())
                                  ? 'There is a playlist with that name.'
                                  : null
                        }
                        onAdd={(name) => newPlaylist(name, video).then((list) => void toast.add({ title: `Saved to ${list.name}` }))}
                    />
                </Stack>
            )}
        </DialogShell>
    )
}

function ShareDialog({ shared, onClose }: { shared: { video: Video; at?: number } | undefined; onClose: () => void }) {
    const [fromHere, setFromHere] = useState(false)
    const at = shared?.at
    const link = shared === undefined ? '' : linkOf(shared.video, fromHere ? at : undefined)
    const copy = () => {
        void navigator.clipboard.writeText(link).then(
            () => toast.add({ title: 'Link copied' }),
            () => toast.add({ title: 'The link could not be copied', description: link }),
        )
        onClose()
    }
    return (
        <DialogShell
            open={shared !== undefined}
            onOpenChange={(open) => {
                if (!open) onClose()
            }}
            title="Share"
            description={shared?.video.title}
            width="sm"
            confirm={{ label: 'Copy link', onConfirm: copy }}
        >
            <Stack gap="sm">
                <Row gap="xs">
                    <Input readOnly value={link} aria-label="Link" onFocus={(event) => event.currentTarget.select()} />
                    <CopyButton value={link} size="icon" />
                </Row>
                {at !== undefined && at >= 1 && (
                    <CheckboxField label={`Start at ${clockOf(at)}`} checked={fromHere} onCheckedChange={setFromHere} />
                )}
            </Stack>
        </DialogShell>
    )
}

/** Holds the dialogs any page opens for a video: Save to and Share. */
export function DialogsProvider({ children }: { children: ReactNode }) {
    const [saving, setSaving] = useState<Video | undefined>(undefined)
    const [sharing, setSharing] = useState<{ video: Video; at?: number } | undefined>(undefined)
    const value = useMemo<Dialogs>(() => ({ save: setSaving, share: (video, at) => setSharing({ video, at }) }), [])
    return (
        <DialogsContext.Provider value={value}>
            {children}
            <SaveDialog video={saving} onClose={() => setSaving(undefined)} />
            <ShareDialog
                key={sharing === undefined ? 'none' : `${sharing.video.id}-${String(sharing.at ?? 0)}`}
                shared={sharing}
                onClose={() => setSharing(undefined)}
            />
        </DialogsContext.Provider>
    )
}
