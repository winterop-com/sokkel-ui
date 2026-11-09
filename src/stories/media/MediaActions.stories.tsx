import type { Meta, StoryObj } from '@storybook/react-vite'
import { Activity, Bookmark, Flag, ListPlus, Share2 } from 'lucide-react'
import { useState } from 'react'

import { DownloadButton } from '@winterop-com/sokkel-ui/DownloadButton'
import { MediaActions, type MediaAction, type MediaRating } from '@winterop-com/sokkel-ui-media/MediaActions'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'

/**
 * What the viewer does with a video or an episode, in one row under it: like and dislike, then the
 * app's actions, which move into More when the row has no room for them.
 */
const meta: Meta = { title: 'Media/Media actions', parameters: { frame: 'column' } }
export default meta

/** Like and dislike alone, joined, the like count on the first; pressing the one held takes it back. */
export const Rating: StoryObj = {
    render: function Render() {
        const [rating, setRating] = useState<MediaRating>(null)
        return <MediaActions rating={rating} likes={rating === 'like' ? 1_205 : 1_204} onRatingChange={setRating} />
    },
}

const SHARE: MediaAction = { id: 'share', label: 'Share', icon: <Share2 aria-hidden />, onSelect: () => undefined }
const PLAYLIST: MediaAction = { id: 'playlist', label: 'Add to playlist', icon: <ListPlus aria-hidden />, onSelect: () => undefined }

/**
 * The like pair, then Share, Save and Download, Save a toggle that is pressed while saved and
 * Download drawn by `DownloadButton` as the action's `render`. On a narrow page the last move into
 * More, Save as a checked entry.
 */
export const Actions: StoryObj = {
    render: function Render() {
        const [rating, setRating] = useState<MediaRating>('like')
        const [saved, setSaved] = useState(true)
        const save: MediaAction = {
            id: 'save',
            label: saved ? 'Saved' : 'Save',
            icon: <Bookmark className={saved ? 'fill-current' : undefined} aria-hidden />,
            pressed: saved,
            onSelect: () => setSaved(!saved),
        }
        const download: MediaAction = {
            id: 'download',
            label: 'Download',
            render: <DownloadButton state="running" value={0.42} size="sm" variant="outline" onCancel={() => undefined} />,
            onSelect: () => undefined,
        }
        return (
            <MediaActions
                rating={rating}
                likes={rating === 'like' ? 4_102 : 4_101}
                onRatingChange={setRating}
                actions={[SHARE, save, download, PLAYLIST]}
            />
        )
    },
}

/** More holding entries of its own, always there after the actions moved into it, opened. */
export const More: StoryObj = {
    render: () => (
        <MediaActions
            rating={null}
            likes={318}
            onRatingChange={() => undefined}
            actions={[SHARE, PLAYLIST]}
            defaultMoreOpen
            menu={
                <>
                    <DropdownMenuItem>
                        <Activity aria-hidden />
                        Stats
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Flag aria-hidden />
                        Report
                    </DropdownMenuItem>
                </>
            }
        />
    ),
}
