import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { QuickAdd } from '@winterop-com/sokkel-ui/QuickAdd'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { MediaCard, MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { Play, Trash2 } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { videoById } from '../catalog'
import { posterOf } from '../clips'
import { playlists, useRows, WATCH_LATER, type Playlist } from '../data'
import { newPlaylist } from '../dialogs'
import { daysAgo, plural } from '../format'
import { watchHref } from '../parts'

const DAY = 24 * 60 * 60 * 1000

/** A playlist as a card: its first video's still, its name, how many videos and when it last changed. */
export function PlaylistCard({ list }: { list: Playlist }) {
    const first = videoById(list.videos[0])
    return (
        <MediaCard
            shape="wide"
            title={list.name}
            subtitle={`${plural(list.videos.length, 'video')}, updated ${daysAgo((Date.now() - list.updated) / DAY)}`}
            cover={<Artwork src={first === undefined ? undefined : posterOf(first)} seed={list.id} wide />}
            badge={String(list.videos.length)}
            href={list.id === WATCH_LATER ? '#/later' : `#/playlist/${list.id}`}
            onPlay={first === undefined ? undefined : () => go(watchHref(first, list.id).slice(1))}
            menu={
                <>
                    <DropdownMenuItem
                        disabled={first === undefined}
                        onClick={() => first !== undefined && go(watchHref(first, list.id).slice(1))}
                    >
                        <Play aria-hidden />
                        Play all
                    </DropdownMenuItem>
                    {list.id !== WATCH_LATER && (
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => void playlists.remove(list.id).then(() => toast.add({ title: `${list.name} deleted` }))}
                        >
                            <Trash2 aria-hidden />
                            Delete
                        </DropdownMenuItem>
                    )}
                </>
            }
        />
    )
}

/** The viewer's playlists, Watch later first, and a field to make a new one. */
export function Playlists() {
    const { rows, ready } = useRows(playlists)
    const ordered = [...rows].sort(
        (left, right) => Number(right.id === WATCH_LATER) - Number(left.id === WATCH_LATER) || right.updated - left.updated,
    )
    return (
        <Stack gap="lg">
            <PageHeader title="Playlists" count={plural(rows.filter((one) => one.id !== WATCH_LATER).length, 'playlist')} />
            <Toolbar
                search={
                    <QuickAdd
                        placeholder="New playlist"
                        validate={(name) =>
                            name.trim() === ''
                                ? 'A playlist needs a name.'
                                : rows.some((one) => one.name === name.trim())
                                  ? 'There is a playlist with that name.'
                                  : null
                        }
                        onAdd={(name) =>
                            newPlaylist(name).then(
                                (list) =>
                                    void toast.add({
                                        title: `${list.name} made`,
                                        actionProps: { children: 'Open', onClick: () => go(`/playlist/${list.id}`) },
                                    }),
                            )
                        }
                    />
                }
            />
            <PageState loading={!ready}>
                <MediaGrid shape="wide" label="Playlists">
                    {ordered.map((list) => (
                        <PlaylistCard key={list.id} list={list} />
                    ))}
                </MediaGrid>
            </PageState>
        </Stack>
    )
}
