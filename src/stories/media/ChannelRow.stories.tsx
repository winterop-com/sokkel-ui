import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bookmark, Download, Flag, Share2 } from 'lucide-react'
import { useState } from 'react'

import { ChannelRow } from '@winterop-com/sokkel-ui-media/ChannelRow'
import { MediaActions, type MediaRating } from '@winterop-com/sokkel-ui-media/MediaActions'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { pictureOf } from '../fixtures/portraits'

/**
 * The channel a video comes from, under the video: its picture and name, which open its page, how
 * many follow it, and Follow. The viewer's actions on the video stand at the line's end beside it,
 * and under it on a narrow page.
 */
const meta: Meta = { title: 'Media/Channel row', parameters: { frame: 'column' } }
export default meta

/** A channel the viewer does not follow yet; Follow turns to Following with a check, and back. */
export const Follow: StoryObj = {
    render: function Render() {
        const [following, setFollowing] = useState(false)
        return (
            <ChannelRow
                name="Harbor Workshop"
                href="#"
                color="teal"
                followers={following ? 48_201 : 48_200}
                following={following}
                onFollowingChange={setFollowing}
            />
        )
    },
}

/** A channel the viewer follows, with a picture. */
export const Following: StoryObj = {
    render: () => (
        <ChannelRow name="grace" href="#" image={pictureOf('grace')} followers={312_000} following onFollowingChange={() => undefined} />
    ),
}

/**
 * Under a video: the channel, and the viewer's actions on the video at the line's end. On a narrow
 * page the actions move under the channel and fold into More as the room runs out.
 */
export const WithActions: StoryObj = {
    name: 'With actions',
    render: function Render() {
        const [following, setFollowing] = useState(true)
        const [rating, setRating] = useState<MediaRating>('like')
        const [saved, setSaved] = useState(false)
        return (
            <ChannelRow
                name="Juniper Field Notes"
                href="#"
                color="green"
                followers={9_600}
                following={following}
                onFollowingChange={setFollowing}
                actions={
                    <MediaActions
                        rating={rating}
                        likes={rating === 'like' ? 4_102 : 4_101}
                        onRatingChange={setRating}
                        actions={[
                            { id: 'share', label: 'Share', icon: <Share2 aria-hidden />, onSelect: () => undefined },
                            {
                                id: 'save',
                                label: saved ? 'Saved' : 'Save',
                                icon: <Bookmark className={saved ? 'fill-current' : undefined} aria-hidden />,
                                pressed: saved,
                                onSelect: () => setSaved(!saved),
                            },
                            { id: 'download', label: 'Download', icon: <Download aria-hidden />, onSelect: () => undefined },
                        ]}
                        menu={
                            <DropdownMenuItem>
                                <Flag aria-hidden />
                                Report
                            </DropdownMenuItem>
                        }
                    />
                }
            />
        )
    },
}

/** At the head of the channel's own page: a large picture, the name as the page's title, and Follow. */
export const PageHead: StoryObj = {
    name: 'Page head',
    render: () => (
        <ChannelRow
            size="lg"
            name="Harbor Workshop"
            color="teal"
            detail="48.2K followers, 14 videos"
            following={false}
            onFollowingChange={() => undefined}
        />
    ),
}
