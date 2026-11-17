import type { Meta, StoryObj } from '@storybook/react-vite'
import { Flag, Pencil } from 'lucide-react'
import { useState } from 'react'
import { toggleReaction } from '@winterop-com/sokkel-ui/ReactionBar'

import { CommentComposer, CommentThread, type ThreadComment } from '@winterop-com/sokkel-ui/CommentThread'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { pictureOf } from '../fixtures/portraits'
import { RECENT_EMOJI } from '../fixtures/reactions'

/**
 * The comments under a post or a video: who wrote each and when, likes, a menu, a pinned comment
 * and the owner's mark, replies folded under their comment, and the field to write a new one.
 */
const meta: Meta = { title: 'Patterns/Comment thread', parameters: { frame: 'column' } }
export default meta

const COMMENTS: ThreadComment[] = [
    {
        id: 'c1',
        author: 'grace',
        image: pictureOf('grace'),
        time: '3 weeks ago',
        body: 'The rebuild-index run now takes nine minutes instead of forty. The steps that changed are in the run graph.',
        likes: '1.2k',
        pinned: true,
        creator: true,
        reactions: [
            { id: '\u{1F525}', icon: '\u{1F525}', label: 'fire', count: 41 },
            { id: '\u{1F44F}', icon: '\u{1F44F}', label: 'clapping hands', count: 12, mine: true },
        ],
    },
    {
        id: 'c2',
        author: 'ada',
        image: pictureOf('ada'),
        time: '2 weeks ago',
        body: 'The validate step is where most of it went. Does it still check every row?',
        likes: 348,
        liked: true,
        reactions: [{ id: '\u{1F914}', icon: '\u{1F914}', label: 'thinking face', count: 3 }],
        replies: [
            {
                id: 'c2r1',
                author: 'grace',
                image: pictureOf('grace'),
                time: '2 weeks ago',
                body: 'Every row, but in batches of a thousand.',
                likes: 96,
                creator: true,
                replies: [{ id: 'c2r1r1', author: 'ada', image: pictureOf('ada'), time: '13 days ago', body: 'Makes sense.', likes: 4 }],
            },
            { id: 'c2r2', author: 'linus', time: '1 week ago', body: 'Went back to the run graph three times.', likes: 12, edited: true },
        ],
    },
    {
        id: 'c3',
        author: 'margaret',
        image: pictureOf('margaret'),
        time: '10 days ago',
        body: 'Which worker does it run on now? It looks like worker-2, but the logs still say worker-1.',
        likes: 57,
    },
]

const menu = (comment: ThreadComment) => (
    <>
        {comment.author === 'ada' && (
            <DropdownMenuItem>
                <Pencil aria-hidden />
                Edit
            </DropdownMenuItem>
        )}
        <DropdownMenuItem>
            <Flag aria-hidden />
            Report
        </DropdownMenuItem>
    </>
)

const ME = { name: 'ada', image: pictureOf('ada') }

/** A new comment's field: Cancel and Comment show once something is written. */
export const Composer: StoryObj = {
    render: () => <CommentComposer author={ME.name} image={ME.image} />,
}

/** Three comments, the first pinned by the owner, the second with its replies folded behind a count. */
export const Thread: StoryObj = {
    render: () => <CommentThread comments={COMMENTS} pinnedBy="grace" menu={menu} />,
}

/** A change to one comment, wherever it sits in the thread. */
const change = (list: readonly ThreadComment[], id: string, edit: (comment: ThreadComment) => ThreadComment): ThreadComment[] =>
    list.map((one) => (one.id === id ? edit(one) : { ...one, replies: one.replies && change(one.replies, id, edit) }))

/** Mark a comment's likes and reactions the app's way: a press flips it and the thread draws it back. */
function Live() {
    const [comments, setComments] = useState(COMMENTS)
    const flip = (list: readonly ThreadComment[], id: string) => change(list, id, (one) => ({ ...one, liked: one.liked !== true }))
    return (
        <Stack gap="lg">
            <CommentComposer author={ME.name} image={ME.image} />
            <CommentThread
                comments={comments}
                viewer={ME}
                pinnedBy="grace"
                openReplies={['c2', 'c2r1']}
                onLike={(comment) => setComments((list) => flip(list, comment.id))}
                onReply={() => undefined}
                onReaction={(comment, emoji, name) =>
                    setComments((list) =>
                        change(list, comment.id, (one) => ({ ...one, reactions: toggleReaction(one.reactions ?? [], emoji, name) })),
                    )
                }
                reactionBar={{ picker: { recent: RECENT_EMOJI } }}
                menu={menu}
            />
        </Stack>
    )
}

/**
 * The field over the thread, the replies open two deep, likes and reactions that turn on and off
 * with their counts, the react button opening the reaction bar, and Reply opening a field under
 * its comment.
 */
export const Replies: StoryObj = { render: () => <Live /> }
