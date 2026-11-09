import { CommentComposer, CommentThread, type ThreadComment } from '@winterop-com/sokkel-ui/CommentThread'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { Toolbar, ToolbarTitle } from '@winterop-com/sokkel-ui/Toolbar'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Flag, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { PEOPLE_COLORS, VIEWER, type Channel, type Video } from '../../catalog'
import { comments, useRows, type Comment } from '../../data'
import { plural, short } from '../../format'

const ORDERS = [
    { value: 'top', label: 'Top comments' },
    { value: 'new', label: 'Newest first' },
]

type Order = 'top' | 'new'

const ME = { name: VIEWER, color: PEOPLE_COLORS[VIEWER] }

/** The comment as the thread draws it, with the replies to it under it, oldest first. */
function threadOf(comment: Comment, all: readonly Comment[], owner: string): ThreadComment {
    const replies = all.filter((one) => one.parent === comment.id).sort((left, right) => left.at - right.at)
    return {
        id: comment.id,
        author: comment.author,
        color: PEOPLE_COLORS[comment.author],
        time: <RelativeTime date={new Date(comment.at)} />,
        timeTitle: new Date(comment.at).toLocaleString('en-US'),
        body: comment.text,
        likes: comment.likes > 0 ? short(comment.likes) : undefined,
        liked: comment.liked,
        disliked: comment.disliked,
        pinned: comment.pinned,
        creator: comment.author === owner,
        replies: replies.map((reply) => threadOf(reply, all, owner)),
    }
}

/** Every comment under `id`, itself included, for taking a comment away with its replies. */
function branch(id: string, all: readonly Comment[]): string[] {
    return [id, ...all.filter((one) => one.parent === id).flatMap((one) => branch(one.id, all))]
}

/** What people say under the video: add, reply, like and dislike, sort, and delete one's own or report another's. */
export function Comments({ video, channel }: { video: Video; channel: Channel }) {
    const [order, setOrder] = useState<Order>('top')
    const { rows } = useRows(comments)
    const here = rows.filter((one) => one.video === video.id && !one.reported)
    const top = here
        .filter((one) => one.parent === null)
        .sort((left, right) =>
            order === 'top'
                ? Number(right.pinned) - Number(left.pinned) || right.likes - left.likes || right.at - left.at
                : right.at - left.at,
        )
    const byId = new Map(here.map((one) => [one.id, one]))

    const add = (text: string, parent: string | null) =>
        void comments.create({
            video: video.id,
            parent,
            author: VIEWER,
            text: text.trim(),
            at: Date.now(),
            likes: 0,
            liked: false,
            disliked: false,
            pinned: false,
            reported: false,
        })

    const rate = (thread: ThreadComment, field: 'liked' | 'disliked') => {
        const comment = byId.get(thread.id)
        if (comment === undefined) return
        const on = !comment[field]
        const liked = field === 'liked' ? on : on ? false : comment.liked
        const disliked = field === 'disliked' ? on : on ? false : comment.disliked
        const likes = Math.max(0, comment.likes + (liked ? 1 : 0) - (comment.liked ? 1 : 0))
        void comments.update(comment.id, { liked, disliked, likes })
    }

    const remove = (id: string) => {
        for (const one of branch(id, here)) void comments.remove(one)
        toast.add({ title: 'Comment deleted' })
    }

    const report = (id: string) => {
        void comments.update(id, { reported: true })
        toast.add({
            title: 'Reported, and hidden for you',
            actionProps: { children: 'Undo', onClick: () => void comments.update(id, { reported: false }) },
        })
    }

    return (
        <Stack as="section" gap="lg" aria-label="Comments">
            <Toolbar
                end={
                    <Select items={ORDERS} value={order} onValueChange={(value) => setOrder(value === 'new' ? 'new' : 'top')}>
                        <SelectTrigger variant="quiet" size="sm" aria-label="Sort by">
                            <SlidersHorizontal aria-hidden />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                            {ORDERS.map((entry) => (
                                <SelectItem key={entry.value} value={entry.value}>
                                    {entry.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                }
            >
                <ToolbarTitle>{plural(here.length, 'comment')}</ToolbarTitle>
            </Toolbar>
            <CommentComposer author={ME.name} color={ME.color} onSubmit={(text) => add(text, null)} />
            <CommentThread
                comments={top.map((one) => threadOf(one, here, channel.owner))}
                viewer={ME}
                pinnedBy={channel.owner}
                onLike={(comment) => rate(comment, 'liked')}
                onDislike={(comment) => rate(comment, 'disliked')}
                onReply={(comment, text) => add(text, comment.id)}
                menu={(comment) =>
                    comment.author === VIEWER ? (
                        <DropdownMenuItem variant="destructive" onClick={() => remove(comment.id)}>
                            <Trash2 aria-hidden />
                            Delete
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={() => report(comment.id)}>
                            <Flag aria-hidden />
                            Report
                        </DropdownMenuItem>
                    )
                }
            />
        </Stack>
    )
}
