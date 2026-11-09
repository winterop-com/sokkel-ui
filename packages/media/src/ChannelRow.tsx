import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import type { KindColor } from '@winterop-com/sokkel-ui/lib/kind'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { ProfileRow } from '@winterop-com/sokkel-ui/ProfileRow'

/** The words the row says, each with an English default. */
export interface ChannelRowWords {
    follow: string
    following: string
    /** The line under the name: `48.2K followers`. */
    followers: (count: number) => string
}

const short = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

export const CHANNEL_ROW_WORDS: ChannelRowWords = {
    follow: 'Follow',
    following: 'Following',
    followers: (count) => `${short.format(count)} ${count === 1 ? 'follower' : 'followers'}`,
}

export interface ChannelRowProps {
    /** The channel's name. */
    name: string
    /** The channel's page, opened from its picture and its name. */
    href?: string
    image?: string
    color?: KindColor
    /** How many follow it, written short under the name. */
    followers?: number
    /** The line under the name in the count's place, such as the count and how many videos. */
    detail?: ReactNode
    following?: boolean
    /** Follow or Following was pressed; the button shows only when this is given. */
    onFollowingChange?: (following: boolean) => void
    /** `lg` heads the channel's own page: a large picture and the name as the page's title. */
    size?: 'md' | 'lg'
    /**
     * What the viewer does with what plays, such as `MediaActions`: at the line's end beside the
     * channel where there is room, and on a line of its own under it where there is not.
     */
    actions?: ReactNode
    words?: Partial<ChannelRowWords>
    className?: string
}

/**
 * The channel a video comes from, under the video: its picture and name, which open its page, how
 * many follow it, and Follow, which turns to Following with a check once pressed and back on the
 * next press. The viewer's actions on the video (`MediaActions`) stand at the line's end while the
 * row is wide enough for both, and move under the channel on a narrow one, where they fold into
 * their More menu as the room runs out. `size="lg"` heads the channel's own page.
 */
export function ChannelRow({
    name,
    href,
    image,
    color,
    followers,
    detail,
    following = false,
    onFollowingChange,
    size = 'md',
    actions,
    words: given,
    className,
}: ChannelRowProps) {
    const words = { ...CHANNEL_ROW_WORDS, ...given }
    return (
        <div data-slot="channel-row" className={cn('@container/channel min-w-0', className)}>
            <div className="flex min-w-0 flex-col gap-3 @2xl/channel:flex-row @2xl/channel:items-center @2xl/channel:gap-6">
                <ProfileRow
                    name={name}
                    href={href}
                    image={image}
                    color={color}
                    size={size}
                    detail={detail ?? (followers === undefined ? undefined : words.followers(followers))}
                    action={
                        onFollowingChange === undefined ? undefined : (
                            <Button
                                size={size === 'lg' ? 'default' : 'sm'}
                                variant={following ? 'secondary' : 'default'}
                                aria-pressed={following}
                                onClick={() => onFollowingChange(!following)}
                            >
                                {following && <Check aria-hidden />}
                                {following ? words.following : words.follow}
                            </Button>
                        )
                    }
                />
                {actions !== undefined && <div className="flex min-w-0 @2xl/channel:flex-1">{actions}</div>}
            </div>
        </div>
    )
}
