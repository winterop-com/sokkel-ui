import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { DropdownMenuItem, DropdownMenuSeparator } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { MediaCard } from '@winterop-com/sokkel-ui-media/MediaCard'
import { Clock, ListPlus, Share2, Trash2, User } from 'lucide-react'
import type { ReactNode } from 'react'

import { go } from 'tidevann-shared/router'
import { channelOf, type Video } from './catalog'
import { posterOf } from './clips'
import { playlists, useById, watched, WATCH_LATER, type Watched } from './data'
import { toggleIn, useDialogs } from './dialogs'
import { daysAgo, viewsOf } from './format'

/** Where a video is watched, inside a playlist when given. */
export const watchHref = (video: Video, list?: string) => `#/watch/${video.id}${list === undefined ? '' : `/list/${list}`}`

/** How many have watched a video: the count it had, and the viewer's own views. */
export const viewCount = (video: Video, seen: Watched | undefined) => video.views + (seen?.times ?? 0)

/** How far the viewer got: the share of a video they watched, all of it once finished. */
export function progressOf(video: Video, seen: Watched | undefined): number | undefined {
    if (seen === undefined) return undefined
    if (seen.finished) return 1
    return seen.position / video.duration
}

/** The video's picture: a still from its own clip, drawn in the browser. */
export const Poster = ({ video }: { video: Video }) => <Artwork src={posterOf(video)} seed={video.id} wide />

/** The entries of a video's menu: Watch later, Save to, Share and its channel, then the page's own. */
export function VideoMenu({ video, extra }: { video: Video; extra?: ReactNode }) {
    const dialogs = useDialogs()
    const lists = useById(playlists)
    const later = lists.get(WATCH_LATER)
    const saved = later?.videos.includes(video.id) === true
    return (
        <>
            <DropdownMenuItem
                onClick={() => {
                    if (later === undefined) return
                    void toggleIn(later, video, !saved).then(() =>
                        toast.add({ title: saved ? 'Removed from Watch later' : 'Saved to Watch later' }),
                    )
                }}
            >
                <Clock aria-hidden />
                {saved ? 'Remove from Watch later' : 'Save to Watch later'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => dialogs.save(video)}>
                <ListPlus aria-hidden />
                Save to playlist
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => dialogs.share(video)}>
                <Share2 aria-hidden />
                Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => go(`/channel/${video.channel}`)}>
                <User aria-hidden />
                Go to {channelOf(video).name}
            </DropdownMenuItem>
            {extra !== undefined && (
                <>
                    <DropdownMenuSeparator />
                    {extra}
                </>
            )}
        </>
    )
}

/** A menu entry that takes a video out of a list. */
export function RemoveEntry({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <DropdownMenuItem variant="destructive" onClick={onRemove}>
            <Trash2 aria-hidden />
            {label}
        </DropdownMenuItem>
    )
}

export interface VideoCardProps {
    video: Video
    /** Beside its picture, as in a list of what plays next, or under it, as in a grid. */
    layout?: 'stack' | 'row'
    /** Leaves out the channel's name, on the channel's own page. */
    bare?: boolean
    /** Inside a playlist, which the watch page then plays in order. */
    list?: string
    /** Marks the one playing now. */
    playing?: boolean
    /** More entries for its menu. */
    extra?: ReactNode
}

/** One video as a card: its still, its length and how far the viewer got, its title, channel, views and age, and its menu. */
export function VideoCard({ video, layout = 'stack', bare = false, list, playing = false, extra }: VideoCardProps) {
    const history = useById(watched)
    const seen = history.get(video.id)
    const channel = channelOf(video)
    const facts = [viewsOf(viewCount(video, seen)), daysAgo(video.days)]
    return (
        <MediaCard
            shape="wide"
            layout={layout}
            title={video.title}
            subtitle={
                layout === 'row' && !bare ? (
                    <>
                        {channel.name}
                        <br />
                        <MetaLine inline items={facts} />
                    </>
                ) : (
                    <MetaLine inline items={bare ? facts : [channel.name, ...facts]} />
                )
            }
            cover={<Poster video={video} />}
            badge={formatTime(video.duration)}
            progress={progressOf(video, seen)}
            playing={playing}
            href={watchHref(video, list)}
            menu={<VideoMenu video={video} extra={extra} />}
        />
    )
}
